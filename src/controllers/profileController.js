const mongoose = require('mongoose');
const { promisify } = require('node:util');
const User = require('../models/users');
const Review = require('../models/reviews');
const v = require('../lib/validation');
const { HttpError } = require('../lib/errors');
const media = require('../services/media');
exports.getProfilePage = async (req, res) => {
  const user = await User.findById(v.objectId(req.params.userId))
    .select('username avatar description role createdAt')
    .lean();
  if (!user) throw new HttpError(404, 'Profile not found.');
  res.render('viewProfile', { user });
};
exports.getEditPage = (req, res) => res.render('editProfile', { user: req.user });
exports.updateProfile = async (req, res) => {
  const username = v.username(req.body.username);
  const description = v.text(req.body.description, 'Bio', 500, { optional: true });
  const existing = await User.exists({ username, _id: { $ne: req.user._id } });
  if (existing) throw new HttpError(409, 'Username already taken.');
  const urls = await media.uploadFiles(req.file ? [req.file] : [], { avatar: true });
  const oldAvatar = req.user.avatar;
  try {
    req.user.username = username;
    req.user.description = description;
    if (urls[0]) req.user.avatar = urls[0];
    await req.user.save();
  } catch (err) {
    await media.deleteFiles(urls);
    throw err;
  }
  if (urls[0]) await media.deleteFiles([oldAvatar]);
  res.json({ success: true, redirect: `/profile/${req.user._id}` });
};
exports.deleteAccount = async (req, res) => {
  const password = v.password(req.body.password, { login: true });
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.comparePassword(password)))
    throw new HttpError(403, 'Enter your current password to delete this account.');
  let urls;
  await mongoose.connection.transaction(async (session) => {
    const reviews = await Review.find({ user: user._id }).session(session).lean();
    urls = [user.avatar, ...reviews.flatMap((r) => r.media)];
    await Review.deleteMany({ user: user._id }, { session });
    await Review.updateMany(
      {},
      { $pull: { helpfulVotes: user._id, unhelpfulVotes: user._id }, $inc: { __v: 1 } },
      { session },
    );
    await Review.updateMany(
      { 'responseThread.authorId': user._id },
      {
        $set: {
          'responseThread.$[msg].author': 'Deleted account',
          'responseThread.$[msg].authorId': null,
          'responseThread.$[msg].body': '<p>Message removed after account deletion.</p>',
        },
        $inc: { __v: 1 },
      },
      { session, arrayFilters: [{ 'msg.authorId': user._id }] },
    );
    await User.deleteOne({ _id: user._id }, { session });
  });
  await promisify(req.session.destroy).call(req.session);
  res.clearCookie('tafteats.sid', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: req.app.locals.production,
  });
  await media.deleteFiles(urls);
  res.json({ success: true, redirect: '/establishments' });
};
