const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const reviewCtrl = require('../controllers/reviewController');

// we use memory storage here so streamifier can pipe the buffer directly to cloudinary
const storage = multer.memoryStorage();

// restricts uploads to specific image and video formats based on extension and mimetype
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm/;
  const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
  const okMime = allowed.test(file.mimetype);
  cb(null, okExt && okMime);
};

const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 6 * 1024 * 1024 } 
});

// catches multer size limit errors and general upload faults to prevent the app from crashing
function handleUpload(req, res, next) {
  upload.array('media', 10)(req, res, err => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Each file must be under 6 MB.' });
    }
    if (err) {
      return res.status(400).json({ success: false, message: 'Upload error: ' + err.message });
    }
    next();
  });
}

router.get('/reviews',                                        reviewCtrl.getAllReviewsPage);
router.get('/establishments/:id/reviews',                     reviewCtrl.getReviewsPage);
router.get('/reviews/:reviewId',                              reviewCtrl.getReviewDetail);
router.post('/reviews',                        handleUpload,  reviewCtrl.createReview);
router.put('/reviews/:reviewId',               handleUpload,  reviewCtrl.editReview);
router.delete('/reviews/:reviewId',                           reviewCtrl.deleteReview);
router.post('/reviews/:reviewId/vote',                        reviewCtrl.voteReview);
router.get('/api/user/profile-activity',                      reviewCtrl.getUserProfileActivity);
router.post('/reviews/:reviewId/owner-response',              reviewCtrl.ownerRespond);
router.post('/reviews/:reviewId/reviewer-reply',              reviewCtrl.reviewerReply);
router.delete('/reviews/:reviewId/thread-last-message',       reviewCtrl.deleteLastThreadMessage);
router.put('/reviews/:reviewId/thread-message/:messageIndex', reviewCtrl.editThreadMessage);

module.exports = router;