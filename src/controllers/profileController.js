const User = require('../models/users');

// Get the profile view page
exports.getProfilePage = async (req, res) => {
    try {
        const userID = req.params.userId;  // Extracts ID from URL
        const user = await User.findById(userID).lean();

        // Checks if user exists
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

// Get the profile editor page
exports.getEditPage = async (req, res) => {
    try {
        const userID = req.params.userId;  // Extracts ID from URL
        const user = await User.findById(userID).lean();

        // Checks if user exists
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

// Updates user data to database
exports.updateProfile = async (req, res) => {
    try {
        const userID = req.params.userId;  // Extracts ID from URL
        const { username, description } = req.body;

        // Updated Data
        const updatedData = {
            username,
            description
        };

        // Updates avatar if image is provided
        if (req.file) {
            updatedData.avatar = req.file.filename;
        }

        // Updates Database
        await User.findByIdAndUpdate(userID, updatedData);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};


// function to show all recent activity
// User reviewController.js as reference


// function to show all reviews



// function to show all comments



// function to create activity card
