/**
 * Voxify Chat Application - Login/Signup JavaScript
 * Using standard email + password authentication
 */

// Import auth-api.js functions
document.write('<script src="js/auth-api.js"></script>');

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show error message
function showError(container, message) {
    const messageContainer = container.querySelector('.message-container');
    if (!messageContainer) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'auth-message error';
    messageElement.textContent = message;
    
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Add message
    messageContainer.appendChild(messageElement);
}

// Show success message
function showSuccess(container, message) {
    const messageContainer = container.querySelector('.message-container');
    if (!messageContainer) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'auth-message success';
    messageElement.textContent = message;
    
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Add message
    messageContainer.appendChild(messageElement);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => {
            if (messageElement.parentNode === messageContainer) {
                messageContainer.removeChild(messageElement);
            }
        }, 500);
    }, 5000);
}

// Reset forms
function resetForms() {
    // Reset login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const loginEmailInput = loginForm.querySelector('#login-email');
        const loginPasswordInput = loginForm.querySelector('#login-password');
        const loginMessageContainer = loginForm.querySelector('.message-container');
        
        if (loginEmailInput) loginEmailInput.value = '';
        if (loginPasswordInput) loginPasswordInput.value = '';
        if (loginMessageContainer) loginMessageContainer.innerHTML = '';
    }
    
    // Reset signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        const signupNameInput = signupForm.querySelector('#signup-name');
        const signupEmailInput = signupForm.querySelector('#signup-email');
        const signupPasswordInput = signupForm.querySelector('#signup-password');
        const signupMessageContainer = signupForm.querySelector('.message-container');
        
        if (signupNameInput) signupNameInput.value = '';
        if (signupEmailInput) signupEmailInput.value = '';
        if (signupPasswordInput) signupPasswordInput.value = '';
        if (signupMessageContainer) signupMessageContainer.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already authenticated
    if (AuthAPI.isAuthenticated()) {
        // User is already logged in, redirect to chat
        window.location.href = 'chat.html';
        return;
    }
    
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            tabBtns.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show the corresponding form
            const tabType = this.getAttribute('data-tab');
            if (tabType === 'login') {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            }
            
            // Reset forms when switching tabs
            resetForms();
        });
    });
    
    // Login form submission
    const loginSubmitBtn = document.getElementById('login-submit');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async function() {
            // Get form values
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            // Validate inputs
            if (!email || !isValidEmail(email)) {
                showError(loginForm, 'Please enter a valid email address');
                return;
            }
            
            if (!password) {
                showError(loginForm, 'Please enter your password');
                return;
            }
            
            // Show loading state
            loginSubmitBtn.textContent = 'Logging in...';
            loginSubmitBtn.disabled = true;
            
            try {
                // Call login API
                const response = await AuthAPI.login(email, password);
                
                if (response.success) {
                    // Show success message
                    showSuccess(loginForm, 'Login successful! Redirecting...');
                    
                    // Redirect to chat page
                    setTimeout(() => {
                        window.location.href = response.redirect || 'chat.html';
                    }, 1000);
                } else {
                    showError(loginForm, response.error || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError(loginForm, 'An error occurred. Please try again.');
            } finally {
                // Reset button state
                loginSubmitBtn.textContent = 'Log In';
                loginSubmitBtn.disabled = false;
            }
        });
    }
    
    // Signup form submission
    const signupSubmitBtn = document.getElementById('signup-submit');
    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', async function() {
            // Get form values
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            
            // Validate inputs
            if (!name) {
                showError(signupForm, 'Please enter your full name');
                return;
            }
            
            if (!email || !isValidEmail(email)) {
                showError(signupForm, 'Please enter a valid email address');
                return;
            }
            
            if (!password) {
                showError(signupForm, 'Please enter a password');
                return;
            }
            
            if (password.length < 8) {
                showError(signupForm, 'Password must be at least 8 characters long');
                return;
            }
            
            // Show loading state
            signupSubmitBtn.textContent = 'Creating account...';
            signupSubmitBtn.disabled = true;
            
            try {
                // Call signup API
                const response = await AuthAPI.signup(name, email, password);
                
                if (response.success) {
                    // Show success message
                    showSuccess(signupForm, 'Account created successfully! Redirecting...');
                    
                    // Redirect to chat page
                    setTimeout(() => {
                        window.location.href = response.redirect || 'chat.html';
                    }, 1000);
                } else {
                    showError(signupForm, response.error || 'Signup failed. Please try again.');
                }
            } catch (error) {
                console.error('Signup error:', error);
                showError(signupForm, 'An error occurred. Please try again.');
            } finally {
                // Reset button state
                signupSubmitBtn.textContent = 'Sign Up';
                signupSubmitBtn.disabled = false;
            }
        });
    }
    
    // Add keyboard event listeners for form submission
    document.getElementById('login-password')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && loginSubmitBtn) {
            e.preventDefault();
            loginSubmitBtn.click();
        }
    });
    
    document.getElementById('signup-password')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && signupSubmitBtn) {
            e.preventDefault();
            signupSubmitBtn.click();
        }
    });
});