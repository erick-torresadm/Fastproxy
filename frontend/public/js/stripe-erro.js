/**
 * FastProxy - Script de tratamento de erros do Stripe
 */

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
    
    // Manipulação da exibição de erro
    const errorMessage = document.getElementById('error-message');
    const errorContainer = document.querySelector('.error-content');
    const loadingContainer = document.getElementById('loading-container');
    
    // Função para obter parâmetros da URL
    function getURLParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    // Função para iniciar o processo de exibição do erro com delay
    function initErrorHandling() {
        const errorCode = getURLParameter('code');
        const errorType = getURLParameter('type');
        const errorMsg = getURLParameter('message');
        
        // Oculta a mensagem de erro inicialmente
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
        
        // Exibe o indicador de carregamento
        if (loadingContainer) {
            loadingContainer.style.display = 'flex';
        }
        
        // Após 10 segundos, exibe a mensagem de erro e oculta o indicador de carregamento
        setTimeout(function() {
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }
            
            if (errorContainer) {
                errorContainer.style.display = 'block';
            }
            
            // Se tiver uma mensagem de erro específica, exibe-a
            if (errorMessage && errorMsg) {
                errorMessage.textContent = decodeURIComponent(errorMsg);
            }
            
            // Log do erro para fins de depuração
            console.log('Erro no pagamento:', {
                code: errorCode,
                type: errorType,
                message: errorMsg
            });
            
            // Se estiver em ambiente de produção, envia o erro para o backend
            if (window.location.hostname !== 'localhost') {
                reportErrorToBackend(errorCode, errorType, errorMsg);
            }
        }, 10000); // 10 segundos de delay
    }
    
    // Função para reportar o erro ao backend
    async function reportErrorToBackend(code, type, message) {
        try {
            await fetch('/api/report-payment-error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    type,
                    message,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            });
        } catch (error) {
            console.error('Erro ao reportar problema de pagamento:', error);
        }
    }
    
    // Iniciar processamento de erro
    initErrorHandling();
}); 