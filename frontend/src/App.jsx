// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Outlet, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';
import AboutPage from './pages/AboutPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; // <-- Import the new page
import { useAuth } from './hooks/useAuth';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth(); // Get user and loading state from context

    if (loading) {
        // Show a loading indicator while checking auth status
        return (
            <div className="flex justify-center items-center min-h-screen bg-navy">
                 <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-accent-cyan"></div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login if not authenticated and finished loading
        return <Navigate to="/login" replace />;
    }

    // If authenticated, render the requested component or nested routes
    return children ? children : <Outlet />;
};

// App Layout Component
const AppLayout = () => {
    const { user, logout } = useAuth(); // Get user info

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-navy to-light-navy">
            {/* --- Header --- */}
            <header className="bg-light-navy/80 backdrop-blur-sm p-3 shadow-lg border-b border-slate/30 sticky top-0 z-20">
                <div className="container mx-auto flex justify-between items-center px-2 sm:px-0">
                    <Link to="/" className="text-xl font-bold text-accent-cyan">
                        ChatApp
                    </Link>
                     {user && (
                         <div className="flex items-center space-x-2 sm:space-x-4">
                             <span className="hidden md:inline text-lightest-slate text-sm">
                                 Welcome, <strong className="text-accent-cyan">{user.name}</strong>!
                             </span>
                             <Link
                                 to="/about"
                                 className="text-slate hover:text-accent-cyan transition duration-150 p-1 rounded-full hover:bg-navy/50"
                                 title="About Me"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                 </svg>
                             </Link>
                              <button
                                 onClick={logout}
                                 className="text-slate hover:text-red-500 transition duration-150 p-1 rounded-full hover:bg-navy/50"
                                 title="Logout"
                              >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                   </svg>
                              </button>
                         </div>
                     )}
                </div>
            </header>
            {/* --- Main Content --- */}
            <main className="flex-1 overflow-hidden">
                <Outlet /> {/* Nested protected routes render here */}
            </main>
        </div>
    );
};

// Main App Component
function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} /> {/* <-- Add the new route */}

      {/* Protected Routes */}
       <Route element={<ProtectedRoute />}> {/* Wrap protected routes */}
             <Route element={<AppLayout />}> {/* Use the layout for protected pages */}
                 <Route path="/" element={<ChatPage />} />
                <Route path="/about" element={<AboutPage />} />
                {/* Add other protected routes inside AppLayout if needed */}
             </Route>
       </Route>

       {/* Fallback for unknown routes */}
       <Route path="*" element={<Navigate to="/" />} /> {/* Redirect unknown paths to home */}
    </Routes>
  );
}

export default App;