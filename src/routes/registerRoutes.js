const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

// Register page
router.get('/register', registerController.getRegisterPage);    // Displays page
router.post('/register', registerController.registerAccount);   // Processes registration form

module.exports = router;    // Exports router (to be used in app.js)