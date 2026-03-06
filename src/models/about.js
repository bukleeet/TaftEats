const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
  name: String,
  role: String,
  phone: String,
  email: String,
  facebook: String,
  image: String
});

const aboutSchema = new mongoose.Schema({
  section: String, // e.g., "Who We Are", "Our Mission"
  content: String,
  listItems: [String], // optional for lists like "What We Offer"
  developers: [developerSchema], // optional for Meet the Developers
  contact: {
    email: String,
    address: String
  }
});

module.exports = mongoose.model('About', aboutSchema);