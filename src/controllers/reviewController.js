const Review        = require('../models/reviews');
const Establishment = require('../models/establishments');

// Regex-based HTML sanitizer — no external package needed.
const ALLOWED_TAGS = /^\/?(?:b|i|u|s|strong|em|br|p|div|ul|ol|li)$/i;

function sanitize(html) {
  if (!html) return '';
  let clean = html.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, '<$1>');
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return ALLOWED_TAGS.test(tag) ? match : '';
  });
  const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  clean = clean.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, e => entities[e.toLowerCase()] || '');
  return clean;
}

async function recalcEstablishmentRating(establishmentId) {
  const reviews = await Review.find({ establishment: establishmentId }, 'rating');
  if (!reviews.length) return;
  const mean = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const rounded = Math.round(mean * 2) / 2;
  await Establishment.findByIdAndUpdate(establishmentId, { rating: rounded });
}

// Check if the current session user is the reviewer of a review.
// Matches on ObjectId OR username; username fallback handles seeded reviews
// whose user ObjectId may not match if the DB was reseeded after the reviews were created.
function isReviewer(review, session) {
  if (!session.userId) return false;
  const byId       = review.user.toString() === session.userId;
  const byUsername = review.username === session.username;
  return byId || byUsername;
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
      helpfulCount:   r.helpfulVotes.length,
      unhelpfulCount: r.unhelpfulVotes.length,
      userVote: userId
        ? r.helpfulVotes.some(id => id.toString() === userId)
          ? 'helpful'
          : r.unhelpfulVotes.some(id => id.toString() === userId)
            ? 'unhelpful'
            : null
        : null,
      // Expose whether the session user is this review's author (used in EJS)
      isReviewer: isReviewer(r, req.session)
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

    const userId = req.session.userId || null;

    res.render('reviews', {
      reviews: reviews.map(r => ({
        ...r,
        helpfulCount:   r.helpfulVotes.length,
        unhelpfulCount: r.unhelpfulVotes.length,
        isReviewer: isReviewer(r, req.session)
      })),
      establishment: null,
      user: userId
        ? {
            _id:      userId,
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
      media:         req.files ? req.files.map(f => f.filename) : []
    });

    await recalcEstablishmentRating(establishment);
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

    const reviewerFlag = isReviewer(review, req.session);

    res.render('reviewDetail', {
      review: {
        ...review,
        userVote,
        helpfulCount:    review.helpfulVotes.length,
        unhelpfulCount:  review.unhelpfulVotes.length,
        establishmentId: review.establishment._id.toString(),
        reviewerId:      review.user.toString(),
        isReviewer:      reviewerFlag
      },
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

    if (!isReviewer(review, req.session)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const { title, body, rating, deleteMedia } = req.body;
    if (title)  review.title  = title;
    if (body)   review.body   = sanitize(body);
    if (rating) review.rating = Number(rating);
    review.edited = true;

    if (deleteMedia) {
      const toDelete = Array.isArray(deleteMedia) ? deleteMedia : [deleteMedia];
      review.media = review.media.filter(f => !toDelete.includes(f));
    }

    if (req.files && req.files.length > 0) {
      review.media = review.media.concat(req.files.map(f => f.filename)).slice(0, 10);
    }

    await review.save();
    await recalcEstablishmentRating(review.establishment);
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

    if (!isReviewer(review, req.session)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const estId = review.establishment;
    await review.deleteOne();
    await recalcEstablishmentRating(estId);
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

    const thread = review.responseThread;
    const lastMsg = thread[thread.length - 1];

    if (lastMsg && lastMsg.role === 'owner') {
      return res.status(400).json({ success: false, message: 'You already responded. Wait for the reviewer to reply first.' });
    }

    thread.push({
      body:   sanitize(req.body.body || ''),
      author: req.session.username,
      role:   'owner'
    });

    await review.save();
    res.json({ success: true, responseThread: review.responseThread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to post response.' });
  }
};

exports.reviewerReply = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    // Use isReviewer() — handles both ObjectId match and username match for seeded accounts
    if (!isReviewer(review, req.session)) {
      return res.status(403).json({ success: false, message: 'Only the original reviewer can reply here.' });
    }

    const thread = review.responseThread;
    const lastMsg = thread[thread.length - 1];

    if (!lastMsg || lastMsg.role !== 'owner') {
      return res.status(400).json({ success: false, message: 'You can only reply after the owner responds.' });
    }

    thread.push({
      body:   sanitize(req.body.body || ''),
      author: req.session.username,
      role:   'reviewer'
    });

    await review.save();
    res.json({ success: true, responseThread: review.responseThread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to post reply.' });
  }
};

exports.deleteLastThreadMessage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const review = await Review.findById(req.params.reviewId).populate('establishment');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    const thread = review.responseThread;
    if (!thread.length) {
      return res.status(400).json({ success: false, message: 'Nothing to delete.' });
    }

    const lastMsg    = thread[thread.length - 1];
    const isOwner    = req.session.role === 'owner' && review.establishment._id.toString() === req.session.ownedEstablishment;
    const reviewerOk = isReviewer(review, req.session);

    if (lastMsg.role === 'owner' && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (lastMsg.role === 'reviewer' && !reviewerOk) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    review.responseThread.pop();
    await review.save();
    res.json({ success: true, responseThread: review.responseThread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
};

exports.editThreadMessage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Must be logged in.' });
    }

    const { messageIndex } = req.params;
    const review = await Review.findById(req.params.reviewId).populate('establishment');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    const idx = parseInt(messageIndex);
    const msg = review.responseThread[idx];
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

    const isOwner    = req.session.role === 'owner' && review.establishment._id.toString() === req.session.ownedEstablishment;
    const reviewerOk = isReviewer(review, req.session);

    if (msg.role === 'owner' && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (msg.role === 'reviewer' && !reviewerOk) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    msg.body      = sanitize(req.body.body || '');
    msg.edited    = true;
    msg.updatedAt = new Date();

    await review.save();
    res.json({ success: true, responseThread: review.responseThread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to edit message.' });
  }
};

exports.getUserProfileActivity = async (req, res) => {
  try {
    const userId   = req.session.userId;
    const username = req.session.username;

    if (!userId) return res.status(401).json({ success: false, message: 'Not logged in' });

    const posts = await Review.find({ user: userId })
      .populate('establishment')
      .sort({ createdAt: -1 })
      .lean();

    const reviewsWithComments = await Review.find({ 'responseThread.author': username })
      .populate('establishment')
      .lean();

    const comments = [];
    reviewsWithComments.forEach(rev => {
      rev.responseThread.forEach(msg => {
        if (msg.author === username) {
          comments.push({
            establishmentName: rev.establishment.name,
            reviewTitle: rev.title,
            body: msg.body,
            createdAt: msg.createdAt,
            reviewId: rev._id
          });
        }
      });
    });
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const recentActivity = [...posts, ...comments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({ success: true, posts, comments, recentActivity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};