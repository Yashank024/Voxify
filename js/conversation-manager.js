/**
 * Voxify Conversation Manager
 * Handles conversations between users
 */

class ConversationManager {
    constructor() {
        // DOM Elements
        this.contactsList = document.querySelector('.contacts-list');
        this.emptyState = document.querySelector('.empty-state');
        this.newChatBtn = document.querySelector('.new-chat-btn');
        this.messagesContainer = document.querySelector('.messages-container');
        this.messageInput = document.querySelector('.message-input');
        this.sendButton = document.querySelector('.send-btn');
        this.chatHeader = document.querySelector('.chat-header .chat-contact');
        
        // State
        this.conversations = [];
        this.users = [];
        this.currentUser = null;
        this.currentConversation = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the conversation manager
     */
    async init() {
        try {
            // Get current user from local storage
            this.currentUser = {
                id: localStorage.getItem('user_id'),
                name: localStorage.getItem('user_name') || 'User'
            };
            
            if (!this.currentUser.id) {
                console.error('User not authenticated');
                window.location.href = 'login.html';
                return;
            }
            
            // Load users and conversations
            await this.loadUsers();
            await this.loadConversations();
            
            // Set up event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing conversation manager:', error);
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // New chat button
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.showUserSelectionModal());
        }
        
        // Send message button
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        // Message input - send on Enter
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }
    
