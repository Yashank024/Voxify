/**
 * Voxify Chat Application - Authentication API Integration
 * This file provides functions to interact with the authentication backend
 * Using standard email + password authentication
 */

// Use a relative path to ensure it works regardless of deployment environment
const API_BASE_URL = '/api';

// For debugging - log the base URL
console.log('API Base URL:', API_BASE_URL);

// Authentication API functions
const AuthAPI = {
    /**
     * Login with email and password
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise} - Promise resolving to the API response
     */
    login: async function(email, password) {
        try {
            console.log('Logging in with email:', email);
            
            // Call backend API
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email,
                    password: password
                }),
                credentials: 'include' // Important for session cookie
            });
            
            // Get response as text first to handle potential non-JSON responses
            const text = await response.text();
            let data;
            
            try {
                // Try to parse the text as JSON
                data = JSON.parse(text);
                console.log('Login response:', data);
            } catch (parseError) {
                // If parsing fails, log the raw response and throw an error
                console.error('Invalid JSON response:', text);
                return {
                    success: false,
                    error: 'Server error: unexpected response format'
                };
            }
            
            if (!response.ok || !data.success) {
                return { 
                    success: false, 
                    error: data.error || `Server error: ${response.status}` 
                };
            }
            
            // Store user info in local storage for UI hints
            if (data.user) {
                localStorage.setItem('user_email', data.user.email);
                localStorage.setItem('user_name', data.user.name);
                localStorage.setItem('user_id', data.user.id);
                localStorage.setItem('token', 'authenticated');
            }
            
            return {
                success: true,
                redirect: data.redirect,
                user: data.user
            };
        } catch (error) {
            console.error('Login failed:', error);
            return { 
                success: false, 
                error: error.message || 'Network error. Please try again.' 
            };
        }
    },
    
    /**
     * Register a new user
     * @param {string} name - User's full name
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise} - Promise resolving to the API response
     */
    signup: async function(name, email, password) {
        try {
            console.log('Signing up with email:', email);
            
            // Call backend API
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    name: name,
                    email: email,
                    password: password
                }),
                credentials: 'include' // Important for session cookie
            });
            
            // Get response as text first to handle potential non-JSON responses
            const text = await response.text();
            let data;
            
            try {
                // Try to parse the text as JSON
                data = JSON.parse(text);
                console.log('Signup response:', data);
            } catch (parseError) {
                // If parsing fails, log the raw response and throw an error
                console.error('Invalid JSON response:', text);
                return {
                    success: false,
                    error: 'Server error: unexpected response format'
                };
            }
            
            if (!response.ok || !data.success) {
                return { 
                    success: false, 
                    error: data.error || `Server error: ${response.status}` 
                };
            }
            
            // Store user info in local storage for UI hints
            if (data.user) {
                localStorage.setItem('user_email', data.user.email);
                localStorage.setItem('user_name', data.user.name);
                localStorage.setItem('user_id', data.user.id);
                localStorage.setItem('token', 'authenticated');
            }
            
            return {
                success: true,
                redirect: data.redirect,
                user: data.user
            };
        } catch (error) {
            console.error('Signup failed:', error);
            return { 
                success: false, 
                error: error.message || 'Network error. Please try again.' 
            };
        }
    },
    
    /**
     * Logout the current user
     * @returns {Promise} - Promise resolving to the API response
     */
    logout: async function() {
        try {
            console.log('Logging out');
            
            // Call backend API
            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Important for session cookie
            });
            
            // Parse the JSON response
            const data = await response.json();
            console.log('Logout response:', data);
            
            // Clear local storage
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            localStorage.removeItem('token');
            
            return {
                success: true,
                redirect: data.redirect || '/login.html'
            };
        } catch (error) {
            console.error('Logout failed:', error);
            return { 
                success: false, 
                error: error.message || 'Network error. Please try again.' 
            };
        }
    },
    
    /**
     * Get user profile information
     * @returns {Promise} - Promise resolving to the user profile
     */
    getUserProfile: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include' // Important for session cookie
            });
            
            // Parse the JSON response
            const data = await response.json();
            console.log('Get user profile response:', data);
            
            if (!response.ok) {
                console.error('Server returned error:', response.status);
                throw new Error(data.error || `Server error: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to get user profile' 
            };
        }
    },
    
    /**
     * Check if user is authenticated
     * @returns {boolean} - True if user is authenticated
     */
    isAuthenticated: function() {
        // Check if user ID exists in local storage
        const userId = localStorage.getItem('user_id');
        
        // Set the token if user is authenticated but token is missing
        if (userId && !localStorage.getItem('token')) {
            localStorage.setItem('token', 'authenticated');
        }
        
        return !!userId;
    }
};
