// backend/controllers/messageController.js
import Message from '../models/Message.js';
import User from '../models/User.js'; // Ensure User model is imported if needed for validation/population
import mongoose from 'mongoose'; // Import mongoose to use mongoose.Types.ObjectId

// @desc    Get all messages between logged-in user and another user
// @route   GET /api/messages/:otherUserId
// @access  Protected (Requires Authentication via 'protect' middleware)
const getMessages = async (req, res, next) => {
    if (!req.user || !req.user._id) {
        console.error("getMessages Error: req.user or req.user._id is missing!");
        return res.status(401).json({ message: 'Authentication error: User data not found in request.' });
    }
    const loggedInUserId = req.user._id;
    const otherUserId = req.params.otherUserId;

    if (!mongoose.Types.ObjectId.isValid(loggedInUserId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
        console.error(`getMessages Error: Invalid ObjectId format. LoggedIn: ${loggedInUserId}, Other: ${otherUserId}`);
        return res.status(400).json({ message: 'Invalid user ID format provided.' });
    }

    console.log(`getMessages: Fetching messages between ${loggedInUserId} and ${otherUserId}`);
    try {
        const messages = await Message.find({
            $or: [
                { sender: loggedInUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: loggedInUserId },
            ],
        })
        .populate('sender', 'name username userId _id') // Populate sender details
        // .populate('receiver', 'name username userId _id') // Optionally populate receiver
        .sort({ createdAt: 1 }); // Sort messages by creation time (oldest first)

        console.log(`getMessages: Found ${messages.length} messages for the conversation.`);
        res.status(200).json(messages);

    } catch (error) {
        console.error('Error fetching messages in getMessages controller:', error);
        res.status(500).json({ message: 'Server error while fetching messages.' });
    }
};


// @desc    Delete conversation between logged-in user and another user
// @route   DELETE /api/messages/conversation/:otherUserId
// @access  Protected
const deleteConversation = async (req, res, next) => {
    if (!req.user || !req.user._id) {
        console.error("deleteConversation Error: req.user or req.user._id is missing!");
        return res.status(401).json({ message: 'Authentication error: User data not found.' });
    }
    const loggedInUserId = req.user._id;
    const otherUserId = req.params.otherUserId;

    if (!mongoose.Types.ObjectId.isValid(loggedInUserId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
        console.error(`deleteConversation Error: Invalid ObjectId format. LoggedIn: ${loggedInUserId}, Other: ${otherUserId}`);
        return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    console.log(`deleteConversation: Attempting to delete messages between ${loggedInUserId} and ${otherUserId}`);
    try {
        const result = await Message.deleteMany({
            $or: [
                { sender: loggedInUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: loggedInUserId },
            ],
        });

        console.log(`deleteConversation: Deletion result - Deleted ${result.deletedCount} messages.`);
        res.status(200).json({
            message: 'Conversation deleted successfully.',
            deletedCount: result.deletedCount,
        });

    } catch (error) {
        console.error('Error deleting conversation in controller:', error);
        res.status(500).json({ message: 'Server error while deleting conversation.' });
    }
};

// @desc    Delete a single message by its ID
// @route   DELETE /api/messages/:messageId
// @access  Protected
const deleteSingleMessage = async (req, res, next) => {
    console.log("\n--- deleteSingleMessage Controller ---");
    if (!req.user || !req.user._id) { return res.status(401).json({ message: 'Authentication error.' }); }
    const loggedInUserId = req.user._id;
    const messageId = req.params.messageId;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.error(`deleteSingleMessage Error: Invalid messageId format: ${messageId}`);
        return res.status(400).json({ message: 'Invalid message ID format.' });
    }
    console.log(`deleteSingleMessage: User ${loggedInUserId} attempting to delete message ${messageId}`);
    try {
        const message = await Message.findById(messageId);
        if (!message) {
            console.log(`deleteSingleMessage: Message ${messageId} not found.`);
            return res.status(404).json({ message: 'Message not found.' });
        }
        // --- CRITICAL: Check if the logged-in user is the sender ---
        if (message.sender.toString() !== loggedInUserId.toString()) {
             console.warn(`deleteSingleMessage: Unauthorized attempt. User ${loggedInUserId} != sender ${message.sender}.`);
             return res.status(403).json({ message: 'You can only delete your own messages.' }); // 403 Forbidden
        }
        // Proceed with deletion
        const result = await Message.deleteOne({ _id: messageId });
        if (result.deletedCount === 1) {
             console.log(`deleteSingleMessage: Message ${messageId} deleted successfully by user ${loggedInUserId}.`);
             res.status(200).json({ message: 'Message deleted successfully.' });
        } else {
             console.warn(`deleteSingleMessage: Message ${messageId} found but delete operation removed 0 documents.`);
             res.status(404).json({ message: 'Message could not be deleted (possibly already deleted).' });
        }
    } catch (error) {
        console.error('Error deleting single message in controller:', error);
        res.status(500).json({ message: 'Server error while deleting message.' });
    }
};

// @desc    Delete specific messages by their IDs (user must be the sender)
// @route   DELETE /api/messages
// @access  Protected
// @body    { messageIds: ["id1", "id2", ...] }
const deleteMultipleMessages = async (req, res, next) => {
    if (!req.user || !req.user._id) {
        console.error("deleteMultipleMessages Error: req.user or req.user._id is missing!");
        return res.status(401).json({ message: 'Authentication error: User data not found.' });
    }
    const loggedInUserId = req.user._id;
    const { messageIds } = req.body; // Expecting an array of message IDs

    // Validate input
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: 'Please provide a non-empty array of message IDs.' });
    }
    const validMessageIds = [];
    for (const id of messageIds) {
        if (mongoose.Types.ObjectId.isValid(id)) {
            validMessageIds.push(id);
        } else {
             console.warn(`deleteMultipleMessages Warning: Invalid message ID format in array skipped: ${id}`);
             // Optionally return error, or just skip invalid ones
        }
    }
    if (validMessageIds.length === 0) {
        return res.status(400).json({ message: 'No valid message IDs provided.' });
    }

    console.log(`deleteMultipleMessages: User ${loggedInUserId} attempting to delete ${validMessageIds.length} messages.`);
    try {
        // Delete messages where _id is in the array AND the logged-in user is the SENDER
        // Users should only be able to delete their own messages in bulk as well.
        const result = await Message.deleteMany({
            _id: { $in: validMessageIds },
            sender: loggedInUserId // <-- Ensure user is the sender
        });

        console.log(`deleteMultipleMessages: Deletion result - Deleted ${result.deletedCount} messages (where user was sender).`);

        if (result.deletedCount === 0 && validMessageIds.length > 0) {
             console.log(`deleteMultipleMessages: No messages deleted for IDs: ${validMessageIds.join(', ')} (either not found or user not sender).`);
        }

        res.status(200).json({
            message: 'Selected messages processed.',
            deletedCount: result.deletedCount,
        });

    } catch (error) {
        console.error('Error deleting specific messages in controller:', error);
        res.status(500).json({ message: 'Server error while deleting messages.' });
    }
};


