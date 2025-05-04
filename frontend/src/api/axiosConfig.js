// src/api/axiosConfig.js
import axios from 'axios';

const serverUrl = import.meta.env.VITE_SERVER_URL;

const apiClient = axios.create({
    baseURL: `${serverUrl}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor to add JWT token
apiClient.interceptors.request.use(
    (config) => {
        try {
            // Attempt to get user info from local storage
            const userInfoString = localStorage.getItem('userInfo');
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                // Check if userInfo and token exist
                if (userInfo?.token) {
                    console.log("Interceptor: Adding token to request headers"); // Debug log
                    config.headers.Authorization = `Bearer ${userInfo.token}`;
                } else {
                    console.log("Interceptor: userInfo found, but no token inside."); // Debug log
                }
            } else {
                 console.log("Interceptor: No userInfo found in local storage."); // Debug log
            }
        } catch (e) {
            console.error("Interceptor Error parsing userInfo from localStorage:", e);
            // Optionally clear corrupted data: localStorage.removeItem('userInfo');
        }
        return config; // Return the modified config
    },
    (error) => {
        // Handle request error
        console.error("Axios Request Interceptor Error:", error);
        return Promise.reject(error);
    }
);

export default apiClient;