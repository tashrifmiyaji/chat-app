// src/hooks/useAuth.js
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    // If context is null initially before provider sets value, handle it
    if (context === null) {
         throw new Error('AuthContext is null, ensure AuthProvider has rendered and provided a value');
    }
    return context;
};