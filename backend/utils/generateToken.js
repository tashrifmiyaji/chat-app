// utils/generateToken.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

/**
 * Generates a JSON Web Token (JWT) for a given user ID.
 * @param {string} mongoUserId - The user's MongoDB _id.
 * @returns {string} - The generated JWT.
 */
const generateToken = (mongoUserId) => {
    const secret = process.env.JWT_SECRET;

    // Ensure JWT_SECRET is set in the .env file
    if (!secret) {
        console.error('FATAL ERROR: JWT_SECRET is not defined in .env file.');
        // In development, you might throw an error. In production, log and exit.
        process.exit(1);
    }

    // Ensure the ID being passed is not undefined or null
    if (!mongoUserId) {
        console.error('Error generating token: mongoUserId is missing.');
        throw new Error('User ID is required to generate token.');
    }

    // Create the payload for the JWT
    const payload = {
        userId: mongoUserId // IMPORTANT: Use the MongoDB _id here, name it 'userId' or similar in payload
    };

    console.log("Generating token with payload:", payload); // Debug log

    // Sign the token
    return jwt.sign(
        payload,
        secret,
        { expiresIn: '30d' } // Set token expiration (e.g., 30 days)
    );
};

export default generateToken;