    /**
     * Load users from API
     */
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load users');
            }
            
            const data = await response.json();
            this.users = data.users || [];
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
        }
    }
    
    /**
     * Load conversations from API
     */
    async loadConversations() {
        try {
            const response = await fetch('/api/conversations', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load conversations');
            }
            
            const data = await response.json();
            this.conversations = data.conversations || [];
            
            // Sort conversations by updated_at (newest first)
            this.conversations.sort((a, b) => {
                return new Date(b.updated_at) - new Date(a.updated_at);
            });
            
            // Render conversations
            this.renderConversations();
            
            // If we have a selected conversation, refresh its messages
            if (this.currentConversation) {
                const updatedConversation = this.conversations.find(c => c.id === this.currentConversation.id);
                if (updatedConversation) {
                    this.currentConversation = updatedConversation;
                    this.loadMessages(this.currentConversation.id);
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }
    
    /**
     * Render conversations in the UI
     */
    renderConversations() {
        // Clear existing conversations except empty state
        const items = this.contactsList.querySelectorAll('.contact-item');
        items.forEach(item => item.remove());
        
        // Show or hide empty state
        if (this.conversations.length === 0) {
            if (this.emptyState) {
                this.emptyState.style.display = 'flex';
            }
        } else {
            if (this.emptyState) {
                this.emptyState.style.display = 'none';
            }
            
            // Render each conversation
            this.conversations.forEach(conversation => {
                this.renderConversationItem(conversation);
            });
        }
    }
    
    /**
     * Render a single conversation item
     * @param {Object} conversation - The conversation data
     */
    renderConversationItem(conversation) {
        const otherUser = conversation.other_user || { name: 'Unknown', avatar: '' };
        
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.dataset.id = conversation.id;
        
        if (this.currentConversation && this.currentConversation.id === conversation.id) {
            contactItem.classList.add('active');
        }
        
        // Create HTML - only showing user name and avatar as requested
        contactItem.innerHTML = `
            <div class="contact-avatar">
                <img src="${otherUser.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'}" alt="${this.escapeHTML(otherUser.name)}">
                <span class="status-indicator online"></span>
            </div>
            <div class="contact-info">
                <div class="contact-name-time">
                    <h4>${this.escapeHTML(otherUser.name)}</h4>
                </div>
            </div>
        `;
        
        // Add click event
        contactItem.addEventListener('click', () => {
            this.selectConversation(conversation);
        });
        
        // Add to DOM
        this.contactsList.appendChild(contactItem);
    }
    
    /**
     * Show user selection modal
     */
    showUserSelectionModal() {
        // Create modal if it doesn't exist
        let modal = document.querySelector('.user-selection-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'user-selection-modal';
            
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3>New Conversation</h3>
                        <button class="close-modal-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="users-list">
                            ${this.users.length === 0 ? 
                                '<div class="no-users">No users found</div>' : 
                                this.users.map(user => `
                                    <div class="user-item" data-id="${user.id}">
                                        <div class="user-avatar">
                                            <img src="${user.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'}" alt="${this.escapeHTML(user.name)}">
                                            <span class="status-indicator online"></span>
                                        </div>
                                        <div class="user-info">
                                            <h4>${this.escapeHTML(user.name)}</h4>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            const closeBtn = modal.querySelector('.close-modal-btn');
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            const overlay = modal.querySelector('.modal-overlay');
            overlay.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            const userItems = modal.querySelectorAll('.user-item');
            userItems.forEach(item => {
                item.addEventListener('click', () => {
                    this.createConversation(item.dataset.id);
                    modal.classList.remove('active');
                });
            });
        }
        
        // Show modal
        modal.classList.add('active');
    }
    
    /**
     * Create a new conversation
     * @param {string} userId - The user ID to create conversation with
     */
    async createConversation(userId) {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to create conversation');
            }
            
            const data = await response.json();
            
            // Reload conversations and select the new one
            await this.loadConversations();
            
            // Find the new conversation and select it
            const newConversation = this.conversations.find(c => c.id === data.conversation.id);
            if (newConversation) {
                this.selectConversation(newConversation);
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    }
    
    /**
     * Select a conversation
     * @param {Object} conversation - The conversation to select
     */
    async selectConversation(conversation) {
        // Update UI
        const items = this.contactsList.querySelectorAll('.contact-item');
        items.forEach(item => {
            if (item.dataset.id === conversation.id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Set current conversation
        this.currentConversation = conversation;
        
        // Update chat header
        this.updateChatHeader(conversation);
        
        // Load messages
        await this.loadMessages(conversation.id);
    }
    
    /**
     * Update chat header with selected conversation
     * @param {Object} conversation - The selected conversation
     */
    updateChatHeader(conversation) {
        if (!this.chatHeader) return;
        
        const otherUser = conversation.other_user || { name: 'Unknown', avatar: '' };
        
        this.chatHeader.innerHTML = `
            <div class="contact-avatar">
                <img src="${otherUser.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'}" alt="${this.escapeHTML(otherUser.name)}">
            </div>
            <div class="contact-info">
                <h3>${this.escapeHTML(otherUser.name)}</h3>
                <p class="contact-status">Online</p>
            </div>
        `;
    }
    
    /**
     * Load messages for a conversation
     * @param {string} conversationId - The conversation ID
     */
    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            
            const data = await response.json();
            const messages = data.messages || [];
            
            this.renderMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    /**
     * Render messages in the UI
     * @param {Array} messages - The messages to render
     */
    renderMessages(messages) {
        if (!this.messagesContainer) return;
        
        // Clear existing messages
        this.messagesContainer.innerHTML = '';
        
        // Add date divider
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        dateDivider.innerHTML = '<span>Today</span>';
        this.messagesContainer.appendChild(dateDivider);
        
        // No messages case - just show the date divider
        if (messages.length === 0) {
            return;
        }
        
        // Render each message
        messages.forEach(message => {
            const isOutgoing = message.sender_id === this.currentUser.id;
            const messageEl = document.createElement('div');
            messageEl.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
            
            if (isOutgoing) {
                // Outgoing message (from current user)
                messageEl.innerHTML = `
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>${this.escapeHTML(message.text)}</p>
                        </div>
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                        <span class="message-status">
                            <i class="fas fa-check-double"></i>
                        </span>
                    </div>
                `;
            } else {
                // Incoming message (from other user)
                // Use the other user's avatar from their profile
                const otherUser = this.currentConversation.other_user || { avatar: '' };
                messageEl.innerHTML = `
                    <div class="message-avatar">
                        <img src="${otherUser.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'}" alt="${this.escapeHTML(otherUser.name)}">
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>${this.escapeHTML(message.text)}</p>
                        </div>
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    </div>
                `;
            }
            
            this.messagesContainer.appendChild(messageEl);
        });
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    /**
     * Send a message
     */
    async sendMessage() {
        if (!this.currentConversation || !this.messageInput) return;
        
        const messageText = this.messageInput.value.trim();
        if (!messageText) return;
        
        try {
            const response = await fetch(`/api/conversations/${this.currentConversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: messageText
                }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            // Clear input
            this.messageInput.value = '';
            
            // Reload messages
            await this.loadMessages(this.currentConversation.id);
            
            // Reload conversations to update last message
            await this.loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    /**
     * Format timestamp to readable time
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Scroll messages container to bottom
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (localStorage.getItem('token') === 'authenticated' && localStorage.getItem('user_id')) {
        // Initialize conversation manager
        window.conversationManager = new ConversationManager();
    } else {
        // Redirect to login page
        window.location.href = 'login.html';
    }
});
