const User = require('../models/users');

// GET /login
exports.getLoginPage = (req, res) => {
  if (req.session.userId) return res.redirect('/establishments');
  res.render('login', { error: null });
};

// POST /login
exports.postLogin = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { error: 'Invalid username or password.' });
    }

    const isMatch = user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid username or password.' });
    }

    req.session.userId             = user._id.toString();
    req.session.username           = user.username;
    req.session.role               = user.role;
    req.session.ownedEstablishment = user.ownedEstablishment
      ? user.ownedEstablishment.toString()
      : null;

    // Remember me extends the cookie to 3 weeks on this login and every
    // subsequent visit that touches the session (connect-mongo re-saves automatically)
    if (rememberMe) {
      req.session.cookie.maxAge = 3 * 7 * 24 * 60 * 60 * 1000;
    } else {
      req.session.cookie.expires = false; // session cookie, cleared on browser close
    }

    res.redirect('/establishments');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Something went wrong. Please try again.' });
  }
};

// POST /logout
exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/establishments');
  });
};
