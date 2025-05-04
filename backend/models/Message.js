// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId, // Reference to the User who sent the message
            ref: 'User', // Links to the 'User' model
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId, // Reference to the User who received the message
            ref: 'User', // Links to the 'User' model
            required: true,
        },
        content: {
            type: String,
            trim: true,
            required: true,
        },
        // For read receipts (seen status)
        read: {
            type: Boolean,
            default: false,
        },
        // We might add conversation ID later for easier querying or group chats
        // conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Create the Mongoose model from the schema
const Message = mongoose.model('Message', messageSchema);

// Export the model
export default Message;