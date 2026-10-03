const User = require('../models/users');
const v = require('../lib/validation');
const { HttpError } = require('../lib/errors');
const media = require('../services/media');
exports.getRegisterPage = (req, res) =>
  req.user ? res.redirect('/establishments') : res.render('register');
exports.registerAccount = async (req, res) => {
  const data = {
    username: v.username(req.body.username),
    email: v.email(req.body.email),
    password: v.password(req.body.password),
    description: v.text(req.body.description, 'Bio', 500, { optional: true }),
    role: 'student',
  };
  if (await User.exists({ $or: [{ username: data.username }, { email: data.email }] }))
    throw new HttpError(409, 'Username or email already taken.');
  const urls = await media.uploadFiles(req.file ? [req.file] : [], { avatar: true });
  try {
    await User.create({ ...data, ...(urls[0] ? { avatar: urls[0] } : {}) });
  } catch (err) {
    await media.deleteFiles(urls);
    throw err;
  }
  res
    .status(201)
    .json({ success: true, message: 'Account created. You can now sign in.', redirect: '/login' });
};
