const { randomBytes, scrypt, createHmac, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };

async function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(plain, salt, 64, OPTIONS);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  if (/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored)) {
    const [, salt, hash] = stored.split('$');
    const actual = await derive(plain, salt, 64, OPTIONS);
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
