const User = require('../models/users');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const Review = require('../models/reviews');
const Establishment = require('../models/establishments');

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

const deleteFromCloudinary = async (url) => {
    if (!url || url.includes('defaultprofile')) return; 
    try {
        const parts = url.split('/tafteats/');
        if (parts.length === 2) {
            const filename = parts[1].split('.')[0];
            const publicId = `tafteats/${filename}`;
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (err) {
        console.error('Cloudinary delete error:', err);
    }
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

        const user = await User.findById(userID);
        if (!user) return res.status(404).send("User not found");

        const updatedData = {
            username,
            description
        };

        // checks if a new file buffer exists and overwrites avatar with the new cloudinary link
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            updatedData.avatar = result.secure_url;
            
            await deleteFromCloudinary(user.avatar);
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

exports.deleteAccount = async (req, res) => {
    try {
        const userID = req.params.userId;

        if (req.session.userId !== userID) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        const user = await User.findById(userID);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        await deleteFromCloudinary(user.avatar);

        const userReviews = await Review.find({ user: userID });
        const affectedEstablishmentIds = new Set();

        for (const review of userReviews) {
            affectedEstablishmentIds.add(review.establishment.toString());
            
            if (review.media && review.media.length > 0) {
                for (const url of review.media) {
                    await deleteFromCloudinary(url);
                }
            }
            await review.deleteOne();
        }

        for (const estId of affectedEstablishmentIds) {
            const remainingReviews = await Review.find({ establishment: estId }, 'rating');
            let rounded = 0;
            if (remainingReviews.length > 0) {
                const mean = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length;
                rounded = Math.round(mean * 2) / 2;
            }
            await Establishment.findByIdAndUpdate(estId, { rating: rounded });
        }

        await User.findByIdAndDelete(userID);
        req.session.destroy();

        res.json({ success: true, message: 'Account and all associated data permanently deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during account deletion.' });
    }
};