/**
 * Voxify Chat Application - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle with improved animation
    document.querySelector('.mobile-menu-btn').addEventListener('click', function() {
        document.querySelector('.nav-links').classList.toggle('show');
        this.classList.toggle('active');
    });

    // Enhanced Scroll Animation
    // Handle all fade animations
    const fadeElements = document.querySelectorAll('.fade-in, .fade-left, .fade-right, .fade-up, .fade-down');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    fadeElements.forEach(element => {
        observer.observe(element);
    });

    // Add hover effects to navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.classList.add('nav-hover');
        });
        item.addEventListener('mouseleave', function() {
            this.classList.remove('nav-hover');
        });
    });
    
    // Header scroll effect
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });
    
    // Add animation classes to elements
    document.querySelectorAll('.feature-card:nth-child(odd)').forEach(card => {
        card.classList.add('fade-left');
        card.classList.remove('fade-in');
    });
    
    document.querySelectorAll('.feature-card:nth-child(even)').forEach(card => {
        card.classList.add('fade-right');
        card.classList.remove('fade-in');
    });
    
    document.querySelectorAll('.testimonial-card').forEach((card, index) => {
        card.classList.add('fade-up');
        card.classList.remove('fade-in');
        card.style.transitionDelay = (index * 0.2) + 's';
    });
});