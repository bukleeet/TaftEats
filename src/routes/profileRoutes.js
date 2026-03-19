const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Dynamic Profile page
router.get('/profile/:userId', profileController.getProfilePage);
router.get('/profile/:userId/edit', profileController.getEditPage);
router.post('/profile/:userId/edit', profileController.updateProfile);

module.exports = router;    // Exports router (to be used in app.js)
