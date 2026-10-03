const multer = require('multer');
const { HttpError } = require('../lib/errors');
const media = require('../services/media');
let activeUploads = 0;
function uploadCapacity(_req, res, next) {
  if (activeUploads >= 2)
    throw new HttpError(503, 'Uploads are busy. Please try again in a moment.');
  activeUploads += 1;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeUploads -= 1;
    }
  };
  res.once('finish', release);
  res.once('close', release);
  next();
}

function upload({ avatar = false } = {}) {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 3 * 1024 * 1024,
      files: avatar ? 1 : 10,
      fields: 8,
      fieldSize: 12000,
      parts: avatar ? 9 : 18,
    },
    fileFilter(_req, file, cb) {
      const allowed = avatar
        ? /^(image\/(jpeg|png|webp))$/
        : /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/;
      cb(
        allowed.test(file.mimetype) ? null : new HttpError(400, 'Unsupported file format.'),
        allowed.test(file.mimetype),
      );
    },
  });
  return [
    uploadCapacity,
    avatar ? handler.single('profileImage') : handler.array('media', 10),
    async (req, _res, next) => {
      const files = req.file ? [req.file] : req.files || [];
      if (files.reduce((sum, file) => sum + file.size, 0) > 3 * 1024 * 1024)
        throw new HttpError(400, 'Attachments must total no more than 3 MB per request.');
      await media.validateFiles(files, { avatar });
      next();
    },
  ];
}
module.exports = { upload };
