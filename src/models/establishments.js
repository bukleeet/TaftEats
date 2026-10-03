const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 1000 },
    // Legacy stored ratings are ignored; displayed ratings are derived from reviews.
    rating: { type: Number, default: 0, min: 0, max: 5 },
    image: { type: String, default: '/images/restaurant.svg' },
    category: { type: String, default: 'Neighborhood eats', maxlength: 60 },
  },
  { timestamps: true },
);
schema.index({ name: 1 });
module.exports = mongoose.model('Establishment', schema);
