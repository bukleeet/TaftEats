const registerUser = require('../models/users');
const bcrypt = require('bcrypt');

// Get the register page
exports.getRegisterPage = async (req, res) => {
    try {
        res.render('register');
    } catch {
        console.error(err);
        res.status(500).send('Server error');
    }
};

// Creates new account
exports.registerAccount = async (req, res) => {
    try {
        // Gets form values
        const {username, email, password, description, profile} = req.body;

        // Encodes Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Creates new user
        const newUser = await registerUser.create({
            username: username,
            email: email,
            password: hashedPassword,
            description: description,
            profile: profile
        });

        res.status(201).json({ success: true, message: "Account created successfully." });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to register account' });
    }
};
