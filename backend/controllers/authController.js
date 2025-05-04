// backend/controllers/authController.js
import User from '../models/User.js';
import generateUniqueUserId from '../utils/generateUniqueId.js';
import generateToken from '../utils/generateToken.js';
import mongoose from 'mongoose'; // Ensure mongoose is imported

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    // Backend only receives the final password, frontend handles confirmation check
    const { name, username, password } = req.body;

    // --- Input Validation ---
    if (!name || !username || !password) {
        return res.status(400).json({ message: 'Please provide name, username, and password' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        // --- Check if username exists ---
        const usernameExists = await User.findOne({ username: username.toLowerCase() });
        if (usernameExists) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // --- Generate unique 7-digit ID ---
        const userId = await generateUniqueUserId();

        // --- Create user (password will be hashed by pre-save hook in User model) ---
        const user = await User.create({
            name,
            username, // Schema will lowercase it
            userId,
            password,
        });

        // --- Respond with user info and token ---
        if (user && user._id) { // Check if user and user._id exist
            const token = generateToken(user._id); // Generate token using MongoDB _id
            res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                userId: user.userId,
                createdAt: user.createdAt,
                token: token,
            });
        } else {
             // This case should ideally not happen if create was successful
            console.error("User creation seemed successful but user object or _id is missing.");
            res.status(400).json({ message: 'User creation failed or user data incomplete.' });
        }
    } catch (error) {
        console.error('Error during user registration:', error);
        if (error.code === 11000 && error.keyPattern?.username) {
             return res.status(400).json({ message: 'Username already taken (db constraint)' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error during registration' });
    }
};


// @desc    Authenticate user (by userId or username) & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    const { identifier, password } = req.body;

    // --- Input Validation ---
    if (!identifier || !password) {
        return res.status(400).json({ message: 'Please provide identifier (userId or username) and password' });
    }

    try {
        console.log(`Login attempt with identifier: "${identifier}"`);
        // --- Find user by userId OR username ---
        let user = await User.findOne({ userId: identifier }).select('+password'); // Include password for comparison

        if (!user) {
            user = await User.findOne({ username: identifier.toLowerCase() }).select('+password'); // Include password
        }

        console.log("User found in DB:", user ? `Yes (ID: ${user._id})` : "No");

        // --- Check user and password ---
        if (user && user._id && (await user.matchPassword(password))) { // Check user._id exists and compare passwords
            // Login successful
            const token = generateToken(user._id); // Generate token using MongoDB _id
            console.log(`Login successful for user: ${user.username}`);
            res.status(200).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                userId: user.userId,
                createdAt: user.createdAt,
                token: token,
            });
        } else {
            // User not found or password doesn't match
            console.log("Login failed: Invalid credentials.");
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};


// --- New Controller Functions for Password Reset ---

// @desc    Verify user exists by username and userId for password reset
// @route   POST /api/auth/verify-reset
// @access  Public
const verifyUserForReset = async (req, res) => {
    const { username, userId } = req.body;

    if (!username || !userId) {
        return res.status(400).json({ message: 'Please provide both username and user ID.' });
    }

    try {
        // Find user by username (lowercase) and userId
        const user = await User.findOne({
            username: username.trim().toLowerCase(),
            userId: userId.trim()
        });

        if (user) {
            // User found, send back MongoDB _id for the next step
            res.status(200).json({
                success: true,
                message: 'User verified successfully.',
                mongoUserId: user._id // This ID is needed for the reset step
            });
        } else {
            // User not found
            res.status(404).json({ message: 'User not found with the provided username and user ID.' });
        }
    } catch (error) {
        console.error('Error during user verification for reset:', error);
        res.status(500).json({ message: 'Server error during user verification.' });
    }
};

// @desc    Reset user password after verification
// @route   POST /api/auth/reset-password
// @access  Public (Should ideally be protected by a temporary token from verification, but simplified here)
const resetPassword = async (req, res) => {
    const { mongoUserId, newPassword } = req.body;

    // --- Validation ---
    if (!mongoUserId || !newPassword) {
        return res.status(400).json({ message: 'User identifier and new password are required.' });
    }
    // Validate if mongoUserId is a valid ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mongoUserId)) {
        return res.status(400).json({ message: 'Invalid user identifier format.' });
    }
    // Validate new password length
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    try {
        // Find the user by their MongoDB _id
        const user = await User.findById(mongoUserId);

        if (!user) {
            return res.status(404).json({ message: 'User not found for password reset.' });
        }

        // --- Set the new password and use save() to trigger pre-save hook for hashing ---
        user.password = newPassword; // Assign the new password directly
        await user.save(); // The pre-save hook in the User model will hash it before saving

        res.status(200).json({ message: 'Password reset successfully. You can now log in with your new password.' });

    } catch (error) {
        console.error('Error during password reset:', error);
        // Handle potential validation errors from save() if any
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join(', ') });
         }
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

// --- Export all controller functions ---
export {
    registerUser,
    loginUser,
    verifyUserForReset,
    resetPassword
};