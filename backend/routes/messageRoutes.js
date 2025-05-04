// routes/messageRoutes.js
import express from 'express';
import {
    getMessages,
    deleteConversation,
    deleteMultipleMessages,
    getConversations,
    deleteSingleMessage
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- IMPORTANT: Define specific routes BEFORE dynamic routes ---

// GET /api/messages/conversations (Fetch list of recent conversations)
// This needs to come BEFORE routes with parameters like /:otherUserId
router.get('/conversations', protect, getConversations);

// DELETE /api/messages/:messageId (Delete a single message)
// Needs to be specific enough not to clash with GET /:otherUserId if IDs can be ambiguous
// Or place it carefully in order. Let's place it before the generic /:otherUserId GET route.
router.delete('/:messageId', protect, deleteSingleMessage);

// --- Routes with parameters ---

// GET /api/messages/:otherUserId (Fetch messages for a specific chat)
router.get('/:otherUserId', protect, getMessages);

// DELETE /api/messages/conversation/:otherUserId (Delete a specific conversation)
// Note: Ensure '/conversation/' part doesn't clash with a potential user ID starting with 'conversation' (unlikely)
// If needed, make the path more specific, e.g., '/user/:otherUserId' for getMessages
router.delete('/conversation/:otherUserId', protect, deleteConversation);

// --- Other Routes ---

// DELETE /api/messages (Delete multiple specific messages by IDs in body)
// This doesn't have parameters, so its position relative to parameterized routes is less critical,
// but keeping it grouped or at the end is fine.
router.delete('/', protect, deleteMultipleMessages);


export default router;