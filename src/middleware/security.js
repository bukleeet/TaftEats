const { randomBytes, timingSafeEqual } = require('node:crypto');
const User = require('../models/users');
const Review = require('../models/reviews');
const { HttpError } = require('../lib/errors');
const { objectId } = require('../lib/validation');

function csrf(req, res, next) {
  req.session.csrfToken ||= randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const token = req.get('x-csrf-token') || req.body?._csrf;
    const expected = req.session.csrfToken;
    if (
      req.get('sec-fetch-site') === 'cross-site' ||
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token) ||
      token.length !== expected.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      return next(new HttpError(403, 'Your form has expired. Refresh the page and try again.'));
    }
  }
  next();
}

async function currentUser(req, res, next) {
  req.user = null;
  if (req.session.userId) {
    req.user = await User.findById(req.session.userId);
    if (!req.user) delete req.session.userId;
  }
  res.locals.sessionUser = req.user;
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user) throw new HttpError(401, 'Sign in to continue.');
  next();
}

function requireSelf(req, _res, next) {
  if (objectId(req.params.userId) !== String(req.user._id))
    throw new HttpError(403, 'You can only edit your own account.');
  next();
}

async function requireReviewAuthor(req, _res, next) {
  const review = await Review.findById(objectId(req.params.reviewId));
  if (!review) throw new HttpError(404, 'Review not found.');
  if (String(review.user) !== String(req.user._id))
    throw new HttpError(403, 'Only the original reviewer can change this review.');
  req.review = review;
  next();
}
module.exports = { csrf, currentUser, requireAuth, requireSelf, requireReviewAuthor };
