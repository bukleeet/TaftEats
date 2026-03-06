const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({

  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  },

  user: {
    type: String,
    required: true
  },

  title: {
    type: String,
    required: true
  },

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

  helpful: {
    type: Number,
    default: 0
  },

  unhelpful: {
    type: Number,
    default: 0
  },

  image: {
    type: String
  },

  edited: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);