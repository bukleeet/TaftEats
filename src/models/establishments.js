const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema({
  name: String,
  description: String,
  rating: Number,
  image: String // store filename like "mcdonalds.jpg"
});

module.exports = mongoose.model('Establishment', establishmentSchema);