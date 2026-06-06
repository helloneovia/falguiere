document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    function toggleMenu() {
        mobileMenu.classList.toggle('active');
        
        // Transform hamburger icon
        const spans = mobileMenuBtn.querySelectorAll('span');
        if (mobileMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    }

    mobileMenuBtn.addEventListener('click', toggleMenu);
    
    // Close mobile menu on link click
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Intersection Observer for fade-in animations
    const fadeElements = document.querySelectorAll('.fade-in-up');
    
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.15
        };
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        fadeElements.forEach(element => {
            observer.observe(element);
        });
    } else {
        // Fallback for older browsers
        fadeElements.forEach(element => {
            element.classList.add('visible');
        });
    }

    // Function to save data to the new API securely
    async function saveToDatabase(endpoint, data) {
        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error('Database error:', e);
        }
    }

    // Function to handle form UI feedback
    function handleFormSubmit(form, apiEndpoint, extractDataCallback) {
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            // Extract data
            const data = extractDataCallback(form);
            
            // Save to database
            await saveToDatabase(apiEndpoint, data);

            btn.textContent = 'Envoi en cours...';
            btn.style.opacity = '0.7';
            
            // Actually submit the form data to FormSubmit
            try {
                if (form.action) {
                    await fetch(form.action, {
                        method: 'POST',
                        body: new FormData(form),
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                }
            } catch (error) {
                console.error('Erreur lors de l\'envoi:', error);
            }
            
            // UI Feedback
            btn.textContent = 'Envoyé avec succès ✓';
            btn.style.backgroundColor = '#10b981'; // Green color for success
            btn.style.borderColor = '#10b981';
            btn.style.opacity = '1';
            
            form.reset();
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
                btn.style.borderColor = '';
            }, 3000);
        });
    }

    // Contact Form
    const contactForm = document.getElementById('contactForm');
    handleFormSubmit(contactForm, '/api/messages', (form) => {
        return {
            name: form.querySelector('#name').value,
            email: form.querySelector('#email').value,
            message: form.querySelector('#message').value
        };
    });

    // Adhesion Form
    const adhesionForm = document.getElementById('adhesionForm');
    handleFormSubmit(adhesionForm, '/api/adhesions', (form) => {
        return {
            name: form.querySelector('#adhesionName').value,
            email: form.querySelector('#adhesionEmail').value,
            phone: form.querySelector('#adhesionPhone').value
        };
    });

    // CMS Loader from API
    async function loadCMS() {
        try {
            const response = await fetch('/api/cms');
            if (!response.ok) return;
            const cmsData = await response.json();
            
            if (Object.keys(cmsData).length > 0) {
                document.querySelectorAll('[data-cms]').forEach(el => {
                    const key = el.getAttribute('data-cms');
                    if (cmsData[key]) {
                        if (el.tagName === 'IMG') {
                            // If wrapped in <picture>, drop the <source> elements so the
                            // CMS-provided image (which may not be a WebP) is used.
                            const picture = el.closest('picture');
                            if (picture) {
                                picture.querySelectorAll('source').forEach(s => s.remove());
                            }
                            el.src = cmsData[key];
                        } else {
                            el.innerHTML = cmsData[key];
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('CMS Loader error:', e);
        }
    }
    
    loadCMS(); // Load CMS data
});
