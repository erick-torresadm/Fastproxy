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

    // Manipulação do formulário de contato
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('form-success');
    const formError = document.getElementById('form-error');
    const tryAgainBtn = document.getElementById('try-again');
    
    if (contactForm) {
        // Mascarar campo de telefone
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) {
                    value = value.substring(0, 11);
                }
                
                // Formatação (XX) XXXXX-XXXX
                if (value.length > 0) {
                    value = '(' + value;
                    
                    if (value.length > 3) {
                        value = value.substring(0, 3) + ') ' + value.substring(3);
                    }
                    
                    if (value.length > 10) {
                        value = value.substring(0, 10) + '-' + value.substring(10);
                    }
                }
                
                e.target.value = value;
            });
        }
        
        // Validação e envio do formulário
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validação básica
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();
            
            if (!name || !email || !phone || !subject || !message) {
                alert('Por favor, preencha todos os campos do formulário.');
                return;
            }
            
            // Validação de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Por favor, insira um endereço de e-mail válido.');
                return;
            }
            
            // Simulação de envio do formulário
            // Em uma implementação real, aqui seria feita uma requisição AJAX para o backend
            
            // Mostrar indicador de carregamento
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;
            
            // Simulação de tempo de processamento
            setTimeout(function() {
                // Simulação de resposta bem-sucedida (para demonstração)
                const isSuccess = Math.random() > 0.2; // 80% de chance de sucesso
                
                if (isSuccess) {
                    contactForm.style.display = 'none';
                    formSuccess.style.display = 'block';
                    
                    // Limpar o formulário
                    contactForm.reset();
                } else {
                    contactForm.style.display = 'none';
                    formError.style.display = 'block';
                }
                
                // Restaurar botão
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }, 1500);
        });
        
        // Botão "Tentar novamente"
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', function() {
                formError.style.display = 'none';
                contactForm.style.display = 'block';
            });
        }
    }
    
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