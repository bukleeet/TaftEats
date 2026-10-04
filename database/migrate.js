const mongoose = require('mongoose');
const User = require('../src/models/users');
const Review = require('../src/models/reviews');
const Establishment = require('../src/models/establishments');
const v = require('../src/lib/validation');
class MigrationConflict extends Error {}

function authorizedMessageAuthor(user, message, review) {
  if (!user) return false;
  if (message.role === 'reviewer') return String(user._id) === String(review.user);
  return (
    message.role === 'owner' &&
    user.role === 'owner' &&
    String(user.ownedEstablishment) === String(review.establishment)
  );
}

async function migrate({ apply = false } = {}) {
  const users = await User.find().select('+password').lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const establishments = new Set(
    (await Establishment.find().select('_id').lean()).map((place) => String(place._id)),
  );
  const names = new Map();
  const emails = new Set();
  // Validate the entire user set before writing anything. Ambiguities require manual resolution.
  for (const user of users) {
    const username = v.username(user.username);
    const email = v.email(user.email);
    if (names.has(username) || emails.has(email))
      throw new MigrationConflict(
        'Normalized identities collide. Resolve duplicate usernames/emails before migration.',
      );
    if (user.description?.length > 500)
      throw new MigrationConflict('A bio exceeds 500 characters. Resolve before migration.');
    if (new User({ ...user, username, email }).validateSync())
      throw new MigrationConflict(
        `User ${user._id} has invalid legacy fields. Resolve before migration.`,
      );
    if (user.ownedEstablishment && !establishments.has(String(user.ownedEstablishment)))
      throw new MigrationConflict(
        `User ${user._id} references a missing restaurant. Resolve before migration.`,
      );
    names.set(username, user);
    emails.add(email);
  }
  const reviews = await Review.find().lean();
  const changes = [];
  for (const review of reviews) {
    if (!usersById.has(String(review.user)))
      throw new MigrationConflict('An orphan review requires manual resolution.');
    if (!establishments.has(String(review.establishment)))
      throw new MigrationConflict(
        `Review ${review._id} references a missing restaurant. Resolve before migration.`,
      );
    const responseThread = (review.responseThread || []).map((msg) => {
      let authorId = msg.authorId;
      if (authorId && !authorizedMessageAuthor(usersById.get(String(authorId)), msg, review))
        throw new MigrationConflict(
          `Review ${review._id} has an unproven message author. Resolve before migration.`,
        );
      if (!authorId) {
        const candidate = names.get(String(msg.author).trim().toLowerCase());
        if (authorizedMessageAuthor(candidate, msg, review)) authorId = candidate._id;
      }
      return { ...msg, body: v.sanitize(msg.body), authorId: authorId || null };
    });
    const body = v.sanitize(review.body);
    const migratedReview = new Review({ ...review, body, responseThread });
    if (migratedReview.validateSync())
      throw new MigrationConflict(
        `Review ${review._id} has invalid legacy fields. Resolve before migration.`,
      );
    // Persist generated message IDs as well as sanitized bodies so later edits have stable identity.
    changes.push({
      id: review._id,
      body,
      responseThread: migratedReview.toObject().responseThread,
    });
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
    .connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false })
    .then(() => migrate({ apply: process.argv.includes('--apply') }))
    .then((result) => console.log(JSON.stringify(result)))
    .catch((err) => {
      console.error(
        err instanceof MigrationConflict
          ? err.message
          : 'Migration failed. Check connection, replica set, and legacy data; private details omitted.',
      );
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
module.exports = { migrate };
