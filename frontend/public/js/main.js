/**
 * FastProxy - Script principal compartilhado entre todas as páginas
 * Este arquivo contém funcionalidades comuns usadas em todo o site
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Fechar menu ao clicar em um link
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (mobileMenu && !mobileMenu.contains(event.target) && 
            mobileMenuBtn && !mobileMenuBtn.contains(event.target) && 
            mobileMenu.classList.contains('active')) {
            mobileMenuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
    
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
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animações ao entrar na viewport (elementos com classe .fade-in-element)
    function animateOnScroll() {
        const elements = document.querySelectorAll('.fade-in-element');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 50) {
                element.classList.add('visible');
            }
        });
    }
    
    // Iniciar animações e adicionar listener de scroll
    animateOnScroll();
    document.addEventListener('scroll', animateOnScroll);
    
    // Marcar item do menu atual como ativo
    function setActiveMenuLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.desktop-nav a, .mobile-menu a');
        
        navLinks.forEach(link => {
            // Remove active class de todos os links
            link.classList.remove('active');
            
            // Adiciona active class para o link atual
            const linkPath = link.getAttribute('href');
            
            if (currentPath === linkPath || 
                (currentPath === '/' && linkPath === '/') || 
                (currentPath !== '/' && linkPath !== '/' && currentPath.includes(linkPath))) {
                link.classList.add('active');
            }
        });
    }
    
    // Marcar link do menu atual
    setActiveMenuLink();
}); 