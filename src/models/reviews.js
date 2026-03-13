const mongoose = require('mongoose');

const ownerResponseSchema = new mongoose.Schema({
  body:        { type: String, required: true },
  respondedAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Cached for display so we don't need to populate on every query
  username: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  // Stored as sanitized HTML from the rich-text editor
  body: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  helpfulVotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  unhelpfulVotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Filename of uploaded image or video, served from /uploads/
  media: {
    type: String,
    default: null
  },
  edited: {
    type: Boolean,
    default: false
  },
  ownerResponse: {
    type: ownerResponseSchema,
    default: null
  }
}, { timestamps: true });

reviewSchema.virtual('helpfulCount').get(function () {
  return this.helpfulVotes.length;
});

reviewSchema.virtual('unhelpfulCount').get(function () {
  return this.unhelpfulVotes.length;
});

reviewSchema.set('toObject', { virtuals: true });
reviewSchema.set('toJSON',   { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
