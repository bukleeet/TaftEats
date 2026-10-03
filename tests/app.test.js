const { describe, test, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createHmac } = require('node:crypto');
const { createApp } = require('../src/app');
const User = require('../src/models/users');
const Review = require('../src/models/reviews');
const Establishment = require('../src/models/establishments');
const media = require('../src/services/media');
const { migrate } = require('../database/migrate');
const { discover } = require('../src/services/establishments');

describe('HTTP application against an isolated MongoDB replica set', () => {
  let db, app, alice, bob, owner, userA, userB, ownerUser, restaurant, otherRestaurant, review;
  const secret = 'integration-test-secret-at-least-32-characters';
  const password = 'An isolated test passphrase!';
  function token(response) {
    return response.text.match(/name="csrf-token" content="([a-f0-9]+)"/)?.[1];
  }
  async function login(username, pass = password, target = app) {
    const agent = request.agent(target);
    const page = await agent.get('/login').expect(200);
    await agent
      .post('/login')
      .type('form')
      .send({ _csrf: token(page), username, password: pass })
      .expect(302);
    const home = await agent.get('/establishments').expect(200);
    return { agent, csrf: token(home) };
  }
  function write(actor, method, path, body) {
    return actor.agent[method](path)
      .set('x-csrf-token', actor.csrf)
      .set('Accept', 'application/json')
      .send(body);
  }
  before(async () => {
    db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(db.getUri('tafteats_test'));
    app = createApp({ sessionSecret: secret, persistentRateLimits: false });
    restaurant = await Establishment.create({
      name: 'Test Cafe',
      description: 'Coffee and stories.',
    });
    otherRestaurant = await Establishment.create({
      name: 'Other Cafe',
      description: 'A second restaurant.',
    });
    userA = await User.create({ username: 'alice', email: 'alice@example.test', password });
    userB = await User.create({ username: 'bob', email: 'bob@example.test', password });
    ownerUser = await User.create({
      username: 'owner',
      email: 'owner@example.test',
      password,
      role: 'owner',
      ownedEstablishment: restaurant._id,
    });
    await Promise.all([User.init(), Review.init(), Establishment.init()]);
    alice = await login('alice');
    bob = await login('bob');
    owner = await login('owner');
  });
  beforeEach(async () => {
    mock.restoreAll();
    await Review.deleteMany({});
    review = await Review.create({
      user: userA._id,
      username: 'alice',
      establishment: restaurant._id,
      title: 'Lovely coffee',
      body: '<p>Good food.</p>',
      rating: 4,
    });
  });
  after(async () => {
    mock.restoreAll();
    await mongoose.disconnect();
    if (db) await db.stop();
  });

  test('health, readiness, security headers, and nonce-based CSP', async () => {
    await request(app).get('/health').expect(200);
    await request(app).get('/ready').expect(200);
    const res = await request(app).get('/establishments').expect(200);
    assert.match(res.headers['content-security-policy'], /script-src 'self' 'nonce-/);
    assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.doesNotMatch(res.headers['content-security-policy'], /unsafe-inline/);
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.match(res.headers['set-cookie'][0], /HttpOnly/);
    assert.match(res.headers['set-cookie'][0], /SameSite=Lax/);
  });
  test('every page renders, including empty states and the former broken restaurant route', async () => {
    for (const path of [
      '/about',
      '/register',
      '/reviews',
      `/reviews/${review._id}`,
      `/establishments/${restaurant._id}/reviews`,
      `/profile/${userA._id}`,
    ])
      await request(app).get(path).expect(200);
    await alice.agent.get(`/profile/${userA._id}/edit`).expect(200);
    await request(app).get(`/establishments/${restaurant._id}`).expect(302);
    await request(app)
      .get('/establishments?q=not-present')
      .expect(200)
      .expect(/No places match/);
    await request(app)
      .get('/missing')
      .expect(404)
      .expect(/off the menu/);
  });
  test('all mutations reject absent or incorrect CSRF tokens before uploads', async () => {
    await alice.agent.post('/reviews').set('x-csrf-token', 'é'.repeat(64)).expect(403);
    await alice.agent.post(`/profile/${userA._id}/edit`).send({ username: 'hacked' }).expect(403);
    await alice.agent.post('/reviews').set('x-csrf-token', 'wrong').expect(403);
    await write(alice, 'post', '/reviews', { title: 'Nope' })
      .set('sec-fetch-site', 'cross-site')
      .expect(403);
    const guest = request.agent(app);
    await guest.post('/login').send({ username: 'alice', password }).expect(403);
  });
  test('anonymous users cannot post, upload, edit, or delete', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/login');
    for (const [method, path] of [
      ['post', '/reviews'],
      ['put', `/reviews/${review._id}`],
      ['delete', `/reviews/${review._id}`],
      ['post', `/profile/${userA._id}/edit`],
    ])
      await agent[method](path).set('x-csrf-token', token(page)).expect(401);
  });
  test('profile GET edit, update, and delete reject another account', async () => {
    await bob.agent.get(`/profile/${userA._id}/edit`).expect(403);
    await write(bob, 'post', `/profile/${userA._id}/edit`, { username: 'hacked' }).expect(403);
    await write(bob, 'delete', `/profile/${userA._id}/delete`, { password }).expect(403);
    assert.equal((await User.findById(userA._id)).username, 'alice');
  });
  test('review ownership is checked before parsing a forged edit upload', async () => {
    await bob.agent
      .put(`/reviews/${review._id}`)
      .set('x-csrf-token', bob.csrf)
      .attach('media', Buffer.from('forged image'), { filename: 'x.png', contentType: 'image/png' })
      .expect(403);
  });
  test('account deletion rolls back all database changes on a transaction failure', async () => {
    const user = await User.create({
      username: 'rollback',
      email: 'rollback@example.test',
      password,
    });
    const actor = await login('rollback');
    const owned = await Review.create({
      user: user._id,
      username: 'rollback',
      establishment: restaurant._id,
      title: 'Keep this',
      body: 'Food',
      rating: 4,
    });
    await Review.updateOne({ _id: review._id }, { $push: { helpfulVotes: user._id } });
    mock.method(User, 'deleteOne', async () => {
      throw new Error('Simulated transaction failure');
    });
    await write(actor, 'delete', `/profile/${user._id}/delete`, { password }).expect(500);
    assert.ok(await User.findById(user._id));
    assert.ok(await Review.findById(owned._id));
    assert.equal((await Review.findById(review._id)).helpfulVotes.length, 1);
  });
  test('account deletion rejects an in-flight review upload and removes its new media', async () => {
    const user = await User.create({
      username: 'upload_race',
      email: 'upload_race@example.test',
      password,
    });
    const actor = await login(
      user.username,
      password,
      createApp({ sessionSecret: secret, persistentRateLimits: false }),
    );
    const started = Promise.withResolvers();
    const resume = Promise.withResolvers();
    const url = 'https://res.cloudinary.com/test/image/upload/tafteats/in-flight.jpg';
    const removed = [];
    mock.method(media, 'uploadFiles', async () => {
      started.resolve();
      await resume.promise;
      return [url];
    });
    mock.method(media, 'deleteFiles', async (urls) => removed.push(...urls));
    const pending = write(actor, 'post', '/reviews', {
      title: 'In-flight review',
      body: 'Food',
      rating: 4,
      establishment: String(restaurant._id),
    }).then((response) => response);
    try {
      await started.promise;
      await write(actor, 'delete', `/profile/${user._id}/delete`, { password }).expect(200);
    } finally {
      resume.resolve();
    }
    assert.equal((await pending).status, 401);
    assert.equal(await Review.countDocuments({ user: user._id }), 0);
    assert.ok(removed.includes(url));
  });
  for (const action of ['vote', 'owner-response']) {
    test(`account deletion rejects an already authenticated ${action} request`, async () => {
      const username = action === 'vote' ? 'vote_race' : 'reply_race';
      const user = await User.create({
        username,
        email: `${username}@example.test`,
        password,
        role: 'owner',
        ownedEstablishment: restaurant._id,
      });
      const actor = await login(
        username,
        password,
        createApp({ sessionSecret: secret, persistentRateLimits: false }),
      );
      const loaded = Promise.withResolvers();
      const resume = Promise.withResolvers();
      const findById = User.findById;
      let paused = false;
      mock.method(User, 'findById', function (...args) {
        const query = findById.apply(this, args);
        if (!paused && String(args[0]) === String(user._id)) {
          paused = true;
          const execute = query.exec.bind(query);
          query.exec = async () => {
            const result = await execute();
            loaded.resolve();
            await resume.promise;
            return result;
          };
        }
        return query;
      });
      const pending = write(
        actor,
        'post',
        `/reviews/${review._id}/${action}`,
        action === 'vote' ? { voteType: 'helpful' } : { body: 'In-flight reply' },
      ).then((response) => response);
      try {
        await loaded.promise;
        await write(actor, 'delete', `/profile/${user._id}/delete`, { password }).expect(200);
      } finally {
        resume.resolve();
      }
      assert.equal((await pending).status, 401);
      const remaining = await Review.findById(review._id);
      assert.equal(remaining.helpfulVotes.length, 0);
      assert.equal(remaining.responseThread.length, 0);
    });
  }
  test('profile activity omits voter identities and returns only the requested user’s replies', async () => {
    await write(owner, 'post', `/reviews/${review._id}/owner-response`, {
      body: 'Owner reply',
    }).expect(200);
    await write(alice, 'post', `/reviews/${review._id}/reviewer-reply`, {
      body: 'Reviewer reply',
    }).expect(200);
    const res = await request(app)
      .get(`/api/user/profile-activity?userId=${userA._id}`)
      .expect(200);
    assert.equal(res.body.posts[0].helpfulVotes, undefined);
    assert.equal(res.body.posts[0].unhelpfulVotes, undefined);
    assert.equal(res.body.replies.length, 1);
    assert.equal(res.body.replies[0].body, 'Reviewer reply');
  });
  test('profile updates preserve an empty optional bio and enforce unique usernames', async () => {
    await write(alice, 'post', `/profile/${userA._id}/edit`, {
      username: 'alice',
      description: '',
    }).expect(200);
    await write(alice, 'post', `/profile/${userA._id}/edit`, {
      username: 'bob',
      description: '',
    }).expect(409);
  });
  test('registration normalizes identities, hashes passwords, and ignores supplied privileges', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/register');
    await agent
      .post('/register')
      .set('x-csrf-token', token(page))
      .send({
        username: 'NEW_USER',
        email: 'NEW@EXAMPLE.TEST',
        password,
        role: 'owner',
        ownedEstablishment: String(restaurant._id),
      })
      .expect(201);
    const user = await User.findOne({ username: 'new_user' }).select('+password');
    assert.equal(user.role, 'student');
    assert.equal(user.ownedEstablishment, null);
    assert.equal(user.email, 'new@example.test');
    assert.match(user.password, /^scrypt\$/);
    await agent
      .post('/register')
      .set('x-csrf-token', token(page))
      .send({ username: 'NEW_USER', email: 'other@example.test', password })
      .expect(409);
  });
  test('registration enforces passphrase policy and rejects operator-shaped identities', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/register');
    await agent
      .post('/register')
      .set('x-csrf-token', token(page))
      .send({ username: 'newperson', email: 'a@example.test', password: 'short' })
      .expect(400);
    await agent
      .post('/login')
      .set('x-csrf-token', token(page))
      .send({ username: { $ne: null }, password })
      .expect(400);
  });
  test('login rotates the session, old CSRF tokens fail, and logout revokes access', async () => {
    const agent = request.agent(app);
    const before = await agent.get('/login');
    const oldCookie = before.headers['set-cookie'][0].split(';')[0];
    const logged = await agent
      .post('/login')
      .type('form')
      .send({ _csrf: token(before), username: 'bob', password, rememberMe: '1' })
      .expect(302);
    assert.notEqual(logged.headers['set-cookie'][0].split(';')[0], oldCookie);
    await agent.post('/logout').set('x-csrf-token', token(before)).expect(403);
    const home = await agent.get('/establishments');
    await agent.post('/logout').set('x-csrf-token', token(home)).expect(302);
    await agent.get(`/profile/${userB._id}/edit`).expect(401);
  });
  test('legacy hashes upgrade after successful login', async () => {
    const salt = 'ab'.repeat(16);
    const old = salt + ':' + createHmac('sha256', salt).update('password123').digest('hex');
    await User.collection.insertOne({
      username: 'legacy',
      email: 'legacy@example.test',
      password: old,
      role: 'student',
    });
    await login('legacy', 'password123');
    assert.match(
      (await User.findOne({ username: 'legacy' }).select('+password')).password,
      /^scrypt\$/,
    );
  });
  test('invalid login has a generic message and no authenticated session', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/login');
    await agent
      .post('/login')
      .type('form')
      .send({ _csrf: token(page), username: 'unknown', password })
      .expect(401)
      .expect(/Invalid username or password/);
    await agent.get(`/profile/${userA._id}/edit`).expect(401);
  });
  test('create, edit, and delete reviews with ratings derived from actual data', async () => {
    const created = await write(bob, 'post', '/reviews', {
      title: 'My meal',
      body: '<p>A lovely meal</p>',
      rating: 5,
      establishment: String(restaurant._id),
    }).expect(201);
    await request(app).get('/establishments').expect(/4.5/);
    await write(bob, 'put', `/reviews/${created.body.review._id}`, {
      rating: 2,
      body: '<p>Updated story</p>',
    }).expect(200);
    await request(app).get('/establishments').expect(/3.0/);
    await write(bob, 'delete', `/reviews/${created.body.review._id}`).expect(200);
    await write(alice, 'delete', `/reviews/${review._id}`).expect(200);
    await request(app).get('/establishments').expect(/New/);
  });
  test('review ownership uses immutable IDs even if the username matches', async () => {
    await Review.updateOne({ _id: review._id }, { username: 'bob' });
    await write(bob, 'put', `/reviews/${review._id}`, { title: 'Stolen' }).expect(403);
    await write(bob, 'delete', `/reviews/${review._id}`).expect(403);
  });
  test('review validation rejects absent restaurants, empty HTML, fractional ratings, and oversized titles', async () => {
    const base = {
      title: 'Story',
      body: '<p>Good.</p>',
      rating: 4,
      establishment: String(restaurant._id),
    };
    for (const data of [
      { ...base, body: '<p><br></p>' },
      { ...base, rating: 4.2 },
      { ...base, title: 'a'.repeat(121) },
      { ...base, establishment: { $ne: null } },
    ])
      await write(alice, 'post', '/reviews', data).expect(400);
    await write(alice, 'post', '/reviews', { ...base, establishment: '0'.repeat(24) }).expect(404);
    await write(owner, 'post', '/reviews', base).expect(403);
  });
  test('legacy stored XSS is sanitized on pages and activity API, and titles remain escaped', async () => {
    await Review.collection.updateOne(
      { _id: review._id },
      {
        $set: {
          title: '</script><img src=x onerror=evil()>',
          body: '&lt;img src=x onerror=evil()&gt;<script>evil()</script>',
        },
      },
    );
    for (const path of [
      '/reviews',
      `/reviews/${review._id}`,
      `/establishments/${restaurant._id}/reviews`,
    ]) {
      const page = await request(app).get(path).expect(200);
      assert.doesNotMatch(page.text, /<img src=x|<script>evil/);
    }
    const response = await request(app)
      .get(`/api/user/profile-activity?userId=${userA._id}`)
      .expect(200);
    assert.doesNotMatch(response.body.posts[0].body, /<img|<script/);
  });
  test('votes toggle and switch; authors cannot self-vote', async () => {
    let res = await write(bob, 'post', `/reviews/${review._id}/vote`, {
      voteType: 'helpful',
    }).expect(200);
    assert.equal(res.body.helpfulCount, 1);
    res = await write(bob, 'post', `/reviews/${review._id}/vote`, { voteType: 'unhelpful' }).expect(
      200,
    );
    assert.equal(res.body.helpfulCount, 0);
    assert.equal(res.body.unhelpfulCount, 1);
    res = await write(bob, 'post', `/reviews/${review._id}/vote`, { voteType: 'unhelpful' }).expect(
      200,
    );
    assert.equal(res.body.userVote, null);
    await write(alice, 'post', `/reviews/${review._id}/vote`, { voteType: 'helpful' }).expect(403);
  });
  test('concurrent votes cannot lose another user’s vote', async () => {
    await Promise.all([
      write(bob, 'post', `/reviews/${review._id}/vote`, { voteType: 'helpful' }).expect(200),
      write(owner, 'post', `/reviews/${review._id}/vote`, { voteType: 'helpful' }).expect(200),
    ]);
    assert.equal((await Review.findById(review._id)).helpfulVotes.length, 2);
  });
  test('owner/reviewer conversations enforce ownership and alternating turns', async () => {
    await write(bob, 'post', `/reviews/${review._id}/owner-response`, { body: 'Hi' }).expect(403);
    await write(alice, 'post', `/reviews/${review._id}/reviewer-reply`, { body: 'Hi' }).expect(409);
    await write(owner, 'post', `/reviews/${review._id}/owner-response`, { body: 'Thanks!' }).expect(
      200,
    );
    await write(owner, 'post', `/reviews/${review._id}/owner-response`, { body: 'Again' }).expect(
      409,
    );
    await write(bob, 'post', `/reviews/${review._id}/reviewer-reply`, { body: 'Hi' }).expect(403);
    await write(alice, 'post', `/reviews/${review._id}/reviewer-reply`, {
      body: 'You are welcome.',
    }).expect(200);
    await write(owner, 'put', `/reviews/${review._id}/thread-message/1`, { body: 'Stolen' }).expect(
      403,
    );
    await write(alice, 'put', `/reviews/${review._id}/thread-message/1`, {
      body: 'Edited reply',
    }).expect(200);
    await write(owner, 'delete', `/reviews/${review._id}/thread-last-message`).expect(403);
    await write(alice, 'delete', `/reviews/${review._id}/thread-last-message`).expect(200);
    await write(owner, 'put', `/reviews/${review._id}/thread-message/0junk`, {
      body: 'bad',
    }).expect(400);
  });
  test('an owner cannot respond on a different restaurant', async () => {
    await Review.updateOne({ _id: review._id }, { establishment: otherRestaurant._id });
    await write(owner, 'post', `/reviews/${review._id}/owner-response`, {
      body: 'Wrong cafe',
    }).expect(403);
  });
  test('concurrent thread appends leave exactly one reply for a turn', async () => {
    const replies = await Promise.all([
      write(owner, 'post', `/reviews/${review._id}/owner-response`, { body: 'One' }),
      write(owner, 'post', `/reviews/${review._id}/owner-response`, { body: 'Two' }),
    ]);
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await Review.findById(review._id)).responseThread.length, 1);
  });
  test('optimistic saves prevent review edits overwriting a concurrent vote', async () => {
    const stale = await Review.findById(review._id);
    await write(bob, 'post', `/reviews/${review._id}/vote`, { voteType: 'helpful' }).expect(200);
    stale.title = 'Outdated edit';
    await assert.rejects(stale.save(), { name: 'VersionError' });
    assert.equal((await Review.findById(review._id)).helpfulVotes.length, 1);
  });
  test('media removal cannot delete an arbitrary Cloudinary asset', async () => {
    let deleted = 0;
    mock.method(media, 'deleteFiles', async () => {
      deleted += 1;
    });
    await write(alice, 'put', `/reviews/${review._id}`, {
      deleteMedia: 'https://res.cloudinary.com/example/image/upload/tafteats/another.jpg',
    }).expect(400);
    assert.equal(deleted, 0);
  });
  test('uploads reject forged MIME types, oversized files, and unexpected file fields', async () => {
    await alice.agent
      .post('/reviews')
      .set('x-csrf-token', alice.csrf)
      .field('title', 'Test')
      .attach('media', Buffer.from('<script>bad</script>'), {
        filename: 'image.png',
        contentType: 'image/png',
      })
      .expect(400);
    await alice.agent
      .post('/reviews')
      .set('x-csrf-token', alice.csrf)
      .attach('media', Buffer.alloc(6 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(400);
    await alice.agent
      .post('/reviews')
      .set('x-csrf-token', alice.csrf)
      .attach('unexpected', Buffer.from('bad'), { filename: 'image.png', contentType: 'image/png' })
      .expect(400);
  });
  test('multipart review submission works with CSRF in the header', async () => {
    await bob.agent
      .post('/reviews')
      .set('x-csrf-token', bob.csrf)
      .field('title', 'Multipart meal')
      .field('body', 'Good food.')
      .field('rating', '4.5')
      .field('establishment', String(restaurant._id))
      .expect(201);
  });
  test('failed database saves compensate successfully uploaded assets', async () => {
    const url = 'https://res.cloudinary.com/test/image/upload/tafteats/new.jpg';
    const removed = [];
    mock.method(media, 'uploadFiles', async () => [url]);
    mock.method(media, 'deleteFiles', async (urls) => removed.push(...urls));
    mock.method(Review, 'create', async () => {
      throw new Error('Database failure');
    });
    await write(bob, 'post', '/reviews', {
      title: 'New',
      body: 'Food',
      rating: 4,
      establishment: String(restaurant._id),
    }).expect(500);
    assert.deepEqual(removed, [url]);
  });
  test('public profile endpoints never disclose email or password', async () => {
    const res = await request(app).get(`/profile/${userA._id}`).expect(200);
    assert.doesNotMatch(res.text, /alice@example.test|scrypt\$/);
    const json = (await User.findById(userA._id).select('+password')).toJSON();
    assert.equal(json.password, undefined);
    assert.equal(json.email, undefined);
  });
  test('queries, malformed JSON, and IDs fail with client errors instead of server errors', async () => {
    for (const path of [
      '/reviews/not-an-id',
      '/profile/not-an-id',
      '/establishments?page=-1',
      '/establishments?q[$ne]=1',
      '/api/user/profile-activity?userId[$ne]=1',
    ]) {
      const res = await request(app).get(path);
      assert.ok([400, 404].includes(res.status), `${path}: ${res.status}`);
    }
    await alice.agent
      .post('/reviews')
      .set('x-csrf-token', alice.csrf)
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    await alice.agent
      .post('/reviews')
      .set('x-csrf-token', alice.csrf)
      .send({ body: 'x'.repeat(40000) })
      .expect(413);
  });
  test('pagination and literal search work without interpreting regex syntax', async () => {
    for (let i = 0; i < 13; i++)
      await Review.create({
        user: userA._id,
        username: 'alice',
        establishment: restaurant._id,
        title: `Story ${i}`,
        body: 'Test',
        rating: 4,
      });
    const first = await request(app)
      .get(`/api/user/profile-activity?userId=${userA._id}`)
      .expect(200);
    const second = await request(app)
      .get(`/api/user/profile-activity?userId=${userA._id}&page=2`)
      .expect(200);
    assert.equal(first.body.posts.length, 12);
    assert.equal(second.body.posts.length, 2);
    const page = await request(app).get('/establishments?q=.*').expect(200);
    assert.match(page.text, /No places match/);
  });
  test('discovery paginates in MongoDB and sorts current rounded ratings across all pages', async () => {
    const category = 'Pagination regression';
    const places = await Establishment.insertMany(
      Array.from({ length: 25 }, (_, i) => ({
        name: `Catalog ${String(i).padStart(2, '0')}`,
        description: 'An isolated catalog entry.',
        category,
        rating: 5,
      })),
    );
    try {
      for (const [index, stars] of [
        [24, 5],
        [23, 4.5],
        [22, 4],
        [22, 4.5],
        [21, 4.5],
      ])
        await Review.create({
          user: userA._id,
          username: 'alice',
          establishment: places[index]._id,
          title: `Catalog story ${index}`,
          body: 'Test review',
          rating: stars,
        });
      const input = { filter: { category }, sort: 'name', skip: 0, limit: 12 };
      const first = await discover(input);
      const second = await discover({ ...input, skip: 12 });
      const third = await discover({ ...input, skip: 24 });
      assert.equal(first.count, 25);
      assert.equal(first.establishments.length, 12);
      assert.equal(second.establishments.length, 12);
      assert.equal(third.establishments.length, 1);
      assert.deepEqual(
        [...first.establishments, ...second.establishments, ...third.establishments].map(
          (p) => p.name,
        ),
        places.map((p) => p.name),
      );
      assert.equal(first.establishments[0].rating, 0);
      assert.equal(first.establishments[0].reviewCount, 0);
      const ranked = await discover({ ...input, sort: 'rating' });
      assert.deepEqual(
        ranked.establishments.slice(0, 4).map((p) => p.name),
        ['Catalog 24', 'Catalog 21', 'Catalog 23', 'Catalog 22'],
      );
      assert.equal(ranked.establishments[3].rating, 4.3);
      assert.equal(ranked.establishments[3].reviewCount, 2);
      await Review.deleteMany({ establishment: places[24]._id });
      const changed = await discover({ ...input, sort: 'rating' });
      assert.equal(changed.establishments[0].name, 'Catalog 21');
      const page = await request(app)
        .get('/establishments?category=Pagination%20regression&sort=rating&page=3')
        .expect(200);
      assert.equal((page.text.match(/class="restaurant-card"/g) || []).length, 1);
      const absent = await discover({ ...input, filter: { category: 'Missing category' } });
      assert.equal(absent.count, 0);
      assert.deepEqual(absent.establishments, []);
    } finally {
      await Review.deleteMany({ establishment: { $in: places.map((p) => p._id) } });
      await Establishment.deleteMany({ _id: { $in: places.map((p) => p._id) } });
    }
  });
  test('persistent rate limits are shared by separate application instances', async () => {
    const a = createApp({ sessionSecret: secret });
    const b = createApp({ sessionSecret: secret });
    const agents = [request.agent(a), request.agent(b)];
    const pages = await Promise.all(agents.map((agent) => agent.get('/login')));
    for (let i = 0; i < 20; i++)
      await agents[i % 2]
        .post('/login')
        .set('x-csrf-token', token(pages[i % 2]))
        .send({ username: { $ne: null }, password })
        .expect(400);
    await agents[0]
      .post('/login')
      .set('x-csrf-token', token(pages[0]))
      .send({ username: 'alice', password })
      .expect(429);
  });
  test('migration defaults to dry run and binds only authorized legacy messages', async () => {
    await Review.collection.updateOne(
      { _id: review._id },
      {
        $set: {
          responseThread: [{ body: '<script>bad</script>Thanks', author: 'owner', role: 'owner' }],
        },
      },
    );
    const original = await Review.collection.findOne({ _id: review._id });
    const result = await migrate();
    assert.equal(result.applied, false);
    assert.deepEqual(await Review.collection.findOne({ _id: review._id }), original);
    assert.equal((await Review.findById(review._id)).responseThread[0].authorId, null);
    await migrate({ apply: true });
    const changed = await Review.findById(review._id);
    assert.equal(String(changed.responseThread[0].authorId), String(ownerUser._id));
    assert.doesNotMatch(changed.responseThread[0].body, /<script/);
    assert.ok(changed.responseThread[0]._id);
  });
  test('migration rejects orphan restaurants, invalid fields, and unproven authors without any writes', async () => {
    const source = await Review.collection.findOne({ _id: review._id });
    const missing = new mongoose.Types.ObjectId();
    const cases = [
      [{ user: missing }, /orphan review/],
      [{ establishment: missing }, /missing restaurant/],
      [{ rating: 5.5 }, /invalid legacy fields/],
      [{ title: 'x'.repeat(121) }, /invalid legacy fields/],
      [
        { responseThread: [{ body: 'Hello', author: 'owner', role: 'admin' }] },
        /invalid legacy fields/,
      ],
      [
        {
          responseThread: [{ body: 'Hello', author: 'bob', authorId: userB._id, role: 'reviewer' }],
        },
        /unproven message author/,
      ],
    ];
    for (const [invalid, reason] of cases) {
      const invalidId = new mongoose.Types.ObjectId();
      await Review.collection.insertOne({ ...source, ...invalid, _id: invalidId });
      const beforeUsers = await User.collection.find().toArray();
      const beforeReviews = await Review.collection.find().toArray();
      await assert.rejects(migrate({ apply: true }), reason);
      assert.deepEqual(await User.collection.find().toArray(), beforeUsers);
      assert.deepEqual(await Review.collection.find().toArray(), beforeReviews);
      await Review.collection.deleteOne({ _id: invalidId });
    }
  });
  test('migration refuses normalized identity collisions and missing owner restaurants', async () => {
    await User.collection.updateOne({ _id: userA._id }, { $set: { username: 'ALICE' } });
    await User.collection.updateOne({ _id: userB._id }, { $set: { username: 'alice' } });
    try {
      const before = await User.collection.find().toArray();
      await assert.rejects(migrate({ apply: true }), /identities collide/);
      assert.deepEqual(await User.collection.find().toArray(), before);
    } finally {
      await User.collection.updateOne({ _id: userB._id }, { $set: { username: 'bob' } });
      await User.collection.updateOne({ _id: userA._id }, { $set: { username: 'alice' } });
    }
    await User.collection.updateOne(
      { _id: ownerUser._id },
      { $set: { ownedEstablishment: new mongoose.Types.ObjectId() } },
    );
    try {
      await assert.rejects(migrate({ apply: true }), /missing restaurant/);
    } finally {
      await User.collection.updateOne(
        { _id: ownerUser._id },
        { $set: { ownedEstablishment: restaurant._id } },
      );
    }
  });
  test('migration rolls back earlier writes when a later database write fails', async () => {
    await User.collection.updateOne({ _id: userA._id }, { $set: { username: 'ALICE' } });
    const beforeUsers = await User.collection.find().toArray();
    const beforeReviews = await Review.collection.find().toArray();
    const updateOne = User.collection.updateOne;
    let calls = 0;
    mock.method(User.collection, 'updateOne', async function (...args) {
      if (++calls === 2) throw new Error('Injected migration write failure');
      return updateOne.apply(this, args);
    });
    try {
      await assert.rejects(migrate({ apply: true }), /Injected migration write failure/);
      assert.equal(calls, 2);
      assert.deepEqual(await User.collection.find().toArray(), beforeUsers);
      assert.deepEqual(await Review.collection.find().toArray(), beforeReviews);
    } finally {
      mock.restoreAll();
      await User.collection.updateOne({ _id: userA._id }, { $set: { username: 'alice' } });
    }
  });
  test('deleting an account reauthenticates and atomically removes reviews, votes, and reply content', async () => {
    const user = await User.create({
      username: 'temporary',
      email: 'temporary@example.test',
      password,
    });
    const actor = await login('temporary');
    const unrelated = await Review.create({
      user: userA._id,
      username: 'alice',
      establishment: restaurant._id,
      title: 'Unrelated review',
      body: 'Keep this unchanged',
      rating: 4,
    });
    await Review.create({
      user: user._id,
      username: 'temporary',
      establishment: restaurant._id,
      title: 'Delete me',
      body: 'Food',
      rating: 5,
    });
    await Review.updateOne(
      { _id: review._id },
      {
        $push: {
          helpfulVotes: user._id,
          responseThread: {
            body: 'Personal content',
            author: 'temporary',
            authorId: user._id,
            role: 'owner',
          },
        },
      },
    );
    await write(actor, 'delete', `/profile/${user._id}/delete`, {
      password: 'wrong password',
    }).expect(403);
    mock.method(media, 'deleteFiles', async () => {});
    await write(actor, 'delete', `/profile/${user._id}/delete`, { password }).expect(200);
    assert.equal(await User.findById(user._id), null);
    assert.equal(await Review.countDocuments({ user: user._id }), 0);
    const remaining = await Review.findById(review._id);
    assert.equal(remaining.helpfulVotes.length, 0);
    assert.equal(remaining.responseThread[0].author, 'Deleted account');
    assert.doesNotMatch(remaining.responseThread[0].body, /Personal content/);
    assert.equal((await Review.findById(unrelated._id)).__v, unrelated.__v);
  });
});
