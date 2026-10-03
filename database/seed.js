const mongoose = require('mongoose');
const User = require('../src/models/users');
const Establishment = require('../src/models/establishments');
const Review = require('../src/models/reviews');
const demo = require('./demo.json');
const DEMO_PASSWORD = 'TaftEats demo passphrase!';

function assertDemoDatabase(uri, env = process.env) {
  if (env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
  if (typeof uri !== 'string') throw new Error('Set DEMO_MONGO_URI to an isolated demo database.');
  const name = new URL(uri).pathname.slice(1);
  if (!/^tafteats_demo(?:_[a-z0-9]+)?$/.test(name))
    throw new Error('Demo database name must be tafteats_demo or tafteats_demo_<suffix>.');
}
async function seedDemo() {
  // Never fall back to MONGO_URI: that may point at real application data.
  assertDemoDatabase(process.env.DEMO_MONGO_URI);
  await mongoose.connect(process.env.DEMO_MONGO_URI);
  if (
    (await User.countDocuments()) ||
    (await Review.countDocuments()) ||
    (await Establishment.countDocuments())
  ) {
    throw new Error('Demo database must be empty. No existing data has been changed.');
  }
  await Promise.all([User.init(), Review.init(), Establishment.init()]);
  // Model saves enforce validation and password hashing; insertMany bypasses save hooks.
  for (const data of demo.users) await User.create({ ...data, password: DEMO_PASSWORD });
  for (const data of demo.establishments) await Establishment.create(data);
  for (const data of demo.reviews) await Review.create(data);
  console.log('Isolated demo ready: jane_d (reviewer), owner_prelude (owner).');
  console.log(`Local demo password: ${DEMO_PASSWORD}`);
}
if (require.main === module) {
  require('dotenv').config({ quiet: true });
  seedDemo()
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
module.exports = { assertDemoDatabase, seedDemo, DEMO_PASSWORD };
