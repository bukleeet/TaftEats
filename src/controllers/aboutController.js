const About = require('../models/about');

// Get the About page
exports.getAboutPage = async (req, res) => {
  try {
    const aboutSections = await About.find().lean();

    res.render('about', {
      aboutSections,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};