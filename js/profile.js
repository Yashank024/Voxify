/**
 * Voxify Chat Application - Profile Management
 * Handles fetching and updating user profile data from Python Flask backend
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - Profile Panel
    const profilePanel = document.getElementById('profile-panel');
    const profileContent = document.getElementById('profile-content');
    const profileLoading = document.getElementById('profile-loading');
    const profileError = document.getElementById('profile-error');
    const retryButton = document.getElementById('retry-profile-load');
    const closeProfileBtn = document.querySelector('.close-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Profile field elements
    const profileAvatar = document.getElementById('profile-avatar');
    const profileName = document.getElementById('profile-name');
    const profileAbout = document.getElementById('profile-about');
    const profileEmail = document.getElementById('profile-email');
    const profilePhone = document.getElementById('profile-phone');
    const disappearingMessagesToggle = document.getElementById('disappearing-messages-toggle');
    const disappearingMessagesStatus = document.getElementById('disappearing-messages-status');
    const muteNotificationsDropdown = document.getElementById('mute-notifications-dropdown');
    const muteNotificationsStatus = document.getElementById('mute-notifications-status');
    const notificationToneDropdown = document.getElementById('notification-tone-dropdown');
    const notificationToneStatus = document.getElementById('notification-tone-status');
    
    // Avatar upload elements
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    
    // Edit buttons
    const editButtons = document.querySelectorAll('[data-edit-field]');
    
    // Track edited fields and editing state
    let editedFields = {};
    let isEditing = false;
    
    // Current user data
    let currentUserData = null;
    
    /**
     * Show the loading spinner and hide other content
     */
    function showLoading() {
        // Hide loading spinner as requested, but keep the content hidden until data is loaded
        profileLoading.style.display = 'none';
        profileContent.style.display = 'none';
        profileError.style.display = 'none';
    }
    
    /**
     * Show the profile content and hide other elements
     */
    function showContent() {
        profileLoading.style.display = 'none';
        profileContent.style.display = 'block';
        profileError.style.display = 'none';
    }
    
    /**
     * Show the error message and hide other content
     */
    function showError() {
        profileLoading.style.display = 'none';
        profileContent.style.display = 'none';
        profileError.style.display = 'flex';
    }
    
    /**
     * Load profile data from server
     */
    async function loadProfileData() {
        try {
            // Don't show loading spinner, but prepare UI
            showLoading();
            console.log('Loading profile data in background...');
            
            // Debug session state
            console.log('Session state:', document.cookie);
            console.log('Local storage user_id:', localStorage.getItem('user_id'));
            console.log('Local storage token:', localStorage.getItem('token'));
            
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include' // Include cookies
            });
            
            console.log('Profile response status:', response.status);
            
            if (response.status === 401) {
                // Unauthorized - redirect to login
                console.log('Unauthorized - redirecting to login');
                window.location.href = 'login.html';
                return;
            }
            
            if (!response.ok) {
                throw new Error(`Failed to load profile data: ${response.status}`);
            }
            
            const userData = await response.json();
            console.log('Profile data loaded:', userData);
            
            // Store current user data
            currentUserData = userData;
            
            // Update UI with user data
            updateProfileUI(userData);
            
            // Update sidebar user info
            updateSidebarUserInfo(userData);
            
            // Show content after data is loaded
            showContent();
            
            return userData;
        } catch (error) {
            console.error('Error loading profile data:', error);
            
            // Don't show notification for background loading
            // showNotification('Failed to load profile data. Please try again.', 'error');
            
            // Don't show error UI for background loading
            // showError();
            
            // Fallback to localStorage data if available
            const userId = localStorage.getItem('user_id');
            const userName = localStorage.getItem('user_name');
            const userEmail = localStorage.getItem('user_email');
            
            if (userId && userName) {
                console.log('Using fallback data from localStorage');
                const fallbackData = {
                    id: userId,
                    name: userName,
                    email: userEmail || '',
                    about: "Hello, I'm using Voxify!",
                };
                
                // Update UI with fallback data
                updateProfileUI(fallbackData);
                showContent();
            }
        }
    }
    
    /**
     * Update the profile UI with user data
     * @param {Object} userData - The user data object
     */
    function updateProfileUI(userData) {
        console.log('Updating profile UI with data:', userData);
        
        // Update avatar
        if (profileAvatar && userData.avatar) {
            profileAvatar.src = userData.avatar;
            console.log('Updated avatar:', userData.avatar);
        }
        
        // Update name
        if (profileName && userData.name) {
            profileName.value = userData.name;
            console.log('Updated name:', userData.name);
        }
        
        // Update about
        if (profileAbout) {
            profileAbout.value = userData.about || "Hey there! I'm using Voxify Chat";
            console.log('Updated about:', profileAbout.value);
        }
        
        // Update email
        if (profileEmail && userData.email) {
            profileEmail.value = userData.email;
            console.log('Updated email:', userData.email);
        }
        
        // Update phone
        if (profilePhone) {
            profilePhone.value = userData.phone || '';
            console.log('Updated phone:', profilePhone.value);
        }
        
        // Update settings
        if (userData.settings) {
            // Update disappearing messages
            if (disappearingMessagesToggle && disappearingMessagesStatus) {
                const isEnabled = userData.settings.disappearing_messages;
                disappearingMessagesToggle.innerHTML = isEnabled ? '<i class="fas fa-toggle-on"></i>' : '<i class="fas fa-toggle-off"></i>';
                disappearingMessagesStatus.textContent = isEnabled ? 'On' : 'Off';
                console.log('Updated disappearing messages:', isEnabled ? 'On' : 'Off');
            }
            
            // Update mute notifications
            if (muteNotificationsStatus) {
                muteNotificationsStatus.textContent = userData.settings.mute_notifications || 'Off';
                console.log('Updated mute notifications:', muteNotificationsStatus.textContent);
            }
            
            // Update notification tone
            if (notificationToneStatus) {
                notificationToneStatus.textContent = userData.settings.notification_tone || 'Default';
                console.log('Updated notification tone:', notificationToneStatus.textContent);
            }
        }
        
        console.log('Profile UI update complete');
    }
    
    /**
     * Save a single profile field to the server
     * @param {string} fieldName - The name of the field to save
     * @param {string} value - The value to save
     * @returns {Promise} Promise that resolves when the field is saved
     */
    async function saveProfileField(fieldName, value) {
        try {
            // Prepare data for update
            const updateData = {};
            updateData[fieldName] = value;
            
            // Send update request
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Important: include cookies for session authentication
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login page
                    window.location.href = 'login.html';
                    return false;
                }
                throw new Error(`Failed to save profile field: ${response.status}`);
            }
            
            const updatedUserData = await response.json();
            currentUserData = updatedUserData;
            
            // Update UI with new data
            updateProfileUI(updatedUserData);
            
            showNotification(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully`, 'success');
            return true;
        } catch (error) {
            console.error(`Error saving profile field ${fieldName}:`, error);
            showNotification(`Failed to save ${fieldName}`, 'error');
            return false;
        }
    }
    
    /**
     * Save profile changes to the server
     * @returns {Promise} Promise that resolves when data is saved
     */
    async function saveProfileChanges() {
        if (Object.keys(editedFields).length === 0) {
            showNotification('No changes to save', 'info');
            return;
        }
        
        try {
            // Prepare data for update
            const updateData = {};
            
            // Handle basic fields
            if (editedFields.name) updateData.name = profileName.value;
            if (editedFields.about) updateData.about = profileAbout.value;
            if (editedFields.email) updateData.email = profileEmail.value;
            
            // Handle settings
            if (editedFields.disappearing_messages || 
                editedFields.mute_notifications || 
                editedFields.notification_tone) {
                
                updateData.settings = {};
                
                if (editedFields.disappearing_messages) {
                    updateData.settings.disappearing_messages = 
                        disappearingMessagesStatus.textContent === 'On';
                }
                
                if (editedFields.mute_notifications) {
                    updateData.settings.mute_notifications = 
                        muteNotificationsStatus.textContent;
                }
                
                if (editedFields.notification_tone) {
                    updateData.settings.notification_tone = 
                        notificationToneStatus.textContent;
                }
            }
            
            // Send update request
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Important: include cookies for session authentication
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login page
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`Failed to save profile: ${response.status}`);
            }
            
            const updatedUserData = await response.json();
            currentUserData = updatedUserData;
            
            // Update UI with new data
            updateProfileUI(updatedUserData);
            
            // Reset edited fields
            editedFields = {};
            isEditing = false;
            
            // Hide save button
            saveProfileBtn.style.display = 'none';
            
            // Make all inputs readonly again
            document.querySelectorAll('.editable-field input').forEach(input => {
                input.readOnly = true;
                input.parentElement.classList.remove('editing');
            });
            
            showNotification('Profile updated successfully', 'success');
        } catch (error) {
            console.error('Error saving profile changes:', error);
            showNotification('Failed to save profile changes', 'error');
        }
    }
    
    /**
     * Upload a new avatar
     * @param {File} file - The image file to upload
     * @returns {Promise} Promise that resolves when avatar is uploaded
     */
    async function uploadAvatar(file) {
        // Create form data
        const formData = new FormData();
        formData.append('avatar', file);
        
        try {
            const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                credentials: 'include', // Important: include cookies for session authentication
                body: formData
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login page
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`Failed to upload avatar: ${response.status}`);
            }
            
            const updatedUserData = await response.json();
            currentUserData = updatedUserData;
            
            // Update UI with new avatar
            updateProfileUI(updatedUserData);
            
            showNotification('Avatar updated successfully', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showNotification('Failed to upload avatar', 'error');
        }
    }
    
    /**
     * Start editing a field
     * @param {string} fieldName - The name of the field to edit
     */
    function startEditing(fieldName) {
        const input = document.querySelector(`[data-profile-field="${fieldName}"]`);
        
        if (!input || input.readOnly === false) return;
        
        // Make input editable
        input.readOnly = false;
        input.focus();
        input.select();
        
        // Add editing class
        input.parentElement.classList.add('editing');
        
        // Track editing state
        isEditing = true;
        
        // Show save button
        saveProfileBtn.style.display = 'block';
    }
    
    /**
     * Complete editing a field
     * @param {string} fieldName - The name of the field being edited
     */
    function completeEditing(fieldName) {
        const input = document.querySelector(`[data-profile-field="${fieldName}"]`);
        
        if (!input || input.readOnly === true) return;
        
        // Get original value from current user data
        const originalValue = fieldName === 'name' ? currentUserData.name :
                             fieldName === 'about' ? currentUserData.about :
                             fieldName === 'email' ? currentUserData.email : '';
        
        // Check if value has changed
        if (input.value !== originalValue) {
            editedFields[fieldName] = true;
            
            // For email and about fields, save immediately
            if (fieldName === 'email' || fieldName === 'about') {
                saveProfileField(fieldName, input.value);
            }
        } else {
            delete editedFields[fieldName];
        }
        
        // Make input readonly again
        input.readOnly = true;
        input.parentElement.classList.remove('editing');
        
        // Hide save button if no changes
        if (Object.keys(editedFields).length === 0) {
            saveProfileBtn.style.display = 'none';
            isEditing = false;
        }
    }
    
    /**
     * Toggle a boolean setting
     * @param {string} settingName - The name of the setting to toggle
     */
    function toggleSetting(settingName) {
        if (settingName === 'disappearing_messages') {
            const currentValue = disappearingMessagesStatus.textContent === 'On';
            const newValue = !currentValue;
            
            disappearingMessagesStatus.textContent = newValue ? 'On' : 'Off';
            disappearingMessagesToggle.innerHTML = newValue ? 
                '<i class="fas fa-toggle-on"></i>' : 
                '<i class="fas fa-toggle-off"></i>';
            
            editedFields[settingName] = true;
            saveProfileBtn.style.display = 'block';
        }
    }
    
    /**
     * Update the user info in the sidebar
     * @param {Object} userData - The user data object
     */
    function updateSidebarUserInfo(userData) {
        // Find sidebar user elements
        const sidebarUserName = document.querySelector('.user-info h3');
        const sidebarUserStatus = document.querySelector('.user-info p');
        const sidebarUserAvatar = document.querySelector('.user-avatar img');
        
        if (sidebarUserName && userData.name) {
            sidebarUserName.textContent = userData.name;
        }
        
        if (sidebarUserStatus) {
            sidebarUserStatus.textContent = 'Available';
        }
        
        if (sidebarUserAvatar && userData.avatar) {
            sidebarUserAvatar.src = userData.avatar;
            sidebarUserAvatar.alt = `${userData.name}'s Avatar`;
        }
        
        console.log('Sidebar user info updated');
    }

    /**
     * Handle logout functionality
     */
    async function handleLogout() {
        try {
            // Show loading state
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            logoutBtn.disabled = true;
            
            // Call logout API
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('Logout response:', data);
            
            // Clear local storage
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            localStorage.removeItem('token');
            
            // Redirect to login page
            if (data.success && data.redirect) {
                window.location.href = data.redirect;
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error during logout:', error);
            // Reset button state
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutBtn.disabled = false;
            // Redirect anyway in case of error
            window.location.href = 'login.html';
        }
    }
    
    /**
     * Initialize profile panel event listeners
     */
    function initProfileEvents() {
        // Close profile button
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', function() {
                profilePanel.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('profile-open');
            });
        }
        
        // Retry button
        if (retryButton) {
            retryButton.addEventListener('click', loadProfileData);
        }
        
        // Edit buttons
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const fieldName = this.getAttribute('data-edit-field');
                startEditing(fieldName);
            });
        });
        
        // Handle input blur events to complete editing
        document.querySelectorAll('.editable-field input').forEach(input => {
            input.addEventListener('blur', function() {
                const fieldName = this.getAttribute('data-profile-field');
                completeEditing(fieldName);
            });
            
            // Handle enter key
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const fieldName = this.getAttribute('data-profile-field');
                    completeEditing(fieldName);
                }
            });
        });
        
        // Save button
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', saveProfileChanges);
        }
        
        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Toggle buttons
        if (disappearingMessagesToggle) {
            disappearingMessagesToggle.addEventListener('click', function() {
                toggleSetting('disappearing_messages');
            });
        }
        
        // Avatar upload
        if (changeAvatarBtn && avatarUpload) {
            changeAvatarBtn.addEventListener('click', function() {
                avatarUpload.click();
            });
            
            avatarUpload.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    uploadAvatar(this.files[0]);
                }
            });
        }
    }
    
    /**
     * Show notification message
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, info)
     */
    function showNotification(message, type = 'info') {
        // Check if notification container exists, create if not
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'info':
            default:
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        // Set notification content
        notification.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    /**
     * Open profile panel and load data
     */
    function openProfile() {
        profilePanel.setAttribute('aria-hidden', 'false');
        document.body.classList.add('profile-open');
        loadProfileData();
    }
    
    // Initialize profile events
    initProfileEvents();
    
    // Add click event to user profile trigger
    const userProfileTrigger = document.querySelector('[data-open-profile]');
    if (userProfileTrigger) {
        userProfileTrigger.addEventListener('click', openProfile);
    }
    
    // Expose functions for external use
    window.profileManager = {
        loadProfileData,
        saveProfileField,
        openProfile,
        handleLogout
    };
    
    // Preload profile data when profile.js is loaded
    // This ensures data is ready when user clicks profile button
    setTimeout(() => {
        console.log('Auto-loading profile data on page load');
        loadProfileData();
    }, 1000); // Slight delay to ensure other scripts are loaded
});