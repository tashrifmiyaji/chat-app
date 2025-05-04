// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster //
            position="top-center"
            reverseOrder={false}
            toastOptions={{
                // default style as your wish
                className: '',
                duration: 4000, 
                style: {
                    background: '#233554',
                    color: '#ccd6f6',
                    border: '1px solid #8892b040',
                },
                success: {
                    duration: 3000,
                    theme: {
                        primary: '#64ffda', // accent-cyan
                        secondary: '#0a192f', // navy
                    },
                    iconTheme: {
                        primary: '#64ffda', // accent-cyan
                        secondary: '#0a192f', // navy
                      },
                },
                // error notification style.
                error: {
                    iconTheme: {
                      primary: '#f87171', // red-400
                      secondary: '#ffffff',
                    },
                  },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);