// src/pages/AboutPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { deleteUserAccountApi } from '../api/userApi';
import toast from 'react-hot-toast'; 

const AboutPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate(); 
    const [isDeleting, setIsDeleting] = useState(false); 
    const [deleteError, setDeleteError] = useState(null);

    const handleDeleteAccount = async () => {
        if (window.confirm("⚠️ Are you absolutely sure you want to delete your account?\n\nThis action cannot be undone. All your data will be permanently lost.")) {
            setIsDeleting(true);
            setDeleteError(null); 
            const toastId = toast.loading('Deleting account...'); 

            try {
                const result = await deleteUserAccountApi();
                console.log(result.message); 
                toast.success("Account deleted successfully!", { id: toastId }); 
                logout();
            } catch (error) {
                console.error("Failed to delete account:", error);
                const errorMsg = error.message || "Could not delete account. Please try again.";
                setDeleteError(errorMsg); 
                toast.error(errorMsg); 
                toast.dismiss(toastId); 
                setIsDeleting(false); 
            }
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto mt-10 mb-10 bg-gradient-to-br from-navy via-light-navy to-primary-purple rounded-lg shadow-xl border border-slate/30 flex flex-col">

            <div className="flex-grow">
                <h1 className="text-3xl text-accent-cyan mb-6 text-center font-bold">About Me</h1>

                {user ? (
                    <div className="space-y-4 text-lightest-slate mb-8">
                        <p><strong className="text-slate w-20 inline-block">Name:</strong> {user.name}</p>
                        <p><strong className="text-slate w-20 inline-block">Username:</strong> {user.username}</p>
                        <p><strong className="text-slate w-20 inline-block">User ID:</strong> {user.userId}</p>
                        <p><strong className="text-slate w-20 inline-block">Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                ) : (
                     <p className="text-center text-slate">Loading user data...</p>
                )}

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="mb-4 w-full bg-lightest-navy hover:bg-opacity-80 text-accent-cyan font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out border border-accent-cyan/50"
                >
                    Logout
                </button>

                <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting} 
                    className={`w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out ${
                        isDeleting ? 'opacity-50 cursor-not-allowed' : '' 
                    }`}
                >
                    {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
                </button>

                {deleteError && (
                    <p className="text-red-400 text-sm text-center mt-4">{deleteError}</p>
                )}
            </div> 

            <p className="text-center text-xs text-slate pt-6 pb-2"> 
                Created by @tashrifmiyaji
            </p>
        </div> // --- End of card div ---
    );
};

export default AboutPage;