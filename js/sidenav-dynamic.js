/**
 * Dynamic Side Navigation Bar Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get all sidenav items
    const sidenavItems = document.querySelectorAll('.sidenav-item');
    
    // Add hover sound effect
    sidenavItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            // Could add a subtle sound effect here in a real implementation
            this.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });

        // Add click effect
        item.addEventListener('click', function() {
            // Remove active class from all items
            sidenavItems.forEach(i => {
                i.classList.remove('active');
                // Remove any ongoing animations
                i.querySelector('.sidenav-icon').style.animation = 'none';
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Add animation to the icon
            setTimeout(() => {
                this.querySelector('.sidenav-icon').style.animation = 'float 3s ease-in-out infinite';
            }, 10);
            
            // Ripple effect on click
            createRipple(event, this);
            
            // Navigate if it's a link
            const link = this.querySelector('a');
            if (link) {
                setTimeout(() => {
                    window.location.href = link.getAttribute('href');
                }, 300); // Small delay for animation
            }
        });
    });

    // Create ripple effect function
    function createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.classList.add('ripple');
        
        // Remove existing ripples
        const existingRipple = element.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }
        
        element.appendChild(ripple);
        
        // Remove ripple after animation completes
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Add CSS for ripple effect
    const style = document.createElement('style');
    style.textContent = `
        .sidenav-item {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            0% {
                transform: scale(0);
                opacity: 0.5;
            }
            100% {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Mobile toggle functionality
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.addEventListener('click', function() {
            const sidenav = document.querySelector('.sidenav');
            if (window.innerWidth <= 768 && sidenav.classList.contains('active')) {
                sidenav.classList.remove('active');
            }
        });
    }
    
    // Notification pulse effect
    const notificationDots = document.querySelectorAll('.notification-dot');
    notificationDots.forEach(dot => {
        // Add initial animation
        dot.style.animation = 'pulse 2s infinite';
    });
    
    // Auto-collapse sidenav on mobile
    function handleResize() {
        const sidenav = document.querySelector('.sidenav');
        if (window.innerWidth <= 768) {
            sidenav.classList.remove('active');
        } else {
            sidenav.classList.add('active');
        }
    }
    
    // Initial check and add resize listener
    handleResize();
    window.addEventListener('resize', handleResize);
}); 