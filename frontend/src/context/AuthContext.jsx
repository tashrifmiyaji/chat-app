// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUserApi, loginUserApi } from '../api/authApi';
import toast from 'react-hot-toast';

// Create Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Stores user info object { _id, name, username, userId, token }
    const [loading, setLoading] = useState(true); // To check initial auth status
    const [error, setError] = useState(null);   // To store login/signup errors (for form display maybe)
    const navigate = useNavigate();

    // Check local storage on initial load
    useEffect(() => {
        try {
            const storedUserInfo = localStorage.getItem('userInfo');
            if (storedUserInfo) {
                setUser(JSON.parse(storedUserInfo));
            }
        } catch (e) {
            console.error("Failed to parse user info from local storage", e);
            localStorage.removeItem('userInfo'); // Clear corrupted data
        } finally {
            setLoading(false); // Finished checking auth status
        }
    }, []);

    // Login function
    const login = useCallback(async (identifier, password) => {
        setLoading(true);
        setError(null);
        const toastId = toast.loading('Logging in...');
        try {
            const data = await loginUserApi({ identifier, password });
            setUser(data); // Update state with user info + token
            localStorage.setItem('userInfo', JSON.stringify(data)); // Store in local storage
            toast.success('Login successful!', { id: toastId }); 
            setLoading(false);
            navigate('/'); // Redirect to chat page on successful login
        } catch (err) {
            console.error("Login failed:", err);
            const errorMsg = err.message || 'Failed to login';
            setError(errorMsg); 
            toast.error(errorMsg, { id: toastId }); 
            setLoading(false);
        }
    }, [navigate]);

    // Signup function
    const signup = useCallback(async (name, username, password) => {
        setLoading(true);
        setError(null);
        const toastId = toast.loading('Creating account...'); 
        try {
            const data = await registerUserApi({ name, username, password });
            setUser(data); // Update state with user info + token
            localStorage.setItem('userInfo', JSON.stringify(data)); // Store in local storage
            toast.success('Account created successfully!', { id: toastId }); 
            setLoading(false);
            navigate('/'); // Redirect to chat page on successful signup
        } catch (err) {
            console.error("Signup failed:", err);
            const errorMsg = err.message || 'Failed to sign up';
            setError(errorMsg);
            toast.error(errorMsg, { id: toastId }); 
            setLoading(false);
        }
    }, [navigate]);

    // Logout function
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('userInfo');
        toast.success('Logged out successfully.');
        navigate('/login'); // Redirect to login page
        // Optional: Disconnect socket if needed (SocketProvider handles this based on user state)
    }, [navigate]);

    // Context value
    const value = {
        user,       // The current user object (or null)
        login,
        signup,
        logout,
        loading,    // Loading state (useful for initial check and during login/signup)
        error,      // Error message state (for forms)
        setError    // Function to manually clear form errors if needed
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Export the context
export default AuthContext;