const Review        = require('../models/reviews');
const Establishment = require('../models/establishments');

// Regex-based HTML sanitizer — no external package needed.
// Only allows tags produced by the rich-text toolbar.
// See comments below for known edge case tradeoffs.
const ALLOWED_TAGS = /^\/?(b|i|u|s|strong|em|br|p|ul|ol|li)$/i;

function sanitize(html) {
  if (!html) return '';
  // Strip all attributes from every tag first (removes onclick, style, etc.)
  let clean = html.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, '<$1>');
  // Remove any tag not in the whitelist
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return ALLOWED_TAGS.test(tag) ? match : '';
  });
  // Decode common HTML entities to prevent double-encoded payloads like &#60;script&#62;
  const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  clean = clean.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, e => entities[e.toLowerCase()] || '');
  return clean;
}

exports.getReviewsPage = async (req, res) => {
  try {
    const estId = req.params.id;
    const establishment = await Establishment.findById(estId).lean();
    if (!establishment) return res.status(404).send('Establishment not found');

    const reviews = await Review.find({ establishment: estId })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const userId = req.session.userId || null;
    const reviewsWithVote = reviews.map(r => ({
      ...r,
      userVote: userId
        ? r.helpfulVotes.some(id => id.toString() === userId)
          ? 'helpful'
          : r.unhelpfulVotes.some(id => id.toString() === userId)
            ? 'unhelpful'
            : null
        : null
    }));

    res.render('reviews', {
      establishment,
      reviews: reviewsWithVote,
      user: userId
        ? {
            _id:                userId,
            username:           req.session.username,
            role:               req.session.role,
            ownedEstablishment: req.session.ownedEstablishment
          }
        : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getAllReviewsPage = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('establishment')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    res.render('reviews', {
      reviews,
      establishment: null,
      user: req.session.userId
        ? {
            _id:      req.session.userId,
            username: req.session.username,
            role:     req.session.role
          }
        : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.createReview = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const { title, body, rating, establishment } = req.body;

    const review = await Review.create({
      title,
      body:          sanitize(body || ''),
      rating:        Number(rating),
      establishment,
      user:          req.session.userId,
      username:      req.session.username,
      media:         req.file ? req.file.filename : null
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create review.' });
  }
};

exports.getReviewDetail = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)
      .populate('establishment')
      .lean({ virtuals: true });

    if (!review) return res.status(404).send('Review not found');

    const userId = req.session.userId || null;
    const userVote = userId
      ? review.helpfulVotes.some(id => id.toString() === userId)
        ? 'helpful'
        : review.unhelpfulVotes.some(id => id.toString() === userId)
          ? 'unhelpful'
          : null
      : null;

    res.render('reviewDetail', {
      review: { ...review, userVote },
      user: userId
        ? {
            _id:                userId,
            username:           req.session.username,
            role:               req.session.role,
            ownedEstablishment: req.session.ownedEstablishment
          }
        : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.editReview = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (review.user.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const { title, body, rating } = req.body;
    if (title)  review.title  = title;
    if (body)   review.body   = sanitize(body);
    if (rating) review.rating = Number(rating);
    review.edited = true;
    if (req.file) review.media = req.file.filename;

    await review.save();
    res.json({ success: true, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to edit review.' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (review.user.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await review.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
};

exports.voteReview = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const { voteType } = req.body;
    if (!['helpful', 'unhelpful'].includes(voteType)) {
      return res.status(400).json({ success: false, message: 'Invalid vote type.' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    const userId           = req.session.userId;
    const alreadyHelpful   = review.helpfulVotes.some(id => id.toString() === userId);
    const alreadyUnhelpful = review.unhelpfulVotes.some(id => id.toString() === userId);

    if (voteType === 'helpful') {
      if (alreadyHelpful) {
        review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== userId);
      } else {
        review.helpfulVotes.push(userId);
        review.unhelpfulVotes = review.unhelpfulVotes.filter(id => id.toString() !== userId);
      }
    } else {
      if (alreadyUnhelpful) {
        review.unhelpfulVotes = review.unhelpfulVotes.filter(id => id.toString() !== userId);
      } else {
        review.unhelpfulVotes.push(userId);
        review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== userId);
      }
    }

    await review.save();

    res.json({
      success:        true,
      helpfulCount:   review.helpfulVotes.length,
      unhelpfulCount: review.unhelpfulVotes.length,
      userVote: review.helpfulVotes.some(id => id.toString() === userId)
        ? 'helpful'
        : review.unhelpfulVotes.some(id => id.toString() === userId)
          ? 'unhelpful'
          : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.ownerRespond = async (req, res) => {
  try {
    if (!req.session.userId || req.session.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only establishment owners can respond.' });
    }

    const review = await Review.findById(req.params.reviewId).populate('establishment');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (review.establishment._id.toString() !== req.session.ownedEstablishment) {
      return res.status(403).json({ success: false, message: 'You can only respond to reviews on your establishment.' });
    }

    review.ownerResponse = {
      body:        sanitize(req.body.body || ''),
      respondedAt: new Date()
    };

    await review.save();
    res.json({ success: true, ownerResponse: review.ownerResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to post response.' });
  }
};

exports.deleteOwnerResponse = async (req, res) => {
  try {
    if (!req.session.userId || req.session.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only establishment owners can delete responses.' });
    }

    const review = await Review.findById(req.params.reviewId).populate('establishment');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (review.establishment._id.toString() !== req.session.ownedEstablishment) {
      return res.status(403).json({ success: false, message: 'Not your establishment.' });
    }

    review.ownerResponse = null;
    await review.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete response.' });
  }
};
