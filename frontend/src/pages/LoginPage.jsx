// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast'; // Ensure toast is imported

const LoginPage = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error, setError, user } = useAuth(); // Get needed values/functions
    const navigate = useNavigate();

    // Redirect if user is already logged in
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Clear errors when component mounts or identifier/password changes
     useEffect(() => {
        setError(null); // Clear context error state
    }, [setError, identifier, password]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors on new submit
        if (!identifier || !password) {
            setError("Please enter both identifier and password."); // Set context error (optional)
            toast.error("Please enter both identifier and password."); // Show toast error
            return;
        }
        // Call login function (from useAuth context)
        // It will handle API call, state update, and redirection
        await login(identifier, password);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-navy via-light-navy to-primary-purple p-4 relative">
            <div className="w-full max-w-md bg-light-navy rounded-lg shadow-xl p-8 border border-slate/20 relative pb-16">
                <h1 className="text-3xl text-accent-cyan mb-6 text-center font-bold">Welcome Back!</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Identifier Input */}
                    <div>
                        <label htmlFor="identifier" className="block text-sm font-medium text-lightest-slate mb-1">
                            User ID or Username
                        </label>
                        <input
                            type="text"
                            id="identifier"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Enter your User ID or Username"
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
                            className="w-full px-3 py-2 bg-navy border border-slate/30 rounded-md text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Enter your password"
                        />
                         {/* --- New: Forgot Password Link --- */}
                         <div className="text-right mt-1">
                             <Link
                                to="/forgot-password" // Link to the new route
                                className="text-xs font-medium text-accent-cyan hover:text-opacity-80"
                             >
                                Forgot Password?
                            </Link>
                         </div>
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
                            {loading ? 'Logging In...' : 'Login'}
                        </button>
                    </div>
                </form>

                <p className="mt-6 text-center text-sm text-slate">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-medium text-accent-cyan hover:text-opacity-80">
                        Sign Up
                    </Link>
                </p>
                 <p className="text-center text-xs text-slate mt-10 absolute bottom-4 left-0 right-0">
                     Created by @tashrifmiyaji
                 </p>
            </div>
        </div>
    );
};
export default LoginPage;