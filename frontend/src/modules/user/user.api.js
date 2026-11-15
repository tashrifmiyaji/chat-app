// src/api/userApi.js
import apiClient from '../../api/axiosConfig';
import { cachedRequest, getCacheScope } from '../../lib/requestCache';

// Search users
export const searchUsersApi = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return [];
    const term = searchTerm.trim();
    const cacheKey = `users:${getCacheScope()}:search:${term.toLowerCase()}`;
    return cachedRequest(cacheKey, async () => {
        try {
            const { data } = await apiClient.get('/users', { params: { search: term } });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Error searching users:", error.response?.data || error);
            throw error.response?.data || error;
        }
    }, 60_000);
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