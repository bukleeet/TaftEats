const { randomBytes, scrypt, createHmac, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { HttpError } = require('./errors');
const derive = promisify(scrypt);
const OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
let activeDerivations = 0;

async function derivePassword(plain, salt) {
  // Bound memory and worker-pool pressure without retaining a queue of credentials.
  if (activeDerivations >= 2)
    throw new HttpError(503, 'Authentication is busy. Please try again in a moment.');
  activeDerivations++;
  try {
    return await derive(plain, salt, 64, OPTIONS);
  } finally {
    activeDerivations--;
  }
}

async function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derivePassword(plain, salt);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  if (/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored)) {
    const [, salt, hash] = stored.split('$');
    const actual = await derivePassword(plain, salt);
    return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
  }
  // Successful legacy logins are upgraded before the new session is created.
  if (/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored)) {
    const [salt, hash] = stored.split(':');
    return timingSafeEqual(
      createHmac('sha256', salt).update(plain).digest(),
      Buffer.from(hash, 'hex'),
    );
  }
  return false;
}

module.exports = { hashPassword, verifyPassword };
