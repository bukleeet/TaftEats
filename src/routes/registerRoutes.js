const express = require('express');
const router = express.Router();
const multer  = require('multer');
const path    = require('path');
const registerController = require('../controllers/registerController');

// switch to memory storage for streamifier compatibility
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const okExt  = allowed.test(path.extname(file.originalname).toLowerCase());
    const okMime = allowed.test(file.mimetype);
    cb(null, okExt && okMime);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 6 * 1024 * 1024 } });

// isolates multer errors returning standardized json structure
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

router.get('/register', registerController.getRegisterPage);
router.post('/register', handleUpload, registerController.registerAccount);

module.exports = router;