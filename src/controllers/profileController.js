const User = require('../models/users');

// Get the profile view page
exports.getProfilePage = async (req, res) => {
    try {
        const userID = req.params.userId;  // Extracts ID from URL
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

// function to show all recent activity
// User reviewController.js as reference


// function to show all reviews



// function to show all comments



// function to create activity card