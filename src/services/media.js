const cloudinary = require('../config/cloudinary');
const { HttpError } = require('../lib/errors');
let activeUploads = 0;

async function validateFiles(files = [], { avatar = false } = {}) {
  const { fileTypeFromBuffer } = await import('file-type');
  const types = avatar
    ? ['image/jpeg', 'image/png', 'image/webp']
    : [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/quicktime',
        'video/webm',
      ];
  for (const file of files) {
    let detected;
    try {
      detected = await fileTypeFromBuffer(file.buffer);
    } catch {
      /* Truncated or invalid file. */
    }
    if (!detected || !types.includes(detected.mime) || detected.mime !== file.mimetype)
      throw new HttpError(400, 'File contents must match a supported image or video format.');
    file.detectedType = detected.mime.startsWith('video/') ? 'video' : 'image';
  }
}

async function uploadFiles(files = [], options) {
  if (!files.length) return [];
  // HTTP disconnects do not cancel provider work; keep its capacity until completion.
  if (activeUploads >= 2)
    throw new HttpError(503, 'Uploads are busy. Please try again in a moment.');
  activeUploads += 1;
  const urls = [];
  try {
    await validateFiles(files, options);
    if (!process.env.CLOUDINARY_API_KEY)
      throw new HttpError(503, 'Uploads are unavailable. You can submit without an attachment.');
    for (const file of files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'tafteats',
            resource_type: file.detectedType,
            timeout: 30000,
            ...(file.detectedType === 'image'
              ? { format: 'webp', transformation: [{ width: 2400, height: 2400, crop: 'limit' }] }
              : {}),
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        );
        stream.on('error', reject);
        stream.end(file.buffer);
      });
      urls.push(result.secure_url);
    }
    return urls;
  } catch (error) {
    await deleteFiles(urls);
    throw error;
  } finally {
    activeUploads -= 1;
  }
}

function assetFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return null;
    const match = url.pathname.match(
      /^\/([^/]+)\/(image|video)\/upload\/(?:v\d+\/)?(tafteats\/[a-zA-Z0-9_/-]+)\.[a-zA-Z0-9]+$/,
    );
    if (!match || match[1] !== process.env.CLOUDINARY_CLOUD_NAME) return null;
    return { publicId: match[3], resourceType: match[2] };
  } catch {
    return null;
  }
}

async function deleteFiles(urls = []) {
  for (const url of urls) {
    const asset = assetFromUrl(url);
    if (!asset) continue;
    try {
      await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType });
    } catch {
      console.error(JSON.stringify({ event: 'media_cleanup_failed', publicId: asset.publicId }));
    }
  }
}
module.exports = { uploadFiles, validateFiles, deleteFiles, assetFromUrl };
