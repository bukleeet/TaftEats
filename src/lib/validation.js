const sanitizeHtml = require('sanitize-html');
const { HttpError } = require('./errors');

function text(value, label, max, { optional = false } = {}) {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`);
  const clean = value.trim();
  if ((!optional && !clean) || clean.length > max) {
    throw new HttpError(400, `${label} must contain ${optional ? '0' : '1'}–${max} characters.`);
  }
  return clean;
}

function username(value) {
  const clean = text(value, 'Username', 30).toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
    throw new HttpError(400, 'Username must be 3–30 letters, numbers, or underscores.');
  }
  return clean;
}

function email(value) {
  const clean = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
    throw new HttpError(400, 'Enter a valid email address.');
  return clean;
}

function password(value, { login = false } = {}) {
  if (typeof value !== 'string' || value.length < (login ? 1 : 15) || value.length > 128) {
    throw new HttpError(400, `Password must contain ${login ? '1' : '15'}–128 characters.`);
  }
  return value;
}

function sanitize(value) {
  return sanitizeHtml(typeof value === 'string' ? value : '', {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li'],
    allowedAttributes: {},
  });
}

function richText(value) {
  const clean = sanitize(text(value, 'Review or message', 10000));
  if (!sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).replace(/\s|\u00a0/g, '')) {
    throw new HttpError(400, 'Write a review or message before submitting.');
  }
  return clean;
}

function objectId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{24}$/i.test(value))
    throw new HttpError(400, 'Invalid identifier.');
  return value;
}

function rating(value) {
  if (
    !['string', 'number'].includes(typeof value) ||
    !/^[1-5](?:\.5|\.0)?$/.test(String(value)) ||
    Number(value) > 5
  ) {
    throw new HttpError(400, 'Rating must be 1–5 in half-star increments.');
  }
  return Number(value);
}

function pagination(query) {
  if (
    query.page !== undefined &&
    !(
      typeof query.page === 'number' ||
      (typeof query.page === 'string' && /^\d+$/.test(query.page))
    )
  )
    throw new HttpError(400, 'Invalid page.');
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000)
    throw new HttpError(400, 'Invalid page.');
  return { page, limit: 12, skip: (page - 1) * 12 };
}

function safeJson(value) {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

function mediaUrl(value, fallback = '/images/restaurant.svg') {
  if (typeof value !== 'string') return fallback;
  if (/^\/images\/[a-zA-Z0-9_-]+\.(svg|png|jpe?g|webp)$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    /* Legacy filenames use a local placeholder. */
  }
  return fallback;
}

module.exports = {
  text,
  username,
  email,
  password,
  sanitize,
  richText,
  objectId,
  rating,
  pagination,
  safeJson,
  mediaUrl,
};