// @desc    Get recent conversations for the logged-in user with unread count
// @route   GET /api/messages/conversations
// @access  Protected
const getConversations = async (req, res, next) => {
    if (!req.user || !req.user._id) {
        console.error("getConversations Error: req.user or req.user._id is missing!");
        return res.status(401).json({ message: 'Authentication error: User data not found in request.' });
    }
    const loggedInUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(loggedInUserId)) {
        console.error("getConversations Error: Received an invalid ObjectId format.");
        return res.status(400).json({ message: 'Invalid user ID format provided.' });
    }

    try {
        console.log(`getConversations: Executing aggregation for user ID: ${loggedInUserId}`);
        const conversations = await Message.aggregate([
            // Match messages involving the logged-in user
            { $match: { $or: [{ sender: loggedInUserId }, { receiver: loggedInUserId }] } },
            // Sort messages by creation time descending
            { $sort: { createdAt: -1 } },
            // Group by the conversation partner's ID
            {
                $group: {
                    _id: { // Group key = Partner's ID
                        $cond: { if: { $eq: ['$sender', loggedInUserId] }, then: '$receiver', else: '$sender' }
                    },
                    // Get the most recent message document
                    lastMessage: { $first: '$$ROOT' },
                    // Calculate unread count for the logged-in user
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$receiver', loggedInUserId] }, { $eq: ['$read', false] }] },
                                1, // Count if receiver is me and message is unread
                                0  // Otherwise, don't count
                            ]
                        }
                    }
                },
            },
            // Sort conversations by the last message time (most recent first)
            { $sort: { 'lastMessage.createdAt': -1 } },
            // Lookup participant details
            {
                $lookup: {
                    from: 'users', // collection name
                    localField: '_id', // partner's ID from $group stage
                    foreignField: '_id', // field in the users collection
                    as: 'participantInfo',
                    pipeline: [ // Project only needed fields from participant
                        { $project: { _id: 1, name: 1, username: 1, userId: 1 } }
                    ]
                },
            },
            // Unwind the participantInfo array (should be only one match)
            // preserveNullAndEmptyArrays: false ensures conversations with deleted users are filtered out
            { $unwind: { path: "$participantInfo", preserveNullAndEmptyArrays: false } },
            // Project the final output format
            {
                $project: {
                    _id: 0, // Exclude the group key (_id which is participant ID)
                    participant: '$participantInfo', // The other user's details
                    lastMessage: { // Details of the last message in the conversation
                         _id: '$lastMessage._id',
                         content: '$lastMessage.content',
                         sender: '$lastMessage.sender',
                         receiver: '$lastMessage.receiver',
                         read: '$lastMessage.read',
                         createdAt: '$lastMessage.createdAt',
                    },
                    unreadCount: '$unreadCount' // Include the calculated unread count
                },
            },
        ]).exec();

        console.log(`getConversations: Aggregation successful. Found ${conversations.length} conversations.`);
        res.status(200).json(conversations);

    } catch (error) {
        console.error('Error during getConversations aggregation:', error);
        res.status(500).json({ message: 'Server error while fetching conversations.' });
    }
};


// Export all controller functions
export {
    getMessages,
    deleteConversation,
    deleteMultipleMessages,
    getConversations,
    deleteSingleMessage
};