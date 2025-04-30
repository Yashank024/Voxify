// Voxify Modern Chat Interface JavaScript

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('token') === 'authenticated' && localStorage.getItem('user_id');
}

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to login page...');
        window.location.href = 'login.html';
        return;
    }
    // DOM Elements
    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-btn');
    const messagesContainer = document.querySelector('.messages-container');
    const contactItems = document.querySelectorAll('.contact-item');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const emptyState = document.querySelector('.empty-state');
    
    // Profile Panel Elements
    const profilePanel = document.getElementById('profile-panel');
    const profileTrigger = document.querySelector('[data-open-profile]');
    const closeProfileBtn = document.querySelector('.close-profile-btn');
    const editFieldBtns = document.querySelectorAll('.edit-field-btn');
    const toggleBtn = document.querySelector('.toggle-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    
    // Three-dot Menu Elements
    const threeDotBtns = document.querySelectorAll('.three-dot-btn');
    const threeDotMenus = document.querySelectorAll('.three-dot-menu');
    const plusIconBtns = document.querySelectorAll('.plus-icon-btn');
    const translationBtns = document.querySelectorAll('.translation-btn');
    const languageSubmenus = document.querySelectorAll('.language-submenu');
    const logoutMenuItem = document.querySelector('.menu-item:has(.fa-sign-out-alt)');
    
    // Language data for translation menu
    const languages = [
        { code: 'en', name: 'English', flag: 'img/flags/en.svg' },
        { code: 'hi', name: 'Hindi', flag: 'img/flags/hi.svg' },
        { code: 'es', name: 'Spanish', flag: 'img/flags/es.svg' },
        { code: 'fr', name: 'French', flag: 'img/flags/fr.svg' },
        { code: 'de', name: 'German', flag: 'img/flags/de.svg' }
    ];
    
    // Initialize scrolling to bottom of messages
    scrollToBottom();
    
    // Check for saved language preference
    initializeLanguagePreference();
    
    // Preload profile data in the background when chat page loads
    preloadProfileData();
    
    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Add event listener for the logout menu item
    if (logoutMenuItem) {
        logoutMenuItem.addEventListener('click', function() {
            // Use the profile manager's logout function if available
            if (window.profileManager && window.profileManager.handleLogout) {
                window.profileManager.handleLogout();
            } else {
                // Fallback to direct redirect
                console.warn('Profile manager not available, redirecting directly');
                window.location.href = 'login.html';
            }
        });
    }
    
    // Send button ripple effect
    sendButton.addEventListener('mousedown', function() {
        const ripple = this.querySelector('.ripple');
        ripple.classList.add('active');
        
        setTimeout(() => {
            ripple.classList.remove('active');
        }, 600);
    });
    
    // New chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            // This would normally connect to a backend to create a new chat
            // For demo purposes, we'll just show a sample contact
            const sampleContact = document.querySelector('.contact-item');
            if (sampleContact) {
                sampleContact.style.display = 'flex';
                emptyState.style.display = 'none';
            }
        });
    }
    
    // Handle contact selection
    contactItems.forEach(contact => {
        contact.addEventListener('click', function() {
            // Remove active class from all contacts
            contactItems.forEach(c => c.classList.remove('active'));
            // Add active class to clicked contact
            this.classList.add('active');
            
            // Update chat header with selected contact info
            const contactName = this.querySelector('.contact-name-time h4').textContent;
            const contactImg = this.querySelector('.contact-avatar img').src;
            
            document.querySelector('.chat-contact h3').textContent = contactName;
            document.querySelector('.contact-avatar img').src = contactImg;
        });
    });
    
    // Profile Panel Functionality
    if (profileTrigger) {
        // Open profile panel when user profile is clicked
        profileTrigger.addEventListener('click', function() {
            openProfilePanel();
        });
    }
    
    if (closeProfileBtn) {
        // Close profile panel when close button is clicked
        closeProfileBtn.addEventListener('click', function() {
            closeProfilePanel();
        });
    }
    
    // Handle editable fields in profile
    editFieldBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const field = this.closest('.editable-field');
            const input = field.querySelector('input');
            
            // Toggle readonly attribute
            if (input.hasAttribute('readonly')) {
                input.removeAttribute('readonly');
                input.focus();
                // Change icon to save
                this.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                input.setAttribute('readonly', true);
                // Change icon back to edit
                this.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                
                // Here you would typically save the changes to a backend
                console.log(`Saved ${input.id} with value: ${input.value}`);
            }
        });
    });
    
    // Toggle button functionality
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            const textSpan = this.closest('.toggle-field').querySelector('span');
            
            if (icon.classList.contains('fa-toggle-off')) {
                icon.classList.remove('fa-toggle-off');
                icon.classList.add('fa-toggle-on');
                textSpan.textContent = 'On';
            } else {
                icon.classList.remove('fa-toggle-on');
                icon.classList.add('fa-toggle-off');
                textSpan.textContent = 'Off';
            }
        });
    }
    
    // Logout button functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Call the logout API endpoint
            if (window.profileManager && window.profileManager.handleLogout) {
                // Use the profile manager's logout function
                window.profileManager.handleLogout();
            } else {
                // Fallback to direct redirect if profile manager is not available
                console.warn('Profile manager not available, redirecting directly');
                window.location.href = 'login.html';
            }
        });
    }
    
    // Three-dot Menu Functionality
    threeDotBtns.forEach((btn) => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Find the menu within the same header-actions div
            const menu = this.parentElement.querySelector('.three-dot-menu');
            if (!menu) return;
            
            // Toggle aria-expanded attribute for accessibility
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            
            // Toggle menu visibility
            menu.setAttribute('aria-hidden', isExpanded);
            
            // Close other menus
            threeDotMenus.forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.setAttribute('aria-hidden', 'true');
                    const otherBtn = otherMenu.parentElement.querySelector('.three-dot-btn');
                    if (otherBtn) {
                        otherBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });
            
            // Add event listener to close menu when clicking outside
            if (!isExpanded) {
                setTimeout(() => {
                    document.addEventListener('click', closeMenuOnClickOutside);
                }, 0);
            }
        });
    });
    
    // Translation submenu functionality - allow both click and hover
    translationBtns.forEach(btn => {
        // Click handler
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleTranslationSubmenu(this);
        });
        
        // Hover handlers for submenu
        const submenuParent = btn.closest('.has-submenu');
        
        submenuParent.addEventListener('mouseenter', function() {
            const translationBtn = this.querySelector('.translation-btn');
            if (translationBtn) {
                toggleTranslationSubmenu(translationBtn, true);
            }
        });
        
        submenuParent.addEventListener('mouseleave', function() {
            const translationBtn = this.querySelector('.translation-btn');
            const submenu = this.querySelector('.language-submenu');
            
            if (translationBtn && submenu) {
                translationBtn.setAttribute('aria-expanded', 'false');
                submenu.setAttribute('aria-hidden', 'true');
            }
        });
    });
    
    // Function to toggle translation submenu
    function toggleTranslationSubmenu(btn, forceOpen = false) {
        // Toggle aria-expanded attribute
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        const newState = forceOpen ? true : !isExpanded;
        btn.setAttribute('aria-expanded', newState);
        
        // Find the language submenu
        const submenu = btn.closest('.has-submenu').querySelector('.language-submenu');
        if (!submenu) return;
        
        // Toggle submenu visibility
        submenu.setAttribute('aria-hidden', !newState);
        
        // Close other submenus if opening this one
        if (newState) {
            languageSubmenus.forEach(otherSubmenu => {
                if (otherSubmenu !== submenu) {
                    otherSubmenu.setAttribute('aria-hidden', 'true');
                    const otherBtn = otherSubmenu.closest('.has-submenu').querySelector('.translation-btn');
                    if (otherBtn) {
                        otherBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }
    }
    
    // Handle language selection
    document.addEventListener('click', function(e) {
        // Check if clicked element is a language item
        const langItem = e.target.closest('.language-item');
        if (langItem) {
            e.stopPropagation();
            
            const langCode = langItem.dataset.lang;
            setLanguagePreference(langCode);
            closeAllMenus();
        }
        
        // Handle other menu item clicks
        const menuItem = e.target.closest('.menu-item:not(.translation-btn)');
        if (menuItem) {
            e.stopPropagation();
            
            // Get menu item text
            const menuText = menuItem.textContent.trim();
            console.log(`Menu action: ${menuText}`);
            
            // Handle specific actions
            if (menuText.includes('Logout')) {
                window.location.href = 'login.html';
            }
            
            // Close all menus
            closeAllMenus();
        }
    });
    
    // Function to close menu when clicking outside
    function closeMenuOnClickOutside(e) {
        if (!e.target.closest('.three-dot-menu') && !e.target.closest('.three-dot-btn')) {
            closeAllMenus();
            document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }
    
    // Function to close all menus
    function closeAllMenus() {
        threeDotMenus.forEach(menu => {
            menu.setAttribute('aria-hidden', 'true');
            const btn = menu.parentElement.querySelector('.three-dot-btn');
            if (btn) {
                btn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close any open submenus
        languageSubmenus.forEach(submenu => {
            submenu.setAttribute('aria-hidden', 'true');
            const translationBtn = submenu.closest('.has-submenu').querySelector('.translation-btn');
            if (translationBtn) {
                translationBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Function to set language preference
    function setLanguagePreference(langCode) {
        // Save to localStorage
        localStorage.setItem('preferredLang', langCode);
        
        // Find language data
        const language = languages.find(lang => lang.code === langCode);
        if (!language) return;
        
        // Update plus icon buttons with the selected language flag
        plusIconBtns.forEach(btn => {
            // Remove existing flag image if any
            const existingFlag = btn.querySelector('img');
            if (existingFlag) {
                existingFlag.remove();
            }
            
            // Create and add new flag image
            const flagImg = document.createElement('img');
            flagImg.src = language.flag;
            flagImg.alt = `${language.name} flag`;
            btn.appendChild(flagImg);
            
            // Add has-flag class to show the flag
            btn.classList.add('has-flag');
            
            // Animate the flag appearance
            setTimeout(() => {
                flagImg.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
        });
        
        console.log(`Language set to: ${language.name}`);
    }
    
    // Function to initialize language preference
    function initializeLanguagePreference() {
        const savedLang = localStorage.getItem('preferredLang');
        if (savedLang) {
            setLanguagePreference(savedLang);
        }
    }
    
    // Function to preload profile data
    function preloadProfileData() {
        console.log('Preloading profile data in background...');
        
        // Check if profileManager is available from profile.js
        if (window.profileManager && window.profileManager.loadProfileData) {
            // Use the profile manager to load data
            window.profileManager.loadProfileData().then(userData => {
                console.log('Profile data preloaded successfully');
            }).catch(error => {
                console.log('Profile data preload failed, will load when needed');
            });
        } else {
            // Fallback to direct API call if profileManager is not available
            fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            }).then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to preload profile data');
            }).then(userData => {
                console.log('Profile data preloaded via direct API call');
            }).catch(error => {
                console.log('Direct profile data preload failed, will load when needed');
            });
        }
    }
    
    // Keyboard navigation for menu
    document.addEventListener('keydown', function(e) {
        // Close menus on Escape key
        if (e.key === 'Escape') {
            closeAllMenus();
        }
        
        // Handle arrow key navigation within menus
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const activeMenu = document.querySelector('.three-dot-menu[aria-hidden="false"]');
            if (!activeMenu) return;
            
            e.preventDefault();
            
            const menuItems = Array.from(activeMenu.querySelectorAll('.menu-item, .language-item'));
            const focusedItem = document.activeElement;
            const currentIndex = menuItems.indexOf(focusedItem);
            
            let nextIndex;
            if (e.key === 'ArrowDown') {
                nextIndex = currentIndex < 0 || currentIndex >= menuItems.length - 1 ? 0 : currentIndex + 1;
            } else {
                nextIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
            }
            
            menuItems[nextIndex].focus();
        }
    });
    
    // Function to send a new message
    function sendMessage() {
        const messageText = messageInput.value.trim();
        
        if (messageText !== '') {
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = 'message outgoing';
            
            // Get current time
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // Set message HTML
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">
                        <p>${escapeHTML(messageText)}</p>
                    </div>
                    <span class="message-time">${timeString}</span>
                </div>
            `;
            
            // Add message to container
            messagesContainer.appendChild(messageElement);
            
            // Clear input
            messageInput.value = '';
            
            // Scroll to bottom
            scrollToBottom();
            
            // Simulate a reply after a short delay
            setTimeout(simulateReply, 1000);
        }
    }
    
    // Function to simulate a reply
    function simulateReply() {
        // Create typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message incoming typing-indicator';
        typingIndicator.innerHTML = `
            <div class="message-avatar">
                <img src="img/Only Voxify logo non text (1).png" alt="Voxify">
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </p>
                </div>
            </div>
        `;
        
        // Add typing indicator to container
        messagesContainer.appendChild(typingIndicator);
        scrollToBottom();
        
        // Sample responses
        const responses = [
            "I understand! How can I help you with that?",
            "That's interesting! Tell me more about it.",
            "I'm processing your request. Is there anything specific you'd like to know?",
            "I can definitely help you with that. Let me provide some more information.",
            "Thanks for sharing. Is there anything else you'd like to discuss?"
        ];
        
        // Select a random response
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Remove typing indicator and add response after a delay
        setTimeout(() => {
            // Remove typing indicator
            messagesContainer.removeChild(typingIndicator);
            
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = 'message incoming';
            
            // Get current time
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // Set message HTML
            messageElement.innerHTML = `
                <div class="message-avatar">
                    <img src="img/Only Voxify logo non text (1).png" alt="Voxify">
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        <p>${randomResponse}</p>
                    </div>
                    <span class="message-time">${timeString}</span>
                </div>
            `;
            
            // Add message to container
            messagesContainer.appendChild(messageElement);
            
            // Scroll to bottom
            scrollToBottom();
        }, 2000);
    }
    
    // Function to scroll to bottom of messages container
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Helper function to escape HTML
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Animate fluid shapes
    const shapes = document.querySelectorAll('.shape, .profile-shape');
    shapes.forEach(shape => {
        // Add random animation delay
        const delay = Math.random() * 5;
        shape.style.animationDelay = `${delay}s`;
    });
    
    // Add hover effects to input action buttons
    const actionButtons = document.querySelectorAll('.input-action-btn, .icon-btn');
    actionButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1.1)';
        });
    });
    
    // Handle keyboard navigation for accessibility
    document.addEventListener('keydown', function(e) {
        // Close profile panel on Escape key
        if (e.key === 'Escape' && profilePanel.getAttribute('aria-hidden') === 'false') {
            closeProfilePanel();
        }
    });
    
    // Function to open profile panel
    function openProfilePanel() {
        // Set aria-hidden to false for accessibility
        profilePanel.setAttribute('aria-hidden', 'false');
        
        // Set focus to the close button for keyboard navigation
        setTimeout(() => {
            closeProfileBtn.focus();
        }, 300);
        
        // Add overlay to prevent interaction with the main content
        document.body.classList.add('profile-open');
    }
    
    // Function to close profile panel
    function closeProfilePanel() {
        // Set aria-hidden to true for accessibility
        profilePanel.setAttribute('aria-hidden', 'true');
        
        // Return focus to the profile trigger for keyboard navigation
        setTimeout(() => {
            profileTrigger.focus();
        }, 300);
        
        // Remove overlay
        document.body.classList.remove('profile-open');
    }
});