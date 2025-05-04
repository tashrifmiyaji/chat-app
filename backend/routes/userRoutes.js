// routes/userRoutes.js
import express from 'express';
import { searchUsers, deleteUserAccount } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, searchUsers);
router.delete('/me', protect, deleteUserAccount);

export default router;