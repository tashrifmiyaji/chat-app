// frontend/src/api/authApi.js
import apiClient from './axiosConfig'; // Use the configured axios client

// Register User API Call
export const registerUserApi = async (userData) => {
    // userData expected: { name, username, password }
    try {
        const { data } = await apiClient.post('/auth/register', userData);
        return data; // Returns { _id, name, username, userId, createdAt, token }
    } catch (error) {
        // Throw the error response data if available, otherwise the error itself
        throw error.response?.data || error;
    }
};

// Login User API Call
export const loginUserApi = async (credentials) => {
    // credentials expected: { identifier, password }
    try {
        const { data } = await apiClient.post('/auth/login', credentials);
        return data; // Returns { _id, name, username, userId, createdAt, token }
    } catch (error) {
        throw error.response?.data || error;
    }
};

// --- New API Functions for Password Reset ---

/**
 * Verifies user identity using username and userId for password reset.
 * Sends a POST request to the backend.
 * @param {string} username - The user's username.
 * @param {string} userId - The user's 7-digit ID.
 * @returns {Promise<Object>} - Promise resolving to backend response, typically { success, message, mongoUserId }.
 * @throws Will throw an error object from the backend if verification fails or server error occurs.
 */
export const verifyUserForResetApi = async (username, userId) => {
    try {
        // Send POST request to the verification endpoint
        const { data } = await apiClient.post('/auth/verify-reset', { username: username.trim(), userId: userId.trim() });
        return data; // Contains mongoUserId on success
    } catch (error) {
        // Rethrow the backend error response (e.g., { message: 'User not found...' })
        // or the generic error if no response data is available
        throw error.response?.data || error;
    }
};

/**
 * Resets the user's password using their MongoDB ID and the new password.
 * Sends a POST request to the backend.
 * @param {string} mongoUserId - The MongoDB _id of the user (obtained from verification step).
 * @param {string} newPassword - The new password (min 6 characters).
 * @returns {Promise<Object>} - Promise resolving to the success message from the backend, typically { message: 'Password reset successfully.' }.
 * @throws Will throw an error object from the backend if reset fails or server error occurs.
 */
export const resetPasswordApi = async (mongoUserId, newPassword) => {
    try {
        // Send POST request to the password reset endpoint
        const { data } = await apiClient.post('/auth/reset-password', { mongoUserId, newPassword });
        return data; // Contains success message
    } catch (error) {
        // Rethrow the backend error response or the generic error
        throw error.response?.data || error;
    }
};