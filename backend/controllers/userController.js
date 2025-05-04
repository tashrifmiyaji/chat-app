// controllers/userController.js
import User from '../models/User.js';
import Message from '../models/Message.js'; // Needed for deleteUserAccount logic if messages are deleted too
import mongoose from 'mongoose';

// @desc    Search users by name or userId, excluding self
// @route   GET /api/users?search=query
// @access  Protected
const searchUsers = async (req, res, next) => {
    console.log('--- searchUsers Controller Triggered ---'); // Log when function starts

    // 1. Get Logged In User ID from middleware
    const loggedInUserId = req.user?._id; // Using optional chaining just in case

    // Defensive check: Ensure loggedInUserId exists (should always be true after 'protect')
    if (!loggedInUserId) {
        console.error('CRITICAL: req.user._id is missing after protect middleware!');
        return res.status(401).json({ message: 'Authentication error: User ID not found.' });
    }
    console.log(`Logged-in User ID: ${loggedInUserId}`);

    // 2. Get Search Term from query
    const searchTerm = req.query.search;

    // 3. Handle Empty Search Term
    if (!searchTerm || searchTerm.trim() === '') {
        console.log('Search term is empty. Returning [].');
        return res.json([]); // Return empty array if search term is missing or empty
    }
    const trimmedSearchTerm = searchTerm.trim(); // Use trimmed term for query
    console.log(`Searching for term: "${trimmedSearchTerm}"`);

    try {
        // 4. Construct the MongoDB Query
        const queryConditions = {
            // Condition A: Match name (case-insensitive regex) OR userId (exact match)
            $or: [
                { name: { $regex: trimmedSearchTerm, $options: 'i' } },
                { userId: trimmedSearchTerm }
            ],
            // Condition B: Exclude the logged-in user's ID
            _id: { $ne: loggedInUserId }
        };

        console.log('Executing MongoDB find with query:', JSON.stringify(queryConditions));

        // 5. Execute the Query
        const users = await User.find(queryConditions)
            .select('name userId _id') // Select specific fields
            .limit(15); // Limit results to avoid overload (adjust as needed)

        console.log(`Query executed. Found ${users.length} users.`);

        // 6. Send the results
        res.status(200).json(users);

    } catch (error) {
        // 7. Handle Errors
        console.error('Error during user search:', error);
        res.status(500).json({ message: 'Server error during user search' });
    }
};


// @desc    Delete own user account
// @route   DELETE /api/users/me
// @access  Protected (Requires Authentication)
const deleteUserAccount = async (req, res, next) => {
    console.log('--- deleteUserAccount Controller Triggered ---'); // Log entry
    const loggedInUserId = req.user?._id; // Get ID from protect middleware

    // Defensive check
     if (!loggedInUserId) {
        console.error('CRITICAL: req.user._id is missing after protect middleware!');
        return res.status(401).json({ message: 'Authentication error: User ID not found.' });
    }
    console.log(`Attempting to delete account for User ID: ${loggedInUserId}`);

    // No need to validate ObjectId format here if protect middleware does its job

    try {
        // Find the user to ensure they exist before attempting delete operations
        const user = await User.findById(loggedInUserId);

        if (!user) {
            console.log(`User with ID ${loggedInUserId} not found for deletion.`);
            // Even if user not found, perhaps proceed to delete messages just in case?
            // Or return 404. Let's return 404.
            return res.status(404).json({ message: 'User not found' });
        }

        // --- Decide on message deletion strategy ---
        // Current: Only delete user document. Messages remain.
        // Alternative: Delete messages too (affects other users' chat history).

        // Delete the user document
        const deleteResult = await User.deleteOne({ _id: loggedInUserId });
        console.log('User deletion result:', deleteResult);

        if (deleteResult.deletedCount === 0) {
             console.warn(`User ${loggedInUserId} found but delete operation removed 0 documents.`);
             // Might indicate a race condition or other issue, but proceed for now.
        }

        // --- Optional: Delete associated messages ---
        // Uncomment the following lines if you want to delete all messages
        // sent OR received by the user upon account deletion.
        /*
        const messageDeleteResult = await Message.deleteMany({
            $or: [{ sender: loggedInUserId }, { receiver: loggedInUserId }]
        });
        console.log(`Deleted ${messageDeleteResult.deletedCount} messages associated with user ${loggedInUserId}`);
        */

        res.status(200).json({ message: 'User account deleted successfully' });

    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ message: 'Server error while deleting account' });
    }
};

// Export the controller functions
export { searchUsers, deleteUserAccount };