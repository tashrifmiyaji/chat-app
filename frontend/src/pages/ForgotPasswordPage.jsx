// frontend/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { verifyUserForResetApi, resetPasswordApi } from '../api/authApi';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
    const [step, setStep] = useState(1); // 1: Verify User, 2: Reset Password, 3: Success
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState('');
    const [mongoUserId, setMongoUserId] = useState(null); // To store verified MongoDB ID
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // Local error state for this page
    const [successMessage, setSuccessMessage] = useState(null);

    // Handler for Step 1: Verify User
    const handleVerifyUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null); // Clear previous success message
        const toastId = toast.loading('Verifying user...');

        try {
            // Call the verification API
            const data = await verifyUserForResetApi(username, userId);

            // Check for successful verification and presence of mongoUserId
            if (data.success && data.mongoUserId) {
                setMongoUserId(data.mongoUserId); // Store the ID for the next step
                setStep(2); // Move to the password reset form
                toast.success('User verified!', { id: toastId });
            } else {
                // If API returns success: false or mongoUserId is missing (should not happen with current backend)
                throw new Error(data.message || 'Verification process failed.');
            }
        } catch (err) {
            // Handle errors thrown by API call (e.g., 404 Not Found, 500 Server Error)
            console.error("Verification failed:", err);
            const errorMsg = err.message || 'User not found or verification failed.';
            setError(errorMsg); // Set local error state
            toast.error(errorMsg, { id: toastId }); // Display toast error
        } finally {
            setLoading(false); // Stop loading indicator
        }
    };

    // Handler for Step 2: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors
        setSuccessMessage(null);

        // --- Frontend Validation ---
        if (!newPassword || !confirmNewPassword) {
            toast.error('Please enter and confirm your new password.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error('New passwords do not match.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Resetting password...');

        try {
            // Ensure we have the mongoUserId from the verification step
            if (!mongoUserId) {
                throw new Error("Verification step was not completed or failed.");
            }

            // Call the password reset API
            const data = await resetPasswordApi(mongoUserId, newPassword);
            setSuccessMessage(data.message || 'Password reset successfully!'); // Set success message state
            toast.success('Password reset successfully!', { id: toastId }); // Show success toast
            setStep(3); // Move to the success display step

        } catch (err) {
            // Handle errors from the reset API call
            console.error("Password reset failed:", err);
             const errorMsg = err.message || 'Failed to reset password.';
            setError(errorMsg); // Set local error state
            toast.error(errorMsg, { id: toastId }); // Display toast error
        } finally {
            setLoading(false); // Stop loading indicator
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-navy via-light-navy to-primary-purple p-4 relative">
            <div className="w-full max-w-md bg-light-navy rounded-lg shadow-xl p-8 border border-slate/20 relative pb-16">
                <h1 className="text-3xl text-accent-cyan mb-6 text-center font-bold">Reset Password</h1>

                {/* --- Step 1: Verify User Form --- */}
                {step === 1 && (
                    <form onSubmit={handleVerifyUser} className="space-y-5">
                        <p className="text-sm text-lightest-slate text-center mb-4">
                            Enter your Username and User ID to verify your account.
                        </p>
                        {/* Username Input */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-lightest-slate mb-1">Username</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                                placeholder="Your username"
                                disabled={loading} // Disable while loading
                            />
                        </div>
                        {/* User ID Input */}
                        <div>
                            <label htmlFor="userId" className="block text-sm font-medium text-lightest-slate mb-1">User ID (7 Digits)</label>
                            <input
                                type="text" // Use text for easier input, backend validates
                                id="userId"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                                maxLength="7" // Limit input length
                                pattern="\d{7}" // Basic pattern validation (optional)
                                title="Please enter exactly 7 digits" // Tooltip
                                className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                                placeholder="Your 7-digit user ID"
                                disabled={loading} // Disable while loading
                            />
                        </div>
                        {/* Local error display (optional, as toasts are used) */}
                        {/* {error && <p className="text-red-400 text-sm text-center">{error}</p>} */}
                        {/* Submit Button */}
                        <div>
                            <button type="submit" disabled={loading} className={`w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out ${loading ? 'bg-slate cursor-not-allowed text-gray-400' : 'bg-accent-cyan hover:bg-opacity-80 text-navy'}`}>
                                {loading ? 'Verifying...' : 'Verify Account'}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- Step 2: Reset Password Form --- */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                         <p className="text-sm text-lightest-slate text-center mb-4">
                            Enter and confirm your new password for user: <strong className="text-accent-cyan">{username}</strong> (ID: {userId})
                        </p>
                        {/* New Password Input */}
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-lightest-slate mb-1">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength="6"
                                className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                                placeholder="Enter new password (min. 6)"
                                disabled={loading} // Disable while loading
                            />
                        </div>
                        {/* Confirm New Password Input */}
                        <div>
                            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-lightest-slate mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmNewPassword"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                                minLength="6"
                                className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                                placeholder="Re-enter new password"
                                disabled={loading} // Disable while loading
                            />
                        </div>
                         {/* Local error display (optional, as toasts are used) */}
                         {/* {error && <p className="text-red-400 text-sm text-center">{error}</p>} */}
                         {/* Submit Button */}
                        <div>
                            <button type="submit" disabled={loading} className={`w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out ${loading ? 'bg-slate cursor-not-allowed text-gray-400' : 'bg-accent-cyan hover:bg-opacity-80 text-navy'}`}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                )}

                 {/* --- Step 3: Success Message --- */}
                 {step === 3 && successMessage && (
                    <div className="text-center space-y-4">
                         <p className="text-green-400">{successMessage}</p>
                         <Link
                            to="/login"
                            className="inline-block px-6 py-2 bg-accent-cyan text-navy font-bold rounded hover:bg-opacity-80 transition duration-150"
                         >
                            Go to Login
                         </Link>
                    </div>
                 )}


                {/* --- Back to Login Link (shown during step 1 or 2) --- */}
                {step !== 3 && (
                     <p className="mt-6 text-center text-sm text-slate">
                        Remembered your password?{' '}
                        <Link to="/login" className="font-medium text-accent-cyan hover:text-opacity-80">
                            Login
                        </Link>
                    </p>
                )}

                {/* --- Credit Line --- */}
                <p className="text-center text-xs text-slate mt-10 absolute bottom-4 left-0 right-0">
                    Created by @tashrifmiyaji
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;