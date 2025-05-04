// src/components/ChatArea.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
// API এখন শুধু কনভারসেশন ও মাল্টিপল ডিলিটের জন্য লাগছে
import { getMessagesApi, deleteConversationApi, deleteMultipleMessagesApi } from '../api/messageApi';
import toast from 'react-hot-toast';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

// Props: selectedConversation, isSelectedUserOnline, onConversationDeleted, onMessagesDeleted
const ChatArea = ({ selectedConversation, isSelectedUserOnline, onConversationDeleted, onMessagesDeleted }) => {
    // ---- Hooks & State ----
    const { user: loggedInUser } = useAuth();
    const { socket } = useSocket();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState(null); // একক মেসেজ ডিলিটের লোডিং
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [isDeletingMultiple, setIsDeletingMultiple] = useState(false); // একাধিক মেসেজ ডিলিটের লোডিং

    // ---- Refs ----
    const messagesEndRef = useRef(null);
    const isFetching = useRef(false);
    const typingTimeoutRef = useRef(null);
    const chatAreaRef = useRef(null);

    // ---- Callback Refs & Memoized Functions ----
    const scrollToBottom = useCallback((behavior = "smooth") => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        });
    }, []);

    const markMessagesAsRead = useCallback((messagesToMark) => {
        if (!socket || !selectedConversation?._id || !Array.isArray(messagesToMark)) return;
        const unreadMessages = messagesToMark.filter(msg =>
            !msg.read && msg.sender?._id === selectedConversation._id
        );
        if (unreadMessages.length > 0) {
            console.log(`ChatArea: Emitting markAsRead for ${unreadMessages.length} messages.`);
            unreadMessages.forEach(msg => {
                socket.emit('markAsRead', {
                    messageId: msg._id,
                    senderId: msg.sender._id
                });
            });
            setMessages(prev => prev.map(msg =>
                unreadMessages.some(unread => unread._id === msg._id)
                    ? { ...msg, read: true }
                    : msg
            ));
        }
    }, [socket, selectedConversation]);


    // ---- useEffect: Fetch Initial Messages ----
    useEffect(() => {
        const fetchMessages = async () => {
            setMessages([]);
            setFetchError(null);
            setOtherUserTyping(false);
            setSelectionMode(false); // চ্যাট বদলালে সিলেকশন মোড বন্ধ
            setSelectedMessageIds([]);

            if (!selectedConversation?._id) return;
            if (isFetching.current) {
                console.log("ChatArea: Already fetching messages, skipping.");
                return;
            }
            isFetching.current = true;
            setLoadingMessages(true);
            try {
                const fetched = await getMessagesApi(selectedConversation._id);
                setMessages(fetched);
                markMessagesAsRead(fetched);
            } catch (error) {
                setFetchError("Couldn't load messages. Please try again later.");
                setMessages([]);
                 toast.error("Could not load messages.");
            } finally {
                setLoadingMessages(false);
                isFetching.current = false;
                 requestAnimationFrame(() => scrollToBottom('auto'));
            }
        };
        fetchMessages();
    }, [selectedConversation?._id, markMessagesAsRead, scrollToBottom]);


    // ---- useEffect: Socket Event Listeners Setup & Cleanup ----
    useEffect(() => {
        if (!socket || !loggedInUser?._id) {
            console.log(`ChatArea Listeners EFFECT: Waiting for socket (${!!socket}) and loggedInUser (${!!loggedInUser?._id}).`);
            return;
        }
        console.log(`%cChatArea Listeners EFFECT: RUNNING/RE-RUNNING. Socket: ${socket.id}, Selected Convo ID: ${selectedConversation?._id}`, 'color: green; font-weight: bold');

        // --- Define Handler for 'receiveMessage' ---
        const messageListener = (receivedMessage) => {
             if (!receivedMessage?._id || !receivedMessage?.sender?._id || !receivedMessage?.receiver || typeof receivedMessage.receiver !== 'string') {
                 console.warn("Socket <<< receiveMessage: Incomplete msg:", receivedMessage); return;
             }
            console.log(`%cSocket <<< receiveMessage: Received msg ${receivedMessage._id} from ${receivedMessage.sender.name}`, 'color: lightblue; font-weight: bold;', receivedMessage);

            const isFromOtherUserInCurrentChat = selectedConversation && receivedMessage.sender._id === selectedConversation._id && receivedMessage.receiver === loggedInUser._id;

            if (isFromOtherUserInCurrentChat) {
                console.log("   Action: ADDING message from other user to state.");
                setMessages(prev => {
                    if (prev.some(msg => msg._id === receivedMessage._id)) {
                        console.log(`   Action: Message ${receivedMessage._id} already exists. Skipping add.`); return prev;
                    }
                    console.log("   Action: Appending new message to list.");
                    return [...prev, receivedMessage];
                });
                markMessagesAsRead([receivedMessage]);
                scrollToBottom();
            } else {
                console.log("   Action: Message is for a different conversation. Ignored for direct display.");
                // Note: The unread count logic is now in ChatPage.jsx
            }
        };

        // --- Typing listeners ---
        const typingListener = ({ senderId }) => { if (selectedConversation && senderId === selectedConversation._id) setOtherUserTyping(true); };
        const stopTypingListener = ({ senderId }) => { if (selectedConversation && senderId === selectedConversation._id) setOtherUserTyping(false); };

        // --- messageRead listener ---
        const messageReadListener = ({ messageId, receiverId }) => {
             console.log(`%cSocket <<< messageRead: Received event for MsgID: ${messageId}, Read by: ${receiverId}`, 'color: yellow; font-weight: bold;');
             console.log(`   Current Selected Convo Partner ID: ${selectedConversation?._id}`);
             console.log(`   Logged In User ID: ${loggedInUser?._id}`);
            if (selectedConversation && receiverId === selectedConversation._id) {
                console.log("   Condition MET: Event is for the currently open chat.");
                 setMessages(prevMessages => {
                     const messageExists = prevMessages.some(msg => msg._id === messageId && msg.sender?._id === loggedInUser._id);
                     console.log(`   Checking state: Message ${messageId} exists and sent by me? ${messageExists}`);
                     if (!messageExists) {
                         console.warn(`   State Update SKIPPED: Message ${messageId} not found in current state or not sent by me.`);
                         return prevMessages;
                     }
                     return prevMessages.map(msg => {
                         if (msg._id === messageId && msg.sender?._id === loggedInUser._id) {
                            console.log(`   State Update APPLIED: Marking message ${messageId} as read.`);
                            return { ...msg, read: true };
                         }
                         return msg;
                     });
                 });
            } else {
                console.log("   Condition NOT MET: Event is for a different chat or no chat selected.");
            }
        };

        // --- messageSent listener (Confirmation for sender) ---
        const messageSentListener = (savedMessage) => {
             if (!savedMessage?._id) return;
             console.log('>>> Socket Event Received: messageSent (Confirming msg)', savedMessage);
             setMessages(prev => prev.map(msg => (msg.isOptimistic && msg.content === savedMessage.content && msg.sender._id === savedMessage.sender._id) ? savedMessage : msg));
        };

         // --- messageDeleted listener ---
        const messageDeletedListener = ({ messageId, deletedBy }) => {
             console.log(`%cSocket <<< messageDeleted: Received event for MsgID: ${messageId}, Deleted by: ${deletedBy}`, 'color: red; font-weight: bold;');
             setMessages(prevMessages => {
                 const messageExists = prevMessages.some(msg => msg._id === messageId);
                 if(messageExists){
                     console.log(`   State Update APPLIED: Removing message ${messageId} from UI.`);
                     return prevMessages.filter(msg => msg._id !== messageId);
                 } else {
                     console.warn(`   State Update SKIPPED: Message ${messageId} not found in current state for deletion.`);
                     return prevMessages;
                 }
             });
             // Inform ChatPage to potentially refresh sidebar
             if (onMessagesDeleted) onMessagesDeleted();
        };

        // --- deleteMessageError listener ---
        const deleteMessageErrorListener = ({ messageId, message }) => {
            console.error(`%cSocket <<< deleteMessageError: For MsgID: ${messageId}, Error: ${message}`, 'color: orange; font-weight: bold;');
            toast.error(`Failed to delete message: ${message}`);
            if(deletingMessageId === messageId){
                setDeletingMessageId(null); // Reset loading state on error
            }
        };


        // === Attach Listeners ===
        console.log("ChatArea Listeners EFFECT: Attaching all listeners...");
        socket.on('receiveMessage', messageListener);
        socket.on('typing', typingListener);
        socket.on('stop typing', stopTypingListener);
        socket.on('messageRead', messageReadListener);
        socket.on('messageSent', messageSentListener);
        socket.on('messageDeleted', messageDeletedListener); // Attach new listener
        socket.on('deleteMessageError', deleteMessageErrorListener); // Attach new listener

        // === Cleanup Function ===
        return () => {
            console.log(`%cChatArea Listeners EFFECT: CLEANING UP for socket ${socket.id}, prev convo ID: ${selectedConversation?._id}`, 'color: orange');
            socket.off('receiveMessage', messageListener);
            socket.off('typing', typingListener);
            socket.off('stop typing', stopTypingListener);
            socket.off('messageRead', messageReadListener);
            socket.off('messageSent', messageSentListener);
            socket.off('messageDeleted', messageDeletedListener); // Detach listener
            socket.off('deleteMessageError', deleteMessageErrorListener); // Detach listener
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setOtherUserTyping(false);
        };
    // === Dependencies ===
    // Ensure all relevant state and props are included
    }, [socket, selectedConversation?._id, loggedInUser?._id, scrollToBottom, markMessagesAsRead, onMessagesDeleted, deletingMessageId]);


    // ---- Handler: Send Message ----
    const handleSendMessage = (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || !selectedConversation?._id || !socket || !loggedInUser?._id) return;
        const optimisticMessage = {
            _id: `temp-${Date.now()}`,
            sender: { ...loggedInUser },
            receiver: selectedConversation._id,
            content: content,
            createdAt: new Date().toISOString(),
            read: false,
            isOptimistic: true
        };
        setMessages(prevMessages => [...prevMessages, optimisticMessage]);
        scrollToBottom('auto');
        socket.emit('sendMessage', { receiverId: selectedConversation._id, content });
        setNewMessage('');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTyping) { socket.emit('stop typing', { receiverId: selectedConversation._id }); setIsTyping(false); }
    };

    // ---- Handler: Typing Input Change & Indicator ----
    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !selectedConversation) return;
        if (!isTyping) { socket.emit('typing', { receiverId: selectedConversation._id }); setIsTyping(true); }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) { socket.emit('stop typing', { receiverId: selectedConversation._id }); setIsTyping(false); }
        }, 1500);
    };

    // ---- Handler: Delete Specific Message (Uses Socket) ---
    const handleDeleteSpecificMessage = (messageId) => { // async is no longer needed
        if (!messageId || deletingMessageId === messageId) return;
        if (!socket) return toast.error("Cannot delete message: Not connected.");

        // Optionally keep window.confirm
        if (window.confirm("Delete this message? This cannot be undone.")) {
             console.log(`Emitting 'deleteThisMessage' for MsgID: ${messageId}`);
             setDeletingMessageId(messageId); // Set loading state for UI feedback
             socket.emit('deleteThisMessage', { messageId });
             // Success/Error handling is now done by the socket listeners ('messageDeleted', 'deleteMessageError')
        }
    };

    // ---- Handler: Delete Multiple Messages (Uses API) ----
    const handleDeleteMultiple = async () => {
        if (selectedMessageIds.length === 0) {
            return toast.error("Please select messages to delete.");
        }
        if (window.confirm(`Delete ${selectedMessageIds.length} selected message(s)? This cannot be undone.`)) {
            setIsDeletingMultiple(true);
            const toastId = toast.loading(`Deleting ${selectedMessageIds.length} message(s)...`);
            try {
                const result = await deleteMultipleMessagesApi(selectedMessageIds); // Still uses API
                console.log(`Deleted ${result.deletedCount} messages.`);
                setMessages(prevMessages =>
                    prevMessages.filter(msg => !selectedMessageIds.includes(msg._id))
                );
                toast.success(`${result.deletedCount} message(s) deleted.`, { id: toastId });
                if (onMessagesDeleted) onMessagesDeleted();
                setSelectionMode(false);
                setSelectedMessageIds([]);
            } catch (error) {
                console.error("Failed to delete multiple messages:", error);
                toast.error(error.message || 'Could not delete messages.', { id: toastId });
            } finally {
                setIsDeletingMultiple(false);
            }
        }
    };

    // ---- Handler: Delete Entire Conversation (Uses API) ----
    const handleDeleteConversation = async () => {
        if (!selectedConversation?._id) return;
        if (window.confirm(`DELETE CONVERSATION?\n\nDelete chat history with ${selectedConversation.name}?`)) {
            const toastId = toast.loading('Deleting conversation...');
            try {
                await deleteConversationApi(selectedConversation._id);
                setMessages([]); // Clear messages locally
                toast.success('Conversation deleted.', { id: toastId });
                if (onConversationDeleted) onConversationDeleted(selectedConversation._id); // Notify parent
            } catch (error) {
                 console.error("Failed to delete conversation:", error);
                 toast.error(error.message || "Could not delete conversation.", { id: toastId });
            }
        }
    };

    // ---- Handler: Toggle Selection Mode ----
    const toggleSelectionMode = useCallback(() => {
        setSelectionMode(prev => !prev);
        setSelectedMessageIds([]);
        setIsDeletingMultiple(false);
    }, []);

    // ---- Handler: Checkbox Change ----
    const handleCheckboxChange = useCallback((messageId) => {
        setSelectedMessageIds(prevSelectedIds => {
            if (prevSelectedIds.includes(messageId)) {
                return prevSelectedIds.filter(id => id !== messageId);
            } else {
                return [...prevSelectedIds, messageId];
            }
        });
    }, []);


    // ---- ===== RETURN: RENDER LOGIC ===== ----

    if (!selectedConversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-navy to-light-navy h-full">
                <div className="text-center p-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate opacity-50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    <p className="text-slate text-lg">Select a conversation</p>
                    <p className="text-sm text-light-slate">Choose someone from the list to start chatting.</p>
                </div>
            </div>
        );
    }

    return (
        <SkeletonTheme baseColor="#112240" highlightColor="#233554">
            <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-navy via-[#0f2445] to-light-navy">

                {/* ===== Chat Header ===== */}
                <div className="bg-light-navy/90 backdrop-blur-sm p-3 border-b border-slate/40 flex-shrink-0 shadow-md flex items-center justify-between space-x-3">
                    {/* Left: Avatar, Name, Status */}
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-purple to-light-purple flex items-center justify-center text-xl font-bold text-white shadow-md">
                                {selectedConversation.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-light-navy ring-1 ring-offset-1 ring-offset-light-navy ${isSelectedUserOnline ? 'bg-green-400 ring-green-400 animate-pulse' : 'bg-slate ring-slate'}`} title={isSelectedUserOnline ? 'Online' : 'Offline'}></span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-md text-lightest-slate font-semibold truncate">
                                {selectedConversation.name}
                            </h2>
                            <div className="h-4 relative overflow-hidden text-xs">
                                <p className={`absolute inset-0 transition-all duration-300 ease-in-out ${otherUserTyping ? 'opacity-100 translate-y-0 text-accent-cyan italic' : 'opacity-0 -translate-y-full'}`}>
                                    typing...
                                </p>
                                <p className={`absolute inset-0 transition-all duration-300 ease-in-out ${!otherUserTyping ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'} ${isSelectedUserOnline ? 'text-green-400' : 'text-slate'}`}>
                                    {isSelectedUserOnline ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Right: Buttons */}
                    <div className="flex items-center space-x-2">
                        {/* Cancel Selection */}
                        {selectionMode && (
                            <button onClick={toggleSelectionMode} className="p-2 text-slate hover:text-white rounded-full transition duration-150 focus:outline-none focus:ring-2 focus:ring-slate" title="Cancel Selection" aria-label="Cancel Selection" disabled={isDeletingMultiple} >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>
                            </button>
                        )}
                        {/* Delete Selected */}
                        {selectionMode && selectedMessageIds.length > 0 && (
                             <button onClick={handleDeleteMultiple} disabled={isDeletingMultiple} className={`p-2 rounded-full transition duration-150 ${ isDeletingMultiple ? 'text-gray-500 cursor-not-allowed' : 'text-slate hover:text-red-500 focus:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500' }`} title={`Delete ${selectedMessageIds.length} message(s)`} aria-label="Delete selected messages">
                                {isDeletingMultiple ? ( <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-500"></div> ) : ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> </svg> )}
                            </button>
                        )}
                        {/* Select Messages */}
                        {!selectionMode && messages.length > 0 && (
                            <button onClick={toggleSelectionMode} className="p-2 text-slate hover:text-accent-cyan rounded-full transition duration-150 focus:outline-none focus:ring-2 focus:ring-accent-cyan" title="Select Messages" aria-label="Select messages to delete">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> </svg>
                            </button>
                        )}
                         {/* Delete Conversation */}
                        {!selectionMode && (
                            <button onClick={handleDeleteConversation} className="p-2 text-slate hover:text-red-500 rounded-full transition duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50" title="Delete Conversation" aria-label="Delete Conversation">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* ===== Message Display Area ===== */}
                <div ref={chatAreaRef} className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate scrollbar-track-transparent">
                    {/* Skeleton Loading */}
                    {loadingMessages && (
                        <div className="space-y-3">
                            <div className="flex justify-start"> <Skeleton height={40} width="60%" borderRadius="0.75rem" /> </div>
                            <div className="flex justify-end">   <Skeleton height={50} width="50%" borderRadius="0.75rem" /> </div>
                            <div className="flex justify-start"> <Skeleton height={35} width="70%" borderRadius="0.75rem" /> </div>
                            <div className="flex justify-end">   <Skeleton height={45} width="65%" borderRadius="0.75rem" /> </div>
                        </div>
                    )}
                    {/* Error Message */}
                    {fetchError && !loadingMessages && <p className="text-center text-red-500 text-sm py-4">{fetchError}</p>}
                    {/* No Messages Info */}
                    {!loadingMessages && messages.length === 0 && !fetchError && ( <p className="text-center text-slate text-sm py-4">No messages yet. Be the first to say hi!</p> )}

                    {/* Render Messages */}
                    {!loadingMessages && messages.map((msg) => {
                        if (!msg?._id || !msg?.sender?._id || !msg?.createdAt) {
                            console.warn("Skipping rendering incomplete message object:", msg); return null;
                        }
                        const isSender = msg.sender._id === loggedInUser._id;
                        const messageTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                        const isDeletingThisMessage = deletingMessageId === msg._id;
                        const isSelected = selectedMessageIds.includes(msg._id);

                        return (
                            <div key={msg._id} className={`flex items-center gap-2 ${isSender ? 'justify-end' : 'justify-start'} group animate-fade-in transition-opacity duration-300 ${ isDeletingThisMessage ? 'opacity-50 pointer-events-none' : '' } ${selectionMode ? 'cursor-pointer' : ''}`} onClick={selectionMode ? () => handleCheckboxChange(msg._id) : undefined} >
                                {/* Checkbox */}
                                {selectionMode && ( <input type="checkbox" checked={isSelected} onChange={() => handleCheckboxChange(msg._id)} onClick={(e) => e.stopPropagation()} className={`form-checkbox h-4 w-4 rounded text-accent-cyan bg-navy border-slate focus:ring-accent-cyan focus:ring-offset-0 ${isSender ? 'order-last ml-2' : 'order-first mr-2'}`} aria-label={`Select message ${msg._id}`} /> )}
                                {/* Message Bubble */}
                                <div className={`relative px-3 py-2 rounded-xl max-w-[75%] shadow-md transition-all duration-200 ${ isSender ? 'bg-gradient-to-br from-primary-purple to-indigo-600 text-white rounded-br-sm' : 'bg-lightest-navy text-lightest-slate rounded-bl-sm' } ${isSelected ? 'ring-2 ring-offset-2 ring-offset-navy ring-accent-cyan' : ''} ${isDeletingMultiple && isSelected ? 'opacity-60' : ''}` }>
                                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                                    <div className={`text-[10px] mt-1.5 flex items-center ${isSender ? 'text-purple-200 justify-end' : 'text-slate justify-end'}`}>
                                        <span>{messageTime}</span>
                                        {isSender && (
                                            <span className="ml-1 w-4 h-4 inline-block" title={msg.read ? 'Seen' : 'Delivered'}>
                                                {msg.read ? ( // Double tick (Seen)
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-full h-full text-accent-cyan"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0zm-4.95 2.121a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L7 10.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                ) : msg.isOptimistic ? ( // Hourglass (Optimistic/Sending)
                                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full text-slate animate-pulse"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                ) : ( // Single tick (Sent/Delivered)
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-full h-full text-slate"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                     {/* Single Delete Button */}
                                    {isSender && !selectionMode && !isDeletingThisMessage && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSpecificMessage(msg._id); }} className="absolute -top-2 -left-6 p-1 text-slate opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 rounded-full hover:bg-navy focus:outline-none focus:ring-1 focus:ring-red-500" title="Delete message" aria-label="Delete message" >
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                     {/* Single Delete Spinner */}
                                     {isSender && !selectionMode && isDeletingThisMessage && (
                                         <div className="absolute -top-2 -left-6 p-1"> <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500"></div> </div>
                                     )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} style={{ height: '1px' }} />
                </div>

                {/* ===== Message Input Area ===== */}
                 {!selectionMode ? (
                     <div className="bg-light-navy p-3 border-t border-slate/40 flex-shrink-0 shadow-inner">
                         <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                            <input type="text" placeholder="Type a message..." value={newMessage} onChange={handleTyping} className="flex-1 px-4 py-2 bg-navy border border-slate/40 rounded-full text-lightest-slate placeholder-slate focus:outline-none focus:ring-1 focus:ring-accent-cyan transition" autoComplete="off" aria-label="Message input" />
                            <button type="submit" disabled={!newMessage.trim()} className={`p-2 rounded-full transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2 focus:ring-offset-light-navy ${ newMessage.trim() ? 'bg-accent-cyan hover:bg-opacity-80 text-navy' : 'bg-slate text-gray-500 cursor-not-allowed' }`} aria-label="Send message">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 16.571V11.5a1 1 0 112 0v5.071a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /> </svg>
                            </button>
                         </form>
                     </div>
                ) : (
                     <div className="bg-light-navy p-3 border-t border-slate/40 flex-shrink-0 shadow-inner text-center">
                         <p className="text-sm text-accent-cyan"> {selectedMessageIds.length} message(s) selected </p>
                     </div>
                )}
            </div>
         </SkeletonTheme>
    );
};

export default ChatArea;