// frontend/src/pages/SignupPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast'; // Ensure toast is imported

const SignupPage = () => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    // --- New State: Confirm Password ---
    const [confirmPassword, setConfirmPassword] = useState('');
    const { signup, loading, error, setError, user } = useAuth();
    const navigate = useNavigate();

     // Redirect if user is already logged in
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

     // Clear errors when component mounts or inputs change
     useEffect(() => {
        setError(null); // Clear context error state
    }, [setError, name, username, password, confirmPassword]); // Added confirmPassword

    const handleSubmit = async (e) => {
        e.preventDefault();
         setError(null); // Clear previous errors on new submit

        // --- Frontend Validation ---
        if (!name || !username || !password || !confirmPassword) { // Check confirmPassword field
             setError("Please fill in all fields."); // Set context error (optional)
             toast.error("Please fill in all fields."); // Show toast error
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long."); // Set context error (optional)
             toast.error("Password must be at least 6 characters long."); // Show toast error
            return;
        }
        // --- New Check: Password Matching ---
        if (password !== confirmPassword) {
            setError("Passwords do not match."); // Set context error (optional)
             toast.error("Passwords do not match."); // Show toast error
            return;
        }
        // Optional: Add username validation (e.g., no spaces) here if needed

        // Call signup function (from useAuth context)
        // It will handle API call, state update, and redirection
        await signup(name, username, password); // Only send name, username, password
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-navy via-light-navy to-primary-purple p-4 relative">
            <div className="w-full max-w-md bg-light-navy rounded-lg shadow-xl p-8 border border-slate/20 relative pb-16">
                <h1 className="text-3xl text-accent-cyan mb-6 text-center font-bold">Create Your Account</h1>

                <form onSubmit={handleSubmit} className="space-y-5"> {/* Adjusted spacing */}
                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-lightest-slate mb-1">
                            Display Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Enter your display name"
                        />
                    </div>
                     {/* Username Input */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-lightest-slate mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Choose a unique username (e.g., john_doe)"
                        />
                    </div>
                    {/* Password Input */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-lightest-slate mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="6"
                            className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Create a password (min. 6 characters)"
                        />
                    </div>

                    {/* --- New: Confirm Password Input --- */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-lightest-slate mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength="6" // Same minLength as password
                            className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Re-enter your password"
                        />
                    </div>

                     {/* Error display (optional, as toasts are used) */}
                     {/* {error && ( <p className="text-red-400 text-sm text-center">{error}</p> )} */}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                             className={`w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out ${
                                loading
                                ? 'bg-slate cursor-not-allowed text-gray-400' // Adjusted disabled style
                                : 'bg-accent-cyan hover:bg-opacity-80 text-navy'
                            }`}
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </div>
                </form>

                <p className="mt-6 text-center text-sm text-slate">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-accent-cyan hover:text-opacity-80">
                        Login
                    </Link>
                </p>
                 <p className="text-center text-xs text-slate mt-10 absolute bottom-4 left-0 right-0">
                     Created by @tashrifmiyaji
                 </p>
            </div>
        </div>
    );
};
export default SignupPage;