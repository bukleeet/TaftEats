const mongoose = require('mongoose');
const User = require('../src/models/users');
const Review = require('../src/models/reviews');
const v = require('../src/lib/validation');

async function migrate({ apply = false } = {}) {
  const users = await User.find().select('+password').lean();
  const names = new Map();
  const emails = new Set();
  // Validate the entire user set before writing anything. Ambiguities require manual resolution.
  for (const user of users) {
    const username = v.username(user.username);
    const email = v.email(user.email);
    if (names.has(username) || emails.has(email))
      throw new Error(
        'Normalized identities collide. Resolve duplicate usernames/emails before migration.',
      );
    if (user.description?.length > 500)
      throw new Error('A bio exceeds 500 characters. Resolve before migration.');
    names.set(username, user);
    emails.add(email);
  }
  const reviews = await Review.find().lean();
  const changes = [];
  for (const review of reviews) {
    if (!users.some((u) => String(u._id) === String(review.user)))
      throw new Error('An orphan review requires manual resolution.');
    const responseThread = (review.responseThread || []).map((msg) => {
      let authorId = msg.authorId;
      if (!authorId) {
        const candidate = names.get(String(msg.author).toLowerCase());
        const authorized =
          candidate &&
          (msg.role === 'reviewer'
            ? String(candidate._id) === String(review.user)
            : candidate.role === 'owner' &&
              String(candidate.ownedEstablishment) === String(review.establishment));
        if (authorized) authorId = candidate._id;
      }
      return { ...msg, body: v.sanitize(msg.body), authorId: authorId || null };
    });
    changes.push({ id: review._id, body: v.sanitize(review.body), responseThread });
  }
  if (apply) {
    await mongoose.connection.transaction(async (session) => {
      for (const user of users)
        await User.collection.updateOne(
          { _id: user._id },
          {
            $set: {
              username: v.username(user.username),
              email: v.email(user.email),
              __v: user.__v || 0,
            },
          },
          { session },
        );
      for (const change of changes)
        await Review.collection.updateOne(
          { _id: change.id },
          { $set: { body: change.body, responseThread: change.responseThread }, $inc: { __v: 1 } },
          { session },
        );
    });
  }
  return { users: users.length, reviews: reviews.length, applied: apply };
}
if (require.main === module) {
  require('dotenv').config({ quiet: true });
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => migrate({ apply: process.argv.includes('--apply') }))
    .then((result) => console.log(JSON.stringify(result)))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
module.exports = { migrate };
