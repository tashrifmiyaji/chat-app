// src/api/messageApi.js
import apiClient from './axiosConfig'; // Ensure this path is correct and it exports configured Axios instance

/**
 * Fetches the conversation history between the logged-in user and another user.
 * Requires JWT authentication (handled by interceptor in axiosConfig).
 * @param {string} otherUserId - The MongoDB _id of the other user in the conversation.
 * @returns {Promise<Array>} - A promise that resolves to an array of message objects.
 */
export const getMessagesApi = async (otherUserId) => {
    // Validate input: Check if otherUserId is provided and seems valid (basic check)
    if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.length < 10) { // Basic length check for ObjectId likeness
        console.error("getMessagesApi Error: Invalid or missing otherUserId.", otherUserId);
        // Return empty array to prevent breaking UI, or throw specific error
        return [];
        // Or: throw new Error("Invalid participant ID provided.");
    }

    try {
        // Log the API call being made
        console.log(`API Call: GET /messages/${otherUserId}`);
        // Make the GET request using the configured Axios client
        const { data } = await apiClient.get(`/messages/${otherUserId}`);

        // Ensure the backend response is an array before returning
        return Array.isArray(data) ? data : [];
    } catch (error) {
        // Log the detailed error from the backend if available
        console.error("API Error fetching messages:", error.response?.data || error.message);
        // Re-throw the error so the calling component (e.g., ChatArea) can handle it
        throw error.response?.data || error;
    }
};

/**
 * Fetches the list of recent conversations for the logged-in user.
 * Requires JWT authentication (handled by interceptor).
 * @returns {Promise<Array>} - A promise resolving to an array of conversation objects.
 */
export const getConversationsApi = async () => {
    try {
        // Log the API call
        console.log("API Call: GET /messages/conversations");
        // Make the GET request
        const { data } = await apiClient.get('/messages/conversations');

        // Ensure the response is an array
        return Array.isArray(data) ? data : [];
    } catch (error) {
        // Log the detailed error
        console.error("API Error fetching conversations:", error.response?.data || error.message);
        // Re-throw the error
        throw error.response?.data || error;
    }
};

/**
 * Sends a request to delete all messages between the logged-in user and another user.
 * Requires JWT authentication (handled by interceptor).
 * @param {string} otherUserId - The MongoDB _id of the other user.
 * @returns {Promise<Object>} - A promise resolving to the success message and deleted count.
 */
export const deleteConversationApi = async (otherUserId) => {
    // Validate input
    if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.length < 10) {
        console.error("deleteConversationApi Error: Invalid or missing otherUserId.", otherUserId);
        throw new Error("Invalid participant ID provided for deletion.");
    }
    try {
        // Log the API call
        console.log(`API Call: DELETE /messages/conversation/${otherUserId}`);
        // Make the DELETE request
        const { data } = await apiClient.delete(`/messages/conversation/${otherUserId}`);
        // data should be { message: '...', deletedCount: X }
        return data;
    } catch (error) {
        // Log the detailed error
        console.error("API Error deleting conversation:", error.response?.data || error.message);
        // Re-throw the error
        throw error.response?.data || error;
    }
};


/**
 * Sends a request to delete a specific message by its ID.
 * Requires JWT authentication. The user must be the sender.
 * @param {string} messageId - The MongoDB _id of the message to delete.
 * @returns {Promise<Object>} - A promise resolving to the success message from the backend.
 */
export const deleteSingleMessageApi = async (messageId) => {
    // Validate input
    if (!messageId || typeof messageId !== 'string' || messageId.length < 10) { // Basic validation
        console.error("deleteSingleMessageApi Error: Invalid or missing messageId.", messageId);
        throw new Error("Invalid message ID provided for deletion.");
    }
    try {
        // Log the API call
        console.log(`API Call: DELETE /messages/${messageId}`);
        // Make the DELETE request to the endpoint for deleting a single message
        const { data } = await apiClient.delete(`/messages/${messageId}`);
        // data should be { message: 'Message deleted successfully.' }
        return data;
    } catch (error) {
        // Log the detailed error
        console.error(`API Error deleting message ${messageId}:`, error.response?.data || error.message);
        // Re-throw the error for the component to handle
        throw error.response?.data || error;
    }
};


// Placeholder for API function to delete multiple messages by array of IDs (if needed)
/**
 * Sends a request to delete specific messages by their IDs.
 * Requires JWT authentication. User must be involved in the messages.
 * @param {Array<string>} messageIds - An array of message MongoDB _ids to delete.
 * @returns {Promise<Object>} - A promise resolving to the success message and deleted count.
 */
export const deleteMultipleMessagesApi = async (messageIds) => {
     if (!Array.isArray(messageIds) || messageIds.length === 0) {
         console.error("deleteMultipleMessagesApi Error: messageIds must be a non-empty array.");
         throw new Error("Invalid input: messageIds array required.");
     }
     // Add validation for each ID in the array if needed

     try {
         console.log(`API Call: DELETE /messages with IDs: ${messageIds.join(', ')}`);
         // Send DELETE request with messageIds in the request body
         // Axios DELETE with body syntax: axios.delete(url, { data: { key: value } })
         const { data } = await apiClient.delete('/messages', {
             data: { messageIds: messageIds }
         });
         // data should be { message: '...', deletedCount: X }
         return data;
     } catch (error) {
         console.error("API Error deleting multiple messages:", error.response?.data || error.message);
         throw error.response?.data || error;
     }
};

// Note: Ensure all needed functions are explicitly or implicitly exported.
// Using 'export const' handles this automatically.