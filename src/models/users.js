const mongoose = require('mongoose');
const { hashPassword, verifyPassword } = require('../lib/passwords');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]{3,30}$/,
    },
    password: { type: String, required: true, select: false },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    avatar: { type: String, default: '/images/avatar.svg' },
    description: { type: String, default: '', maxlength: 500 },
    role: { type: String, enum: ['student', 'owner'], default: 'student' },
    ownedEstablishment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Establishment',
      default: null,
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);
userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await hashPassword(this.password);
});
userSchema.methods.comparePassword = function (plain) {
  return verifyPassword(plain, this.password);
};
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.email;
    return ret;
  },
});
module.exports = mongoose.model('User', userSchema);
