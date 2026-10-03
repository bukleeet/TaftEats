const mongoose = require('mongoose');
const { sanitize } = require('../lib/validation');
const threadSchema = new mongoose.Schema({
  body: { type: String, required: true, maxlength: 10000, set: sanitize },
  author: { type: String, required: true, maxlength: 30 },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  role: { type: String, enum: ['owner', 'reviewer'], required: true },
  edited: { type: Boolean, default: false },
  updatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});
const schema = new mongoose.Schema(
  {
    establishment: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, maxlength: 30 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 10000, set: sanitize },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: (v) => Number.isFinite(v) && v * 2 === Math.trunc(v * 2),
    },
    helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    unhelpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    media: { type: [String], default: [], validate: (v) => v.length <= 10 },
    edited: { type: Boolean, default: false },
    responseThread: { type: [threadSchema], default: [], validate: (v) => v.length <= 100 },
  },
  { timestamps: true, optimisticConcurrency: true },
);
schema.index({ establishment: 1, createdAt: -1, _id: -1 });
schema.index({ user: 1, createdAt: -1 });
schema.index({ 'responseThread.authorId': 1 });
schema.index({ createdAt: -1, _id: -1 });
module.exports = mongoose.model('Review', schema);
