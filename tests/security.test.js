const { test } = require('node:test');
const { EventEmitter } = require('node:events');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const v = require('../src/lib/validation');
const passwords = require('../src/lib/passwords');
const { readConfig } = require('../src/config/env');
const { assertDemoDatabase } = require('../database/seed');
const { isReviewer } = require('../src/services/reviews');
const media = require('../src/services/media');

test('upload capacity bounds concurrent buffers and recovers from an aborted request', () => {
  const { upload } = require('../src/middleware/upload');
  const guard = upload()[0];
  const a = new EventEmitter();
  const b = new EventEmitter();
  const c = new EventEmitter();
  guard({}, a, () => {});
  guard({}, b, () => {});
  assert.throws(() => guard({}, c, () => {}), { status: 503 });
  a.emit('close');
  a.emit('finish');
  guard({}, c, () => {});
  b.emit('finish');
  c.emit('close');
});
test('scrypt uses independent salts and verifies without accepting a wrong password', async () => {
  const plain = 'A sufficiently long passphrase';
  const a = await passwords.hashPassword(plain);
  const b = await passwords.hashPassword(plain);
  assert.notEqual(a, b);
  assert.match(a, /^scrypt\$/);
  assert.equal(await passwords.verifyPassword(plain, a), true);
  assert.equal(await passwords.verifyPassword('wrong', a), false);
});
test('legacy passwords verify safely and corrupt hashes fail closed', async () => {
  const salt = 'ab'.repeat(16);
  const legacy = salt + ':' + createHmac('sha256', salt).update('password123').digest('hex');
  assert.equal(await passwords.verifyPassword('password123', legacy), true);
  for (const stored of ['', 'salt:hash', 'scrypt$malformed', null])
    assert.equal(await passwords.verifyPassword('anything', stored), false);
});
test('password capacity rejects excess hashing and verification and recovers after failure', async () => {
  const plain = 'A bounded authentication passphrase';
  const stored = await passwords.hashPassword(plain);
  const first = passwords.hashPassword(plain);
  const second = passwords.verifyPassword(plain, stored);
  await assert.rejects(passwords.hashPassword(plain), { status: 503 });
  await assert.rejects(passwords.verifyPassword(plain, stored), { status: 503 });
  await Promise.all([first, second]);
  await assert.rejects(passwords.hashPassword(Symbol('invalid password')), TypeError);
  const recovered = await passwords.hashPassword(plain);
  assert.equal(await passwords.verifyPassword(plain, recovered), true);
});
const payloads = [
  '<img src=x onerror=alert(1)>',
  '&lt;img src=x onerror=alert(1)&gt;',
  '<svg/onload=alert(1)>',
  '<p onclick="evil()">Hello</p><script>alert(1)</script>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
  '<a href="javascript:alert(1)">click</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
];
for (const payload of payloads)
  test(`rich text rejects executable markup: ${payload.slice(0, 45)}`, () => {
    const result = v.sanitize(payload);
    assert.doesNotMatch(
      result,
      /<(?:script|img|svg|iframe|math|a)\b|<[^>]+\s(?:on\w+|href|src|style)=/i,
    );
    assert.equal(v.sanitize(result), result);
  });
test('rich text retains simple formatting and rejects markup-only reviews', () => {
  assert.equal(
    v.richText('<p><strong>Good</strong> coffee.</p>'),
    '<p><strong>Good</strong> coffee.</p>',
  );
  for (const body of ['<p><br></p>', '<script>evil()</script>', '   ', '<p>&nbsp;</p>'])
    assert.throws(() => v.richText(body));
});
test('validation rejects NoSQL operators, arrays, oversized fields, and invalid IDs', () => {
  for (const value of [{ $ne: null }, [], null, 12]) {
    assert.throws(() => v.username(value));
    assert.throws(() => v.password(value));
    assert.throws(() => v.objectId(value));
  }
  assert.equal(v.username(' Jane_D '), 'jane_d');
  assert.equal(v.email('JANE@EXAMPLE.TEST'), 'jane@example.test');
  assert.throws(() => v.text('a'.repeat(121), 'Title', 120));
  assert.throws(() => v.objectId('123456789012'));
  assert.throws(() => v.password('password123'));
});
test('ratings and pagination are bounded and scalar', () => {
  for (const bad of [NaN, Infinity, 0, 6, 1.1, [], {}, true, ''])
    assert.throws(() => v.rating(bad));
  assert.equal(v.rating('4.5'), 4.5);
  for (const page of ['0', '-1', '1.5', 'abc', '10001', {}])
    assert.throws(() => v.pagination({ page }));
});
test('JSON output cannot terminate an HTML script element', () => {
  const input = { title: '</script><img onerror=evil()>&\u2028' };
  const result = v.safeJson(input);
  assert.doesNotMatch(result, /[<>&\u2028]/);
  assert.deepEqual(JSON.parse(result), input);
});
test('review ownership never falls back to mutable usernames', () => {
  assert.equal(isReviewer({ user: 'a', username: 'same' }, { _id: 'b', username: 'same' }), false);
});
test('media URLs and deletions are scoped to an allowed origin and folder', () => {
  const original = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = 'example';
  try {
    assert.equal(v.mediaUrl('javascript:alert(1)'), '/images/restaurant.svg');
    assert.equal(v.mediaUrl('https://evil.test/image.jpg'), '/images/restaurant.svg');
    assert.equal(
      media.assetFromUrl('https://res.cloudinary.com/example/video/upload/v123/tafteats/clip.mp4')
        .resourceType,
      'video',
    );
    for (const url of [
      'https://evil.test/tafteats/image.jpg',
      'https://res.cloudinary.com/other/image/upload/tafteats/image.jpg',
      'https://res.cloudinary.com/example/image/upload/defaultprofile.jpg',
    ])
      assert.equal(media.assetFromUrl(url), null);
  } finally {
    if (original === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = original;
  }
});
test('upload validation detects forged MIME and truncated input', async () => {
  await assert.rejects(
    media.validateFiles([
      { mimetype: 'image/png', buffer: Buffer.from('<script>evil()</script>') },
    ]),
  );
  await assert.rejects(
    media.validateFiles([{ mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50]) }]),
  );
  await assert.rejects(
    media.validateFiles([{ mimetype: 'image/svg+xml', buffer: Buffer.from('<svg/>') }], {
      avatar: true,
    }),
  );
});
test('configuration fails closed and demo seeds cannot target ordinary databases', () => {
  assert.throws(() => readConfig({}));
  assert.throws(() =>
    readConfig({ MONGO_URI: 'mongodb://localhost/app', SESSION_SECRET: 'short' }),
  );
  assert.throws(() =>
    readConfig({
      MONGO_URI: 'mongodb://localhost/app',
      SESSION_SECRET: 'x'.repeat(32),
      CLOUDINARY_API_KEY: 'partial',
    }),
  );
  assert.throws(() => assertDemoDatabase('mongodb://localhost/production', {}));
  assert.throws(() =>
    assertDemoDatabase('mongodb://localhost/tafteats_demo', { NODE_ENV: 'production' }),
  );
  assertDemoDatabase('mongodb://localhost/tafteats_demo_test', {});
});
