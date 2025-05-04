// backend/server.js
import express from "express";
import mongoose from 'mongoose';
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

// --- Route Imports ---
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

// --- Model Imports ---
import Message from "./models/Message.js";
// import User from './models/User.js'; // Uncomment if needed elsewhere

// --- Load Environment Variables ---
dotenv.config();

// --- Connect to Database ---
connectDB();

// --- Initialize Express App & HTTP Server ---
const app = express();
const server = http.createServer(app);

// ---origin---
const allowedOrigins = [
    "http://localhost:5173", 
    "https://chat-app-1oga.onrender.com"
];

// --- Initialize Socket.IO Server ---
const io = new Server(server, {
	pingTimeout: 60000, // Close connection if no pong received after 60s
	cors: {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn(`CORS Error: Origin ${origin} not allowed.`);
                callback(new Error('Not allowed by CORS'));
            }
        },
    },
});

// --- Express Middleware ---
app.use(cors()); // Enable CORS for Express routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- Basic API Route ---
app.get("/", (req, res) => {
	res.send("Chat App Backend API is running...");
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// --- Socket.IO Connection Logic ---

// Object to store online users: { mongoUserId: socketId }
let onlineUsers = {};

io.on("connection", (socket) => {
	console.log(`\n[Socket Connected] ID: ${socket.id}`);

	// Define currentUserId within the connection scope for this specific socket
	let currentUserId = null; // Stores the MongoDB _id for *this* connection

	// --- 1. Handle 'setup' event from client ---
	socket.on("setup", (userIdFromClient) => {
		// Validate received userId
		if (!userIdFromClient || typeof userIdFromClient !== "string") {
			console.error(
				`[Socket Setup Error] Invalid User ID ("${userIdFromClient}") received from client for socket ${socket.id}. Disconnecting.`
			);
			socket.disconnect(); // Disconnect if setup fails
			return;
		}

		// Assign the user ID to this connection's scope
		currentUserId = userIdFromClient;
		onlineUsers[currentUserId] = socket.id; // Store mapping: userId -> socketId

		socket.join(currentUserId); // Join a room identified by the user's own ID
		console.log(
			`[Socket Setup] User ${currentUserId} connected with socket ${socket.id}. Joined room.`
		);
		console.log("[Online Users Map]", onlineUsers);

		// Emit the updated list of online user IDs to *all* connected clients
		io.emit("get-online-users", Object.keys(onlineUsers));
	});

	// --- 2. Handle 'sendMessage' event ---
	socket.on("sendMessage", async ({ receiverId, content }) => {
		console.log(
			`[Socket Event Received] 'sendMessage' from socket ${socket.id}`
		);

		// Check if sender (currentUserId) is identified for this connection
		if (!currentUserId) {
			console.error(
				`[sendMessage Error] Cannot send message: User not set up (currentUserId is null) for socket ${socket.id}. Ignoring message.`
			);
			return; // Stop execution if sender isn't identified
		}

		// Basic validation of received data
		if (
			!receiverId ||
			!content ||
			typeof receiverId !== "string" ||
			typeof content !== "string"
		) {
			console.error(
				`[sendMessage Error] Invalid data received. Sender: ${currentUserId}, Receiver: ${receiverId}, Content: "${content}"`
			);
			return;
		}

		console.log(
			`[sendMessage] From User: ${currentUserId} To User: ${receiverId} Content: "${content}"`
		);

		try {
			// Create message data to save
			const newMessageData = {
				sender: currentUserId, // MongoDB _id of the sender
				receiver: receiverId, // MongoDB _id of the receiver
				content: content.trim(), // Trim whitespace
				read: false, // Default to unread
			};

			// Save message to database
			let savedMessage = await Message.create(newMessageData);

			// Populate sender details to send back (optional but helpful for client)
			savedMessage = await savedMessage.populate(
				"sender",
				"name username userId _id"
			);

			console.log(
				`[sendMessage] Message saved to DB (ID: ${savedMessage._id})`
			);

			// --- CRITICAL: Emitting to Receiver ---
			const receiverSocketId = onlineUsers[receiverId];
			if (receiverSocketId) {
				// If receiver is online, emit 'receiveMessage' directly to their socket ID
				console.log(
					`[sendMessage] Receiver ${receiverId} IS ONLINE (Socket: ${receiverSocketId}). Emitting 'receiveMessage'...`
				);
				io.to(receiverSocketId).emit("receiveMessage", savedMessage);
				// You could also emit to the room as a fallback/alternative:
				// io.to(receiverId).emit('receiveMessage', savedMessage);
				console.log(
					`[sendMessage] Finished emitting 'receiveMessage' to receiver ${receiverId}.`
				);
			} else {
				// Handle offline receiver (e.g., push notification - future)
				console.log(
					`[sendMessage] Receiver ${receiverId} IS OFFLINE. Message saved, not emitted live.`
				);
				// TODO: Implement offline notification logic if needed
			}

			// Also emit 'messageSent' confirmation back ONLY to the sender's socket
			console.log(
				`[sendMessage] Emitting 'messageSent' confirmation back to sender ${currentUserId} (Socket: ${socket.id})`
			);
			socket.emit("messageSent", savedMessage);
		} catch (error) {
			console.error(
				"[sendMessage Error] Error saving or sending message:",
				error
			);
			// Notify sender of the failure
			socket.emit("messageError", {
				message: "Failed to send message. Please try again.",
			});
		}
	});

	// --- 3. Handle 'typing' event ---
	socket.on("typing", ({ receiverId }) => {
		if (!currentUserId) {
			console.log("[Typing Event] Ignored: Sender not setup.");
			return;
		}
		if (!receiverId) {
			console.log(
				`[Typing Event] Ignored: Missing receiverId from sender ${currentUserId}.`
			);
			return;
		}

		const receiverSocketId = onlineUsers[receiverId];
		if (receiverSocketId) {
			console.log(
				`[Typing Event] ${currentUserId} -> ${receiverId}. Emitting 'typing' to socket ${receiverSocketId}`
			);
			// Emit only to the specific receiver's socket ID
			io.to(receiverSocketId).emit("typing", { senderId: currentUserId });
		} else {
			console.log(
				`[Typing Event] Receiver ${receiverId} offline, cannot emit typing from ${currentUserId}.`
			);
		}
	});

	// --- 4. Handle 'stop typing' event ---
	socket.on("stop typing", ({ receiverId }) => {
		if (!currentUserId) {
			console.log("[Stop Typing Event] Ignored: Sender not setup.");
			return;
		}
		if (!receiverId) {
			console.log(
				`[Stop Typing Event] Ignored: Missing receiverId from sender ${currentUserId}.`
			);
			return;
		}

		const receiverSocketId = onlineUsers[receiverId];
		if (receiverSocketId) {
			console.log(
				`[Stop Typing Event] ${currentUserId} -> ${receiverId}. Emitting 'stop typing' to socket ${receiverSocketId}`
			);
			// Emit only to the specific receiver's socket ID
			io.to(receiverSocketId).emit("stop typing", {
				senderId: currentUserId,
			});
		}
	});

	// --- 5. Handle 'markAsRead' event ---
	socket.on("markAsRead", async ({ messageId, senderId }) => {
		// currentUserId is the reader, senderId is the original message sender
		if (!currentUserId) {
			console.log("[MarkAsRead Event] Ignored: Reader not setup.");
			return;
		}
		if (!messageId || !senderId) {
			console.log(
				`[MarkAsRead Event] Ignored: Missing messageId or senderId from reader ${currentUserId}.`
			);
			return;
		}

		console.log(
			`[MarkAsRead Event] Reader: ${currentUserId}, MsgID: ${messageId}, Original Sender: ${senderId}`
		);
		try {
			// Find the message WHERE the reader is the receiver and it's unread
			const updatedMessage = await Message.findOneAndUpdate(
				{ _id: messageId, receiver: currentUserId, read: false },
				{ read: true },
				{ new: true } // Return the updated document
			);

			if (updatedMessage) {
				console.log(
					`[MarkAsRead] Message ${messageId} marked as read in DB.`
				);
				// Notify the original sender that their message was read
				const originalSenderSocketId = onlineUsers[senderId];
				if (originalSenderSocketId) {
					console.log(
						`[MarkAsRead] Notifying original sender ${senderId} (Socket: ${originalSenderSocketId}) that message was read.`
					);
					// Emit 'messageRead' event to the original sender
					io.to(originalSenderSocketId).emit("messageRead", {
						messageId: updatedMessage._id,
						receiverId: currentUserId, // ID of the person who read the message
					});
				} else {
					console.log(
						`[MarkAsRead] Original sender ${senderId} is offline, cannot notify.`
					);
				}
			} else {
				// Message might have been already read, not found, or reader wasn't the receiver
				console.log(
					`[MarkAsRead] Message ${messageId} not updated (possibly already read or invalid).`
				);
			}
		} catch (error) {
			console.error(
				`[markAsRead Error] Failed for message ${messageId}:`,
				error
			);
		}
	});

	// --- 6. Handle 'deleteThisMessage' event ---
    socket.on('deleteThisMessage', async ({ messageId }) => {
        console.log(`[Socket Event Received] 'deleteThisMessage' for MsgID: ${messageId} from socket ${socket.id}`);

        // Check if user is identified for this connection
        if (!currentUserId) {
            console.error(`[deleteThisMessage Error] User not set up (currentUserId is null) for socket ${socket.id}.`);
            socket.emit('deleteMessageError', { messageId, message: 'Authentication error.' });
            return;
        }

        // Validate messageId
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            console.error(`[deleteThisMessage Error] Invalid messageId received: ${messageId}`);
             socket.emit('deleteMessageError', { messageId, message: 'Invalid message ID.' });
            return;
        }

        try {
            // Find the message to verify ownership and get recipient
            const message = await Message.findById(messageId);

            if (!message) {
                console.warn(`[deleteThisMessage] Message ${messageId} not found.`);
                socket.emit('deleteMessageError', { messageId, message: 'Message not found.' });
                return;
            }

            // --- Authorization Check: Only the sender can delete ---
            if (message.sender.toString() !== currentUserId.toString()) {
                 console.warn(`[deleteThisMessage] Unauthorized attempt by ${currentUserId} to delete message ${messageId} (Sender: ${message.sender}).`);
                 socket.emit('deleteMessageError', { messageId, message: 'You can only delete your own messages.' });
                 return;
            }

            // Proceed with deletion
            const deleteResult = await Message.deleteOne({ _id: messageId });

            if (deleteResult.deletedCount === 1) {
                console.log(`[deleteThisMessage] Message ${messageId} deleted from DB by ${currentUserId}.`);

                // --- Notify both sender and receiver (if online) ---
                const senderId = message.sender.toString();
                const receiverId = message.receiver.toString();

                // Notify the sender (deleter)
                console.log(`   Emitting 'messageDeleted' back to sender ${senderId} (Socket: ${socket.id})`);
                socket.emit('messageDeleted', { messageId, deletedBy: currentUserId });

                // Find and notify the receiver if they are online and different from sender
                if (receiverId !== senderId) {
                    const receiverSocketId = onlineUsers[receiverId];
                    if (receiverSocketId) {
                         console.log(`   Emitting 'messageDeleted' to receiver ${receiverId} (Socket: ${receiverSocketId})`);
                         io.to(receiverSocketId).emit('messageDeleted', { messageId, deletedBy: currentUserId });
                    } else {
                         console.log(`   Receiver ${receiverId} is offline. Cannot notify about deletion.`);
                    }
                }
            } else {
                console.warn(`[deleteThisMessage] Message ${messageId} found but delete operation removed 0 documents.`);
                socket.emit('deleteMessageError', { messageId, message: 'Could not delete message (already deleted?).' });
            }

        } catch (error) {
            console.error(`[deleteThisMessage Error] Error processing deletion for message ${messageId}:`, error);
            socket.emit('deleteMessageError', { messageId, message: 'Server error during message deletion.' });
        }
    });

	// --- 7. Handle 'disconnect' event ---
	socket.on("disconnect", (reason) => {
		const userWhoDisconnected = currentUserId; // Store before clearing
		console.log(
			`[Socket Disconnected] ID: ${socket.id}, User: ${
				userWhoDisconnected || "Not Setup"
			}, Reason: ${reason}`
		);

		// Remove user from onlineUsers map if they were registered
		if (
			userWhoDisconnected &&
			onlineUsers[userWhoDisconnected] === socket.id
		) {
			console.log(
				`[Disconnect] Removing user ${userWhoDisconnected} from online list.`
			);
			delete onlineUsers[userWhoDisconnected];

			// Broadcast updated online users list to everyone remaining
			io.emit("get-online-users", Object.keys(onlineUsers));
			console.log("[Online Users Map Updated]", onlineUsers);
		} else {
			// Handle cases where disconnect happens before setup or if map was inconsistent
			console.log(
				`[Disconnect] Socket ${socket.id} disconnected but user was not found in online map or not set up.`
			);
			// Attempt cleanup by socket ID just in case (less reliable)
			let foundUserId = null;
			for (const userId in onlineUsers) {
				if (onlineUsers[userId] === socket.id) {
					foundUserId = userId;
					break;
				}
			}
			if (foundUserId) {
				console.log(
					`[Disconnect Cleanup] Found user ${foundUserId} by socket ID and removing.`
				);
				delete onlineUsers[foundUserId];
				io.emit("get-online-users", Object.keys(onlineUsers));
				console.log(
					"[Online Users Map Updated after cleanup]",
					onlineUsers
				);
			}
		}
		// Clear the user ID associated with this specific socket instance scope
		currentUserId = null;
	});
}); // End of io.on('connection')

// --- Define Port & Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	// IMPORTANT: Use the http server instance for listen
	console.log(
		`\nServer running in ${
			process.env.NODE_ENV || "development"
		} mode on port ${PORT}`
	);
});

// --- Handle Unhandled Promise Rejections ---
process.on("unhandledRejection", (err, promise) => {
	console.error(`Unhandled Rejection at: ${promise}, reason: ${err.message}`);
	console.error(err.stack);
	// Close server & exit process gracefully
	server.close(() => process.exit(1));
});
