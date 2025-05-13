document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Scroll to top functionality
    const scrollTopBtn = document.querySelector('.scroll-top');
    
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Show/hide scroll to top button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });
    }
    
    // Toggle entre planos mensais e anuais
    const toggleSwitch = document.querySelector('.toggle-switch');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const annualPrices = document.querySelectorAll('.annual-price');
    
    if (toggleSwitch) {
        toggleSwitch.addEventListener('click', function() {
            toggleOptions.forEach(option => {
                option.classList.toggle('active');
            });
            
            const isAnnual = toggleOptions[1].classList.contains('active');
            
            if (isAnnual) {
                monthlyPrices.forEach(price => price.style.display = 'none');
                annualPrices.forEach(price => price.style.display = 'block');
            } else {
                monthlyPrices.forEach(price => price.style.display = 'block');
                annualPrices.forEach(price => price.style.display = 'none');
            }
            
            // Atualizar links de checkout para planos anuais/mensais
            const checkoutLinks = document.querySelectorAll('.pricing-footer a');
            checkoutLinks.forEach(link => {
                const url = new URL(link.href);
                
                if (isAnnual) {
                    url.searchParams.set('billing', 'annual');
                } else {
                    url.searchParams.set('billing', 'monthly');
                }
                
                link.href = url.toString();
            });
        });
    }
    
    // Animação ao scroll para cards de preços
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.85
        );
    }
    
    function animateOnScroll() {
        pricingCards.forEach((card, index) => {
            if (isInViewport(card) && !card.classList.contains('animated')) {
                // Adiciona um delay escalonado para cada card
                setTimeout(() => {
                    card.classList.add('animated', 'fade-in-up');
                }, index * 150);
            }
        });
    }
    
    // Executar no carregamento inicial
    animateOnScroll();
    
    // Adicionar listener de scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Expandir/colapsar FAQ
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            faqItem.classList.toggle('active');
        });
    });
    
    // Smooth scroll para links de âncora
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
                
                // Fechar menu mobile se estiver aberto
                if (mobileMenu.classList.contains('active')) {
                    mobileMenuBtn.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    document.body.classList.remove('menu-open');
                }
            }
        });
    });
}); 