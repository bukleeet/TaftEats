const User = require('../models/users');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// wraps streamifier in a promise so the route handler can await the cloudinary url return
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

exports.getProfilePage = async (req, res) => {
    try {
        const userID = req.params.userId;
        const user = await User.findById(userID).lean();

        if (!user) {
            return res.status(404).send("User not found");
        }
        
        res.render('viewProfile', {
            user: user,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

exports.getEditPage = async (req, res) => {
    try {
        const userID = req.params.userId;
        const user = await User.findById(userID).lean();

        if (!user) {
            return res.status(404).send("User not found");
        }
        
        res.render('editProfile', {
            user: user,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userID = req.params.userId;
        const { username, description } = req.body;

        const updatedData = {
            username,
            description
        };

        // checks if a new file buffer exists and overwrites avatar with the new cloudinary link
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            updatedData.avatar = result.secure_url;
        }

        await User.findByIdAndUpdate(userID, updatedData);

        // keeps the session storage synced so the header updates instantly without relogging
        if (req.session.userId === userID) {
            if (updatedData.avatar)    req.session.avatar   = updatedData.avatar;
            if (updatedData.username)  req.session.username = updatedData.username;
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};