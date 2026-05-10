// ========================================
// VASHISTH LOCAL SERVICES - MAIN SCRIPT
// Modern JS with all animations & backend integration
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Loading screen
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 500);
    }, 2000);

    initAll();
});

let serviceCards = [];

function initAll() {
    // Core functionality
    serviceCards = document.querySelectorAll('.service-card');
    smoothScroll();
    mobileMenu();
    serviceSelection();
    fadeInObserver();
    statsCounter();
    formValidation();
    headerScrollEffect();
    testimonialSlider();
}

// ========================================
// SMOOTH SCROLLING
// ========================================
function smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                const headerHeight = document.querySelector('#header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========================================
// MOBILE MENU
// ========================================
function mobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const headerActions = document.querySelector('.header-actions');
    
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        headerActions.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });

    // Close mobile menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            headerActions.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });
}

// ========================================
// SERVICE SELECTION
// ========================================
function serviceSelection() {
    const serviceSelect = document.getElementById('serviceSelect');
    
    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active from all
            serviceCards.forEach(c => c.classList.remove('active'));
            
            // Add to clicked
            this.classList.add('active');
            
            // Update form
            const serviceName = this.querySelector('h3').textContent;
            const serviceCategory = this.dataset.service;
            
            if (serviceSelect) {
                serviceSelect.value = serviceName;
            }
            document.getElementById('serviceCategory').value = serviceCategory;
            document.getElementById('problem').placeholder = `${serviceName.toLowerCase()} issue...`;
            
            // Scroll to form with offset
            setTimeout(() => {
                document.getElementById('booking').scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 200);
        });
    });
}

// ========================================
// FADE IN OBSERVER
// ========================================
function fadeInObserver() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in, .service-card, .stat-card, .process-step, .guarantee-card, .testimonial-card').forEach(el => {
        observer.observe(el);
    });
}

// ========================================
// STATS COUNTER ANIMATION
// ========================================
function statsCounter() {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.7 });

    statsObserver.observe(document.querySelector('.quick-stats'));
}

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number:not(.no-counter)');
    
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target')) || parseFloat(counter.textContent);
        const suffix = counter.getAttribute('data-suffix') || '';
        let current = 0;
        const increment = target / 120;
        const duration = 2000;
        const stepTime = Math.abs(Math.floor(duration / (target / increment)));
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target + suffix;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + suffix;
            }
        }, stepTime);
    });
}

// ========================================
// FORM VALIDATION & SUBMISSION
// ========================================
function formValidation() {
    const form = document.getElementById('bookingForm');
    const formMessage = document.getElementById('formMessage');
    const phoneInput = document.getElementById('phone');

    // Real-time phone validation
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('91')) {
            value = value.substring(2);
        }
        e.target.value = value ? '+91 ' + value : '';
    });

    phoneInput.addEventListener('blur', (e) => {
        const phone = e.target.value.replace(/\D/g, '');
        const phoneRegex = /^[6-9]\d{9}$/;
        
        if (phone.length === 10 && phoneRegex.test(phone)) {
            e.target.style.borderColor = '#10B981';
        } else if (phone.length > 0) {
            showMessage('Please enter valid 10-digit mobile number', 'error');
            e.target.style.borderColor = '#EF4444';
        }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Backend submission
            const response = await fetch('https://vashisth-local-services-backend.onrender.com/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('✅ Booking confirmed! Specialist calling in 15 mins.', 'success');
                form.reset();
                serviceCards.forEach(c => c.classList.remove('active'));
                
                // WhatsApp notification
                setTimeout(() => {
                    const message = `New Booking: ${data.fullName} (${data.phone}) - ${data.serviceSelect || data.serviceCategory}`;
                    window.open(`https://wa.me/919315414195?text=${encodeURIComponent(message)}`, '_blank');
                }, 1500);
                
            } else {
                throw new Error(result.message || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking Error:', error);
            showMessage('❌ Network error. Please call 9315414195 directly.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function validateForm() {
    const phone = document.getElementById('phone').value.replace(/\D/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    
    if (!phoneRegex.test(phone)) {
        showMessage('Please enter valid 10-digit mobile number', 'error');
        return false;
    }
    return true;
}

function showMessage(message, type) {
    const formMessage = document.getElementById('formMessage');
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    
    setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = '';
    }, 5000);
}

// ========================================
// HEADER SCROLL EFFECT
// ========================================
function headerScrollEffect() {
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(13, 148, 136, 0.98)';
            header.style.backdropFilter = 'blur(20px)';
            header.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
        } else {
            header.style.background = 'rgba(13, 148, 136, 0.95)';
            header.style.backdropFilter = 'blur(20px)';
            header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
        }
    });
}

// ========================================
// TESTIMONIAL SLIDER
// ========================================
function testimonialSlider() {
    const testimonials = document.querySelectorAll('.testimonial-card');
    let current = 0;
    
    setInterval(() => {
        testimonials[current].style.opacity = '0';
        testimonials[current].style.transform = 'translateX(50px)';
        
        current = (current + 1) % testimonials.length;
        
        testimonials[current].style.opacity = '1';
        testimonials[current].style.transform = 'translateX(0)';
    }, 5000);
}

// ========================================
// DATE PICKER MIN TODAY
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('preferredDate').setAttribute('min', today);
    
    // Set data-target for counters
    document.querySelectorAll('.stat-number').forEach(stat => {
        const text = stat.textContent;
        stat.setAttribute('data-target', parseFloat(text.replace(/[^0-9.]/g, '')));
        stat.setAttribute('data-suffix', text.replace(/[0-9.]/g, ''));
    });
});

// ========================================
// PARALLAX EFFECT FOR HERO
// ========================================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
        heroBg.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});
