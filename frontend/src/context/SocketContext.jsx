// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth'; // To get user ID

const serverUrl = import.meta.env.REACT_APP_serverUrl;

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]); // State to hold online user IDs
    const { user } = useAuth(); // Get logged-in user info

    // Effect to establish and cleanup socket connection
    useEffect(() => {
        let newSocket = null;
        if (user?._id) { // Only connect if user is logged in and has an ID
            // Connect to the backend socket server
            newSocket = io(serverUrl, { // Your backend URL
                // Optional: Add query parameters if needed by backend
                // query: { userId: user._id } // We use 'setup' event instead
                 reconnectionAttempts: 5, // Try to reconnect 5 times
                 reconnectionDelay: 3000, // Wait 3 seconds between attempts
            });
            setSocket(newSocket);
            console.log("Socket connecting...");

            // --- Setup Event Listener ---
            // Listen for successful connection
            newSocket.on('connect', () => {
                console.log('Socket Connected:', newSocket.id);
                // Send user ID to backend to register the socket
                newSocket.emit('setup', user._id); // Use MongoDB _id
            });

             // Listen for connection errors
            newSocket.on('connect_error', (err) => {
                console.error('Socket Connection Error:', err.message);
                // Handle error (e.g., show message to user)
            });

            // --- Listen for online users update ---
            newSocket.on('get-online-users', (users) => {
                console.log("Received online users:", users);
                setOnlineUsers(users); // Update state with array of online user IDs
            });

            // --- Other Global Listeners (Optional) ---
            // You might listen for global notifications here
             newSocket.on('disconnect', (reason) => {
                console.log('Socket Disconnected:', reason);
                // Handle disconnection (e.g., show message, try reconnecting)
            });


        } else {
            // If user logs out or was never logged in, disconnect socket
            if (socket) {
                socket.disconnect();
                setSocket(null);
                 console.log("Socket disconnected due to user logout/absence.");
            }
        }

        // --- Cleanup function ---
        return () => {
            if (newSocket) {
                console.log("Cleaning up socket connection...");
                newSocket.off('connect');
                newSocket.off('connect_error');
                newSocket.off('get-online-users');
                newSocket.off('disconnect');
                newSocket.disconnect();
            }
            setOnlineUsers([]); // Reset online users on cleanup/logout
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); // Re-run effect when user state changes (login/logout)

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        socket,
        onlineUsers
    }), [socket, onlineUsers]);

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};