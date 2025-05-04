// src/api/userApi.js
import apiClient from './axiosConfig';

// Search users
export const searchUsersApi = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return [];
    try {
        const { data } = await apiClient.get(`/users?search=${searchTerm}`);
        return data;
    } catch (error) {
        console.error("Error searching users:", error.response?.data || error);
        throw error.response?.data || error;
    }
};

// --- Add function to delete own account ---
/**
 * Sends a request to delete the currently logged-in user's account.
 * Requires JWT authentication (handled by interceptor).
 * @returns {Promise<Object>} - A promise resolving to the success message from the backend.
 */
export const deleteUserAccountApi = async () => {
    try {
        // Send DELETE request to the '/users/me' endpoint
        console.log("API Call: DELETE /users/me");
        const { data } = await apiClient.delete('/users/me');
        // data should contain { message: 'User account deleted successfully' }
        return data;
    } catch (error) {
        console.error("API Error deleting user account:", error.response?.data || error.message);
        // Re-throw the error to be handled by the calling component
        throw error.response?.data || error;
    }
};