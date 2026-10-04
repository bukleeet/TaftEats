const { randomBytes } = require('node:crypto');
const { promisify } = require('node:util');
const User = require('../models/users');
const v = require('../lib/validation');
const { verifyPassword } = require('../lib/passwords');

// A syntactically valid random hash makes unknown users pay one verification cost.
const dummyHash = `scrypt$${randomBytes(16).toString('hex')}$${randomBytes(64).toString('hex')}`;
exports.getLoginPage = (req, res) =>
  req.user ? res.redirect('/establishments') : res.render('login', { error: null });
exports.postLogin = async (req, res) => {
  const username = v.username(req.body.username);
  const password = v.password(req.body.password, { login: true });
  const user = await User.findOne({ username }).select('+password');
  // Unknown usernames still pay the scrypt cost, reducing account enumeration by timing.
  const valid = await verifyPassword(password, user?.password || dummyHash);
  if (!user || !valid)
    return res.status(401).render('login', { error: 'Invalid username or password.' });
  if (!user.password.startsWith('scrypt$')) {
    user.password = password;
    await user.save();
  }
  await promisify(req.session.regenerate).call(req.session);
  req.session.userId = String(user._id);
  req.session.csrfToken = randomBytes(32).toString('hex');
  req.session.cookie.maxAge =
    req.body.rememberMe === '1' ? 21 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  await promisify(req.session.save).call(req.session);
  res.redirect('/establishments');
};
exports.postLogout = async (req, res) => {
  await promisify(req.session.destroy).call(req.session);
  res.clearCookie('tafteats.sid', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.locals.production,
  });
  res.redirect('/establishments');
};
