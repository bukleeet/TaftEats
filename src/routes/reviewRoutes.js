const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const reviewCtrl = require('../controllers/reviewController');

// Multer stores uploads in src/public/uploads so Express static can serve them at /uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm/;
  const okExt  = allowed.test(path.extname(file.originalname).toLowerCase());
  const okMime = allowed.test(file.mimetype);
  cb(null, okExt && okMime);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/reviews',                             reviewCtrl.getAllReviewsPage);
router.get('/establishments/:id/reviews',          reviewCtrl.getReviewsPage);
router.get('/reviews/:reviewId',                   reviewCtrl.getReviewDetail);
router.post('/reviews',            upload.single('media'), reviewCtrl.createReview);
router.put('/reviews/:reviewId',   upload.single('media'), reviewCtrl.editReview);
router.delete('/reviews/:reviewId',                reviewCtrl.deleteReview);
router.post('/reviews/:reviewId/vote',             reviewCtrl.voteReview);
router.post('/reviews/:reviewId/owner-response',   reviewCtrl.ownerRespond);
router.delete('/reviews/:reviewId/owner-response', reviewCtrl.deleteOwnerResponse);

module.exports = router;
