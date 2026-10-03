const express = require('express');
const auth = require('../controllers/authController');
const register = require('../controllers/registerController');
const profiles = require('../controllers/profileController');
const reviews = require('../controllers/reviewController');
const establishments = require('../controllers/establishmentController');
const { requireAuth, requireSelf, requireReviewAuthor } = require('../middleware/security');
const { upload } = require('../middleware/upload');
const { limiter } = require('../middleware/rateLimit');

module.exports = function routes({ persistentRateLimits = true } = {}) {
  const router = express.Router();
  const authLimit = limiter('auth', 20, { persistent: persistentRateLimits });
  const uploadLimit = limiter('upload', 20, { persistent: persistentRateLimits });
  router.get('/', (_req, res) => res.redirect('/establishments'));
  router.get('/about', require('../controllers/aboutController').getAboutPage);
  router.get('/login', auth.getLoginPage);
  router.post('/login', authLimit, auth.postLogin);
  router.post('/logout', auth.postLogout);
  router.get('/register', register.getRegisterPage);
  router.post(
    '/register',
    authLimit,
    uploadLimit,
    ...upload({ avatar: true }),
    register.registerAccount,
  );
  router.get('/establishments', establishments.getAllEstablishments);
  router.get('/establishments/:id', establishments.getEstablishmentById);
  router.get('/establishments/:id/reviews', reviews.getReviewsPage);
  router.get('/reviews', reviews.getAllReviewsPage);
  router.get('/reviews/:reviewId', reviews.getReviewDetail);
  router.post('/reviews', requireAuth, uploadLimit, ...upload(), reviews.createReview);
  router.put(
    '/reviews/:reviewId',
    requireAuth,
    requireReviewAuthor,
    uploadLimit,
    ...upload(),
    reviews.editReview,
  );
  router.delete('/reviews/:reviewId', requireAuth, reviews.deleteReview);
  router.post('/reviews/:reviewId/vote', requireAuth, reviews.voteReview);
  router.post('/reviews/:reviewId/owner-response', requireAuth, reviews.ownerRespond);
  router.post('/reviews/:reviewId/reviewer-reply', requireAuth, reviews.reviewerReply);
  router.delete(
    '/reviews/:reviewId/thread-last-message',
    requireAuth,
    reviews.deleteLastThreadMessage,
  );
  router.put(
    '/reviews/:reviewId/thread-message/:messageIndex',
    requireAuth,
    reviews.editThreadMessage,
  );
  router.get('/api/user/profile-activity', reviews.getUserProfileActivity);
  router.get('/profile/:userId', profiles.getProfilePage);
  router.get('/profile/:userId/edit', requireAuth, requireSelf, profiles.getEditPage);
  router.post(
    '/profile/:userId/edit',
    requireAuth,
    requireSelf,
    uploadLimit,
    ...upload({ avatar: true }),
    profiles.updateProfile,
  );
  router.delete(
    '/profile/:userId/delete',
    requireAuth,
    requireSelf,
    authLimit,
    profiles.deleteAccount,
  );
  return router;
};
