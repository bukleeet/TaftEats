const express = require('express');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const session = require('express-session');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { csrf, currentUser } = require('./middleware/security');
const { limiter } = require('./middleware/rateLimit');
const { HttpError, errorHandler } = require('./lib/errors');
const { safeJson, mediaUrl } = require('./lib/validation');
const assetUrls = require('./lib/assets');

function createApp({
  sessionSecret,
  sessionStore,
  production = false,
  trustProxy = false,
  persistentRateLimits = true,
} = {}) {
  if (!sessionSecret || sessionSecret.length < 32)
    throw new Error('A session secret of at least 32 characters is required.');
  if (production && !sessionStore)
    throw new Error('Production requires a persistent session store.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.locals.production = production;
  app.locals.safeJson = safeJson;
  app.locals.mediaUrl = mediaUrl;
  app.locals.assetUrls = assetUrls;
  app.locals.formatDate = (value) =>
    new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(
      new Date(value),
    );
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.set('X-Request-ID', req.id);
    res.locals.nonce = randomBytes(16).toString('base64');
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", (_req, res) => `'nonce-${res.locals.nonce}'`],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'https://res.cloudinary.com', 'blob:'],
          mediaSrc: ["'self'", 'https://res.cloudinary.com', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
      strictTransportSecurity: production ? undefined : false,
    }),
  );
  app.use(
    express.static(path.join(__dirname, 'public'), {
      maxAge: production ? '1h' : 0,
      dotfiles: 'deny',
    }),
  );
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'unavailable' }),
  );
  app.use(limiter('requests', 300, { persistent: persistentRateLimits }));
  app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 30 }));
  app.use(express.json({ limit: '32kb', strict: true }));
  app.use((req, _res, next) => {
    if (Object.keys(req.query).some((key) => /[[\]$.]/.test(key)))
      throw new HttpError(400, 'Invalid query parameter.');
    req.body ||= {};
    if (Array.isArray(req.body)) throw new HttpError(400, 'Request body must be an object.');
    next();
  });
  app.use(
    session({
      name: 'tafteats.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 },
    }),
  );
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(csrf);
  app.use(currentUser);
  app.use(require('./routes')({ persistentRateLimits }));
  app.use((_req, _res, next) => next(new HttpError(404, 'That page could not be found.')));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
