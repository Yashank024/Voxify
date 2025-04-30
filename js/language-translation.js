/**
 * Real-time Message Translation Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get all language options
    const languageOptions = document.querySelectorAll('.language-option');
    const messagesContainer = document.querySelector('.messages-container');
    
    // Current selected language (default: English)
    let currentLanguage = 'English';
    
    // Sample translations for demo purposes
    // In a real implementation, this would use an API
    const translations = {
        'Hello! I\'m Voxify AI Assistant. How can I help you today?': {
            'हिन्दी': 'नमस्ते! मैं Voxify AI सहायक हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?',
            'Español': '¡Hola! Soy el Asistente de IA de Voxify. ¿Cómo puedo ayudarte hoy?',
            'Français': 'Bonjour! Je suis l\'Assistant IA Voxify. Comment puis-je vous aider aujourd\'hui?',
            '中文': '你好！我是 Voxify AI 助手。今天我能帮您什么忙？',
            'العربية': 'مرحبًا! أنا مساعد Voxify للذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم؟'
        },
        'You can ask me questions or just chat with me. I\'m here to assist you!': {
            'हिन्दी': 'आप मुझसे प्रश्न पूछ सकते हैं या बस मेरे साथ चैट कर सकते हैं। मैं आपकी सहायता के लिए यहां हूँ!',
            'Español': 'Puedes hacerme preguntas o simplemente chatear conmigo. ¡Estoy aquí para ayudarte!',
            'Français': 'Vous pouvez me poser des questions ou simplement discuter avec moi. Je suis là pour vous aider!',
            '中文': '您可以向我提问或者与我聊天。我随时为您提供帮助！',
            'العربية': 'يمكنك أن تسألني أسئلة أو مجرد الدردشة معي. أنا هنا لمساعدتك!'
        },
        'Hi there! How are you doing today?': {
            'हिन्दी': 'नमस्ते! आज आप कैसे हैं?',
            'Español': '¡Hola! ¿Cómo estás hoy?',
            'Français': 'Salut! Comment allez-vous aujourd\'hui?',
            '中文': '嗨！你今天好吗？',
            'العربية': 'مرحبًا! كيف حالك اليوم؟'
        },
        'Would you like to meet up for coffee this weekend?': {
            'हिन्दी': 'क्या आप इस सप्ताहांत कॉफी के लिए मिलना चाहेंगे?',
            'Español': '¿Te gustaría quedar para tomar un café este fin de semana?',
            'Français': 'Voulez-vous prendre un café ce week-end?',
            '中文': '这个周末你想一起喝咖啡吗？',
            'العربية': 'هل ترغب في اللقاء لتناول القهوة هذا الأسبوع؟'
        }
    };
    
    // Handle language option click
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Update active state
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update current language
            currentLanguage = this.textContent.trim();
            
            // Translate all received messages
            translateMessages(currentLanguage);
            
            // Show notification
            showNotification(`Messages will now be translated to ${currentLanguage}`);
        });
    });
    
    // Function to translate messages
    function translateMessages(language) {
        // Skip translation if English is selected (default)
        if (language === 'English') {
            resetToOriginalMessages();
            return;
        }
        
        const receivedMessages = document.querySelectorAll('.message.received .message-text');
        
        receivedMessages.forEach(messageElement => {
            const originalText = messageElement.getAttribute('data-original-text') || messageElement.textContent;
            
            // Store original text if not already stored
            if (!messageElement.getAttribute('data-original-text')) {
                messageElement.setAttribute('data-original-text', originalText);
            }
            
            // Find translation
            const translation = findTranslation(originalText, language);
            
            // Update message text with translation if available
            if (translation) {
                messageElement.textContent = translation;
                messageElement.closest('.message-bubble').classList.add('translated');
            }
        });
    }
    
    // Function to reset messages to original language
    function resetToOriginalMessages() {
        const receivedMessages = document.querySelectorAll('.message.received .message-text');
        
        receivedMessages.forEach(messageElement => {
            const originalText = messageElement.getAttribute('data-original-text');
            
            if (originalText) {
                messageElement.textContent = originalText;
                messageElement.closest('.message-bubble').classList.remove('translated');
            }
        });
    }
    
    // Function to find translation for a message
    function findTranslation(text, language) {
        // Check if we have translation for this text
        if (translations[text] && translations[text][language]) {
            return translations[text][language];
        }
        
        // If no translation found, we could use an API here in a real implementation
        // For demo, we'll return null to keep original text
        return null;
    }
    
    // Function to show notification
    function showNotification(message) {
        // Create or use existing notification element
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        // Set notification message
        notification.textContent = message;
        
        // Show notification
        notification.classList.add('show');
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Add click handler for "more languages" button
    const moreLanguagesBtn = document.querySelector('.more-languages');
    
    if (moreLanguagesBtn) {
        moreLanguagesBtn.addEventListener('click', function() {
            showLanguageModal();
        });
    }
    
    // Function to show language selection modal
    function showLanguageModal() {
        // Sample implementation
        showNotification('More language options coming soon!');
    }
}); 