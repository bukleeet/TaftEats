const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// Show all reviews (no establishment filter)
router.get('/reviews', reviewController.getAllReviewsPage);

// Show reviews for a specific establishment
router.get('/reviews/:id', reviewController.getReviewsPage);

// Create a new review
router.post('/reviews', reviewController.createReview);

module.exports = router;