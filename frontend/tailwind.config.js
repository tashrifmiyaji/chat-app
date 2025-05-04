// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // Ensure this covers all component files
    ],
    theme: {
      extend: {
        // Your existing color palette
        colors: {
          'navy': '#0a192f',
          'light-navy': '#112240',
          'lightest-navy': '#233554',
          'slate': '#8892b0',
          'light-slate': '#a8b2d1',
          'lightest-slate': '#ccd6f6',
          'primary-purple': '#6f42c1', // Example Purple
          'light-purple': '#8a63d2', // Lighter purple
          'indigo-600': '#4f46e5', // Example for sender bubble gradient end
          'accent-cyan': '#64ffda', // Accent color
          // Add more colors if needed
        },
        // Your existing font families (if any)
        fontFamily: {
          sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'], // System Font Stack
        },
  
        // --- Add Keyframes and Animation ---
        keyframes: {
          'fade-in': {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          'pulse-subtle': { // Subtle pulse for online indicator maybe
              '0%, 100%': { opacity: '1', transform: 'scale(1)' },
              '50%': { opacity: '.7', transform: 'scale(0.95)' },
          }
          // Add more keyframes here if needed
        },
        animation: {
          'fade-in': 'fade-in 0.3s ease-out forwards',
          'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', // Apply pulse animation
          // Define more animations here
        },
        // --- End Animation ---
  
        // Add gradient color stops if you want named gradients (optional)
        gradientColorStops: theme => ({
            ...theme('colors'),
           'primary': '#6f42c1',
           'secondary': '#4f46e5',
           'accent': '#64ffda',
           'dark-start': '#0a192f',
           'dark-mid': '#112240',
           'dark-end': '#233554',
        }),
      },
    },
    // Add plugins, including scrollbar
    plugins: [
       require('tailwind-scrollbar'), // Ensure this plugin is installed
    ],
  }