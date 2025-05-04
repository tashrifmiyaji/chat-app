// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const protect = async (req, res, next) => {
    let token;
    const { method, originalUrl } = req; // Get method and URL for logging
    // console.log(`\n--- Protect Middleware triggered for: ${method} ${originalUrl} ---`);

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (!token) throw new Error("Token extraction failed."); // Early exit if split fails
            // console.log("[Protect] Token Extracted successfully.");

            // Verify token & Decode Payload
            let decoded;
            try {
                 decoded = jwt.verify(token, process.env.JWT_SECRET);
                //  console.log("[Protect] Token Verified. Decoded Payload:", decoded);
            } catch (jwtError) {
                // Specific logging for JWT errors
                 console.error("[Protect] JWT Verification Error:", jwtError.name, jwtError.message);
                 if (jwtError.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired.' });
                 return res.status(401).json({ message: 'Invalid token signature or format.' });
            }


            // === CRITICAL PAYLOAD CHECK ===
            // Check if payload exists and has the 'userId' property we expect
            if (!decoded || typeof decoded !== 'object' || !decoded.hasOwnProperty('userId')) {
                 console.error("[Protect] Error: Decoded payload is missing 'userId' property.", decoded);
                 return res.status(401).json({ message: 'Token payload structure is invalid.' });
            }
            const userIdFromToken = decoded.userId;
            // console.log(`[Protect] userId extracted from payload: "${userIdFromToken}" (Type: ${typeof userIdFromToken})`);

            // === CRITICAL FORMAT VALIDATION ===
            // Validate if the extracted ID is a valid MongoDB ObjectId format BEFORE DB query
            if (!mongoose.Types.ObjectId.isValid(userIdFromToken)) {
                 console.error(`[Protect] Error: The extracted userId ("${userIdFromToken}") is NOT a valid MongoDB ObjectId format.`);
                 // SEND 401 because the token itself contains bad data for authentication
                 return res.status(401).json({ message: 'User identifier in token is invalid.' });
            }
            //  console.log("[Protect] Extracted userId format is a valid ObjectId.");


            // === DATABASE LOOKUP ===
            // console.log(`[Protect] Attempting User.findById with ID: ${userIdFromToken}`);
            let foundUser;
            try {
                foundUser = await User.findById(userIdFromToken).select('-password').lean(); // Use lean() for plain object
            } catch (dbError) {
                 console.error("[Protect] Database Error during User.findById:", dbError);
                 return res.status(500).json({ message: 'Server error during authentication lookup.' });
            }

            // === USER FOUND CHECK ===
            if (!foundUser) {
                 console.error(`[Protect] Error: User not found in database for valid ObjectId: ${userIdFromToken}`);
                 // Send 401 because the user associated with a valid token no longer exists
                 return res.status(401).json({ message: 'User associated with this token not found.' });
            }

            // === ATTACH USER TO REQUEST ===
            // Ensure the foundUser object has the _id property (lean() should preserve it)
             if (!foundUser._id) {
                  console.error("[Protect] Error: User found, but _id property is missing from the result object!", foundUser);
                  return res.status(500).json({ message: 'Server error processing user data.' });
             }
            //  console.log(`[Protect] User found: ID=${foundUser._id}, Username=${foundUser.username}. Attaching to req.user.`);
            req.user = foundUser; // Attach the plain user object (or full Mongoose doc if not using lean())

            // Proceed to the next step (controller)
            //  console.log("[Protect] Authentication successful. Calling next().");
            next();

        } catch (error) {
            // Catch any unexpected errors during the try block (e.g., token split error)
            console.error('[Protect] Unexpected Error in try block:', error);
            res.status(401).json({ message: 'Not authorized, token processing failed.' });
        }
    } else {
        // No Authorization header or doesn't start with 'Bearer'
        console.log("[Protect] No Bearer token provided.");
        res.status(401).json({ message: 'Not authorized, no token.' });
    }
};

export { protect };