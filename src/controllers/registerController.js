const User = require('../models/users');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// pipes the memory buffer directly to cloudinary
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'tafteats' },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

exports.getRegisterPage = (req, res) => {
  res.render('register');
};

exports.registerAccount = async (req, res) => {
  try {
    const { username, email, password, description} = req.body;

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username or email already taken.' });
    }

    // fallback to the secure cloudinary url if user skips avatar upload
    let avatarUrl = 'https://res.cloudinary.com/ddbdnydcd/image/upload/v1774355965/defaultprofile_aldk8t.webp';

    if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        avatarUrl = result.secure_url;
    }

    // hashing remains deferred to the mongoose pre-save hook
    const newUser = await User.create({
      username: username,
      email: email,
      password: password,
      description: description || '',
      role: 'student',
      avatar: avatarUrl
    });

    res.status(201).json({ success: true, message: 'Account created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to register account.' });
  }
};