// src/components/Sidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { searchUsersApi } from '../api/userApi';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'; // Skeleton ইম্পোর্ট

// Debounce function helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Props received from ChatPage
const Sidebar = ({
    conversations,
    loadingConversations,
    conversationsError,
    fetchConversations, // For retry button
    onSelectConversation,
    selectedConversation,
    onlineUsers // List of online user IDs
}) => {
    // State for search functionality
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (term) => {
            if (term.trim() === '') {
                setSearchResults([]);
                setLoadingSearch(false);
                setSearchError(null);
                return;
            }
            setLoadingSearch(true);
            setSearchError(null);
            try {
                const results = await searchUsersApi(term);
                setSearchResults(Array.isArray(results) ? results : []);
            } catch (err) {
                setSearchError('Failed to search users.');
                setSearchResults([]);
            } finally {
                setLoadingSearch(false);
            }
        }, 500), // 500ms debounce delay
        [] // No dependencies, function is stable
    );

    // Effect to trigger search when searchTerm changes
    useEffect(() => {
        debouncedSearch(searchTerm);
    }, [searchTerm, debouncedSearch]);

    // Handles selecting a user (either from search or recent chats)
    const handleSelectUser = (userOrParticipant) => {
        setSearchTerm(''); // Clear search input
        setSearchResults([]); // Clear search results display
        if (userOrParticipant?._id && userOrParticipant?.name) {
            onSelectConversation(userOrParticipant); // Notify ChatPage
        } else {
            console.error("Sidebar: Invalid user/participant object:", userOrParticipant);
        }
    };

    // Get the ID of the currently selected conversation for highlighting
    const selectedConvId = selectedConversation?._id;

    return (
        // Using SkeletonTheme for consistent skeleton colors
        <SkeletonTheme baseColor="#112240" highlightColor="#233554">
            {/* Main sidebar container - No background/border needed here */}
            <div className="w-full h-full flex flex-col">

                {/* Sidebar Header */}
                <div className="p-4 border-b border-slate/30 flex-shrink-0">
                    <h2 className="text-xl text-accent-cyan font-semibold">Chats</h2>
                </div>

                {/* Search Input */}
                <div className="p-3 flex-shrink-0">
                    <input
                        type="text"
                        placeholder="Search or start new chat"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-navy border border-slate/40 rounded-full text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition"
                        aria-label="Search users"
                    />
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate scrollbar-track-transparent">

                    {/* --- Search Results Section --- */}
                    {/* Show loading/error specific to search */}
                    {loadingSearch && <p className="text-center text-slate p-4 text-sm">Searching...</p>}
                    {searchError && <p className="text-center text-red-500 p-4 text-sm">{searchError}</p>}

                    {/* Display Search Results (only if search term exists and not loading) */}
                    {searchTerm.trim() !== '' && !loadingSearch && (
                        <div className="border-t border-slate/30 pt-2">
                            <h3 className="px-4 py-1 text-xs text-slate font-semibold uppercase tracking-wider">Search Results</h3>
                            {searchResults.length > 0 ? (
                                <ul className="space-y-0.5 p-2">
                                    {searchResults.map(userResult => {
                                        if (!userResult?._id) return null;
                                        const isOnline = onlineUsers.includes(userResult._id);
                                        return (
                                            <li
                                                key={userResult._id}
                                                onClick={() => handleSelectUser(userResult)}
                                                role="button"
                                                className={`p-3 rounded-lg hover:bg-lightest-navy cursor-pointer flex items-center justify-between transition group ${
                                                    selectedConvId === userResult._id ? 'bg-lightest-navy shadow-inner' : '' // Highlight selected
                                                }`}
                                            >
                                                {/* User info with online status dot */}
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <span className={`flex-shrink-0 h-2.5 w-2.5 rounded-full border-2 border-light-navy ring-1 ring-offset-1 ring-offset-light-navy ${
                                                        isOnline ? 'bg-green-400 ring-green-400 animate-pulse-subtle' : 'bg-slate ring-slate' // Subtle pulse for online
                                                    }`}></span>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm text-lightest-slate group-hover:text-accent-cyan truncate font-medium">{userResult.name}</p>
                                                        <p className="text-xs text-slate truncate">ID: {userResult.userId}</p>
                                                    </div>
                                                </div>
                                                {/* Arrow icon */}
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate group-hover:text-accent-cyan flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-center text-slate p-4 text-sm">No users found matching "{searchTerm}".</p>
                            )}
                        </div>
                    )}

                    {/* --- Recent Conversations Section (only shown if search is not active) --- */}
                    {searchTerm.trim() === '' && (
                        <div className="border-t border-slate/30 pt-2">
                            <h3 className="px-4 py-1 text-xs text-slate font-semibold uppercase tracking-wider">Recent Chats</h3>

                            {/* Skeleton Loading for Conversations */}
                            {loadingConversations && (
                                <ul className="space-y-0.5 p-2">
                                    {[...Array(5)].map((_, index) => ( // Show 5 skeleton items
                                        <li key={index} className="p-3 flex items-center space-x-3">
                                            <Skeleton circle height={36} width={36} />
                                            <div className="flex-1">
                                                <Skeleton height={14} width="60%" />
                                                <Skeleton height={10} width="80%" />
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                                 <Skeleton height={10} width="40px" />
                                                 <Skeleton height={18} width={18} circle />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Error Display with Retry Button */}
                            {conversationsError && !loadingConversations && (
                                <div className="p-4 m-2 bg-red-900/50 border border-red-700 rounded-lg text-center">
                                     <p className="text-red-300 text-sm mb-2">{conversationsError}</p>
                                     {/* Retry button calls fetchConversations passed from ChatPage */}
                                     <button
                                         onClick={fetchConversations}
                                         className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                     >
                                         Retry
                                     </button>
                                </div>
                            )}

                            {/* Conversation List */}
                            {!loadingConversations && conversations.length > 0 && !conversationsError && (
                                <ul className="space-y-0.5 p-2">
                                    {conversations.map(convo => {
                                        const participant = convo.participant;
                                        if (!participant?._id || !convo?.lastMessage || typeof convo?.unreadCount === 'undefined') {
                                            console.warn("Sidebar: Skipping rendering incomplete conversation object:", convo);
                                            return null;
                                        }
                                        const isOnline = onlineUsers.includes(participant._id);
                                        const lastMessageText = convo.lastMessage.content || '...';
                                        const lastMessageTime = convo.lastMessage.createdAt
                                            ? new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                                            : '';
                                        const unreadCount = convo.unreadCount;

                                        return (
                                            <li
                                                key={participant._id}
                                                onClick={() => handleSelectUser(participant)}
                                                role="button"
                                                className={`p-3 rounded-lg hover:bg-lightest-navy cursor-pointer flex items-center justify-between transition group ${
                                                    selectedConvId === participant._id ? 'bg-lightest-navy shadow-inner' : '' // Highlight selected
                                                }`}
                                            >
                                                {/* Left Side: Avatar, Name, Last Message */}
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-purple to-light-purple flex items-center justify-center text-sm font-bold text-white shadow-md">
                                                            {participant.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        {/* Online status indicator */}
                                                        <span className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border-2 border-navy ring-1 ring-offset-1 ring-offset-navy ${
                                                             isOnline ? 'bg-green-400 ring-green-400 animate-pulse-subtle' : 'bg-slate ring-slate'
                                                        }`}></span>
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm text-lightest-slate group-hover:text-accent-cyan truncate font-medium">{participant.name}</p>
                                                        {/* Highlight last message if unread */}
                                                        <p className={`text-xs truncate ${unreadCount > 0 ? 'text-lightest-slate font-semibold' : 'text-slate'}`}>
                                                            {lastMessageText}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Right Side: Time and Unread Count Badge */}
                                                <div className="flex flex-col items-end flex-shrink-0 ml-2 space-y-1">
                                                    <span className="text-[10px] text-slate">{lastMessageTime}</span>
                                                    {/* Unread Count Badge */}
                                                    {unreadCount > 0 && (
                                                        <span
                                                            className="bg-accent-cyan text-navy text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none flex items-center justify-center min-w-[18px] h-[18px]"
                                                            title={`${unreadCount} unread message(s)`}
                                                            aria-label={`${unreadCount} unread messages`}
                                                        >
                                                            {unreadCount > 9 ? '9+' : unreadCount} {/* Show 9+ if count is high */}
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {/* No Recent Chats Message */}
                            {!loadingConversations && conversations.length === 0 && !conversationsError && (
                                <p className="text-center text-slate p-4 text-sm">No recent chats found. Search for users to start a conversation!</p>
                            )}
                        </div>
                    )}
                </div> {/* End Scrollable Area */}
            </div> {/* End Sidebar Container */}
         </SkeletonTheme>
    );
};

export default Sidebar;