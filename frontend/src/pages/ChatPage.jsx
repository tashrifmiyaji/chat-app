// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import { getConversationsApi } from '../api/messageApi';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';

const ChatPage = () => {
    const { socket, onlineUsers } = useSocket();
    const { user: loggedInUser } = useAuth();
    const [selectedConversation, setSelectedConversation] = useState(null);

    // State for conversations, loading, and error (lifted from Sidebar)
    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [conversationsError, setConversationsError] = useState(null);

    // State for mobile sidebar visibility
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Fetches conversations from the API
    const fetchConversations = useCallback(async () => {
        // console.log("ChatPage: Fetching conversations...");
        setLoadingConversations(true);
        setConversationsError(null);
        try {
            const convos = await getConversationsApi();
            setConversations(convos);
            // console.log("ChatPage: Fetched conversations count:", convos.length);
        } catch (error) {
            setConversationsError("Could not load recent chats.");
            console.error("ChatPage: Conversation fetch error:", error);
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    // Fetch initial conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Marks a conversation as read locally (resets unread count in UI)
    const markConversationAsReadLocally = useCallback((participantId) => {
        setConversations(prevConvos =>
            prevConvos.map(convo =>
                convo.participant?._id === participantId
                    ? { ...convo, unreadCount: 0 }
                    : convo
            )
        );
    }, []);

    // Handles incoming messages via socket for real-time updates
    useEffect(() => {
        if (!socket || !loggedInUser?._id) return;

        // console.log("ChatPage: Setting up 'receiveMessage' listener.");
        const handleReceiveMessage = (newMessage) => {
            // console.log("ChatPage <<< receiveMessage:", newMessage);
            if (!newMessage?.sender?._id || !newMessage?.receiver) {
                 console.warn("ChatPage: Received incomplete message via socket:", newMessage);
                 return;
            }
            const senderId = newMessage.sender._id;
            const receiverId = newMessage.receiver;

            // Ignore own messages or messages not intended for the logged-in user
            if (senderId === loggedInUser._id || receiverId !== loggedInUser._id) {
                // console.log("ChatPage: Ignoring own message or message not for me.");
                return;
            }

            const partnerId = senderId; // The partner is the sender

            setConversations(prevConvos => {
                const existingConvoIndex = prevConvos.findIndex(c => c.participant?._id === partnerId);
                let updatedConvos = [...prevConvos]; // Create a new array reference

                if (existingConvoIndex !== -1) {
                    // Conversation exists: update it and move to top
                    const existingConvo = updatedConvos[existingConvoIndex];
                    const updatedConvo = {
                        ...existingConvo,
                        lastMessage: {
                            _id: newMessage._id,
                            content: newMessage.content,
                            sender: newMessage.sender._id, // Store sender ID
                            receiver: newMessage.receiver,
                            read: newMessage.read, // Use read status from socket message
                            createdAt: newMessage.createdAt,
                        },
                        // Increment unread count only if the chat is not currently selected
                        unreadCount: selectedConversation?._id === partnerId ? existingConvo.unreadCount : existingConvo.unreadCount + 1,
                    };
                    updatedConvos.splice(existingConvoIndex, 1); // Remove old entry
                    updatedConvos.unshift(updatedConvo); // Add updated entry to the beginning
                    // console.log(`ChatPage: Updated existing conversation with ${partnerId}. Unread: ${updatedConvo.unreadCount}`);
                } else {
                    // New conversation: Refetch the entire list for simplicity
                    // A more complex approach would fetch participant info and create the convo object locally
                    // console.log(`ChatPage: New conversation started with ${partnerId}. Refetching list...`);
                    fetchConversations(); // Easiest way to handle new convos for now
                }
                return updatedConvos; // Return the modified list
            });
        };

        socket.on('receiveMessage', handleReceiveMessage);

        // Cleanup listener on component unmount or dependency change
        return () => {
            // console.log("ChatPage: Removing 'receiveMessage' listener.");
            socket.off('receiveMessage', handleReceiveMessage);
        };
    // Dependencies ensure effect runs when needed
    }, [socket, loggedInUser?._id, selectedConversation?._id, fetchConversations]);


    // Handles selecting a conversation from the Sidebar
    const handleSelectConversation = useCallback((userOrChat) => {
        // console.log("ChatPage: Selecting conversation with:", userOrChat?.name);
        setSelectedConversation(userOrChat);
        // Mark as read locally immediately for better UX
        if (userOrChat?._id) {
            markConversationAsReadLocally(userOrChat._id);
        }
         // Close sidebar on mobile after selection
         if (window.innerWidth < 768) { // md breakpoint
            setIsSidebarOpen(false);
         }
    }, [markConversationAsReadLocally]); // Include dependency

    // Handles callback when a conversation is deleted in ChatArea
    const handleConversationDeleted = useCallback((deletedUserId) => {
        // console.log(`ChatPage: Conversation deleted with ${deletedUserId}. Refetching list.`);
        setSelectedConversation(null); // Clear selection
        fetchConversations(); // Refresh the list
    }, [fetchConversations]);

    // Handles callback when messages are deleted in ChatArea (to update last message)
    const handleMessagesDeleted = useCallback(() => {
        // console.log("ChatPage: Messages deleted in ChatArea. Refetching conversations...");
        fetchConversations(); // Refresh the list to show correct last message
    }, [fetchConversations]);


    // Determines if the currently selected user is online
    const isSelectedUserOnline = selectedConversation
        ? onlineUsers.includes(selectedConversation._id)
        : false;

    return (
        // Main container for the chat page layout
        <div className="flex h-full overflow-hidden relative">

            {/* Mobile Sidebar Toggle Button (visible only when sidebar is closed on mobile) */}
            {!isSidebarOpen && (
                 <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden fixed top-16 left-2 z-30 p-2 bg-accent-cyan text-navy rounded-full shadow-lg animate-pulse" // Pulse animation for visibility
                    aria-label="Open sidebar"
                >
                    {/* Menu Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            )}


            {/* Sidebar Wrapper (Handles mobile overlay and positioning) */}
            <div className={`
                fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out bg-gradient-to-b from-light-navy to-navy shadow-lg
                md:relative md:translate-x-0 md:z-auto md:inset-y-auto md:left-auto md:shadow-none md:border-r md:border-slate/40
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                w-full sm:w-80 md:w-1/3 lg:w-1/4 h-full flex-shrink-0
            `}>
                 {/* Close button inside Sidebar (visible on mobile when open) */}
                 {isSidebarOpen && (
                     <button
                         onClick={() => setIsSidebarOpen(false)}
                         className="md:hidden absolute top-4 right-4 z-50 p-1 text-slate hover:text-accent-cyan"
                         aria-label="Close sidebar"
                     >
                         {/* Close Icon */}
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                 )}

                 {/* Sidebar Component */}
                <Sidebar
                    conversations={conversations}
                    loadingConversations={loadingConversations}
                    conversationsError={conversationsError}
                    fetchConversations={fetchConversations} // Pass fetch function for retry button
                    onSelectConversation={handleSelectConversation} // Pass updated selection handler
                    selectedConversation={selectedConversation}
                    onlineUsers={onlineUsers} // Pass online users list
                />
            </div>

             {/* Mobile Overlay (visible when sidebar is open on mobile) */}
             {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/60 z-30" // Darker overlay
                    aria-hidden="true"
                ></div>
             )}


            {/* Chat Area */}
            <div className="flex-1 h-full">
                <ChatArea
                    // Use key to force re-mount/reset when conversation changes
                    key={selectedConversation?._id || 'no-chat-selected'}
                    selectedConversation={selectedConversation}
                    isSelectedUserOnline={isSelectedUserOnline}
                    onConversationDeleted={handleConversationDeleted}
                    onMessagesDeleted={handleMessagesDeleted} // Pass the new callback
                />
            </div>
        </div>
    );
};

export default ChatPage;