const Review = require('../models/reviews');
const Establishment = require('../models/establishments');

// Show reviews for a specific establishment
exports.getReviewsPage = async (req, res) => {
  try {
    const estId = req.params.id;

    // Find the establishment
    const establishment = await Establishment.findById(estId).lean();
    if (!establishment) {
      return res.status(404).send('Establishment not found');
    }

    // Get all reviews for this establishment
    const reviews = await Review.find({ establishment: estId })
      .sort({ createdAt: -1 })
      .lean();

    res.render('reviews', {
      establishment,
      reviews,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Show all reviews (no establishment filter)
exports.getAllReviewsPage = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('establishment')
      .sort({ createdAt: -1 })
      .lean();

    res.render('reviews', {
      reviews,
      establishment: null,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { title, body, rating, establishment } = req.body;
    const user = req.user ? req.user.username : "Guest";
    let image = req.body.image || null;

    const review = await Review.create({
      title,
      body,
      rating,
      establishment,
      user,
      image
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
};