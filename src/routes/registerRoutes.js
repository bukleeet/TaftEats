const express = require('express');
const router = express.Router();
const multer  = require('multer');
const path    = require('path');
const registerController = require('../controllers/registerController');

// Multer stores uploads in src/public/images so Express static can serve them at /images/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/images'));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const okExt  = allowed.test(path.extname(file.originalname).toLowerCase());
    const okMime = allowed.test(file.mimetype);
    cb(null, okExt && okMime);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 6 * 1024 * 1024 } });

// Multer error handler — catches file size exceeded and invalid type
function handleUpload(req, res, next) {
    upload.single('profileImage')(req, res, err => {
        if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Each file must be under 6 MB.' });
        }
        if (err) {
        return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
        }
        next();
    });
}

// Register page
router.get('/register', registerController.getRegisterPage);    // Displays page
router.post('/register', handleUpload, registerController.registerAccount);   // Processes registration form

module.exports = router;
