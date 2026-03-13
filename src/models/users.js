const mongoose = require('mongoose');
const crypto   = require('crypto'); // built-in, no install needed

// Password stored as "salt:hash" using HMAC-SHA256.
// Phase 2 spec doesn't require hashing yet, but this avoids plain text
// without needing any external package.

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(plain).digest('hex');
  return salt + ':' + hash;
}

function verifyPassword(plain, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.createHmac('sha256', salt).update(plain).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(hash));
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  avatar: {
    type: String,
    default: 'defaultprofile.png'
  },
  description: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['student', 'owner'],
    default: 'student'
  },
  // Only set for owner accounts
  ownedEstablishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    default: null
  }
}, { timestamps: true });

userSchema.pre('save', function () {
  if (!this.isModified('password')) return;
  this.password = hashPassword(this.password);
});

userSchema.methods.comparePassword = function (plain) {
  return verifyPassword(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);