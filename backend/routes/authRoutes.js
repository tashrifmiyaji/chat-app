// backend/routes/authRoutes.js
import express from 'express';
import {
    registerUser,
    loginUser,
    verifyUserForReset,
    resetPassword       
} from '../controllers/authController.js';

const router = express.Router();

// --- Existing Routes ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- New Routes for Password Reset ---
router.post('/verify-reset', verifyUserForReset); // User verification route
router.post('/reset-password', resetPassword);    // Password reset route

export default router;