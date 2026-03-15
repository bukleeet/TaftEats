const mongoose = require('mongoose');

const threadMessageSchema = new mongoose.Schema({
  body:      { type: String, required: true },
  author:    { type: String, required: true },
  role:      { type: String, enum: ['owner', 'reviewer'], required: true },
  edited:    { type: Boolean, default: false },
  updatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
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
  // Filenames of uploaded images/videos, served from /uploads/ (up to 10)
  media: {
    type: [String],
    default: []
  },
  edited: {
    type: Boolean,
    default: false
  },
  // Thread of alternating owner/reviewer messages.
  // First message must be from owner, then reviewer, then owner, etc.
  responseThread: {
    type: [threadMessageSchema],
    default: []
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