const mongoose = require('mongoose');
const User = require('../models/users');
const { HttpError } = require('../lib/errors');

async function withActiveAccount(userId, work) {
  return mongoose.connection.transaction(async (session) => {
    // A shared document write serializes new references with account deletion.
    // An existence read alone would allow both transactions to commit from stale snapshots.
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { __v: 1 } },
      { new: true, session, timestamps: false },
    );
    if (!user) throw new HttpError(401, 'This account is no longer available. Sign in again.');
    return work(user, session);
  });
}

module.exports = { withActiveAccount };
