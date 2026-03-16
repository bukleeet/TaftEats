const User = require('../models/users');

exports.getRegisterPage = (req, res) => {
  res.render('register');
};

exports.registerAccount = async (req, res) => {
  try {
    const { username, email, password, description } = req.body;

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username or email already taken.' });
    }

    // Do NOT hash here — the User model pre-save hook handles hashing automatically
    const newUser = await User.create({
      username,
      email,
      password,
      description: description || '',
      role: 'student'
    });

    res.status(201).json({ success: true, message: 'Account created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to register account.' });
  }
};