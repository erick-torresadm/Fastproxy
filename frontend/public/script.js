// Função para aplicar descontos por volume
function updateVolumeDiscount(numQuantity, totalPrice) {
    let discountInfo = '';
    
    if (numQuantity >= 50) {
        const discount = 0.15; // 15% de desconto
        const discountAmount = totalPrice * discount;
        totalPrice -= discountAmount;
        discountInfo = `Desconto de 15% aplicado`;
    } else if (numQuantity >= 20) {
        const discount = 0.1; // 10% de desconto
        const discountAmount = totalPrice * discount;
        totalPrice -= discountAmount;
        discountInfo = `Desconto de 10% aplicado`;
    } else if (numQuantity >= 10) {
        const discount = 0.05; // 5% de desconto
        const discountAmount = totalPrice * discount;
        totalPrice -= discountAmount;
        discountInfo = `Desconto de 5% aplicado`;
    }
    
    return { totalPrice, discountInfo };
}

// Definir constantes globais para preços
const ORIGINAL_PRICE = 39.90;
const DISCOUNT_PRICE = 14.90;
const YEARLY_DISCOUNT = 2; // 2 meses grátis no plano anual
const WHATSAPP_NUMBER = '5500000000000'; // Número de contato WhatsApp (configurável)

// Variáveis globais para controle do estado
let currentPlanType = 'monthly';
let quantity = 1;

// Lógica para timer e escassez
function checkOfferValidity() {
    // Verificar data do localStorage
    try {
        const offerData = JSON.parse(localStorage.getItem('proxyOffer') || '{}');
        const currentTime = new Date().getTime();
        
        // Se não existir data ou a data for inválida, criar nova oferta
        if (!offerData.endTime || offerData.endTime < currentTime) {
            // Verificar a última expiração para decidir se é período de oferta ou não
            if (offerData.lastExpired) {
                const hoursSinceExpired = (currentTime - offerData.lastExpired) / (1000 * 60 * 60);
                
                // Se passaram menos de 24 horas desde a última expiração, manter preço normal
                if (hoursSinceExpired < 24) {
                    return false;
                }
            }
            
            // Criar nova oferta por 5 horas
            const newEndTime = currentTime + (5 * 60 * 60 * 1000);
            localStorage.setItem('proxyOffer', JSON.stringify({
                endTime: newEndTime
            }));
            
            return true;
        }
        
        // Oferta ainda é válida
        return true;
    } catch (error) {
        console.error('Erro ao verificar validade da oferta:', error);
        return true; // Em caso de erro, mostrar o preço promocional
    }
}

// Função para calcular o preço total atual
function calculateTotalPrice() {
    // Garantir que a quantidade seja um número válido
    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity < 1) {
        return 0;
    }
    
    let totalPrice;
    
    if (currentPlanType === 'monthly') {
        totalPrice = DISCOUNT_PRICE * numQuantity;
        
        // Aplicar descontos por volume usando a função existente
        const result = updateVolumeDiscount(numQuantity, totalPrice);
        totalPrice = result.totalPrice;
    } else {
        // Plano anual
        const monthsToCharge = 12 - YEARLY_DISCOUNT;
        totalPrice = DISCOUNT_PRICE * monthsToCharge * numQuantity;
    }
    
    return totalPrice;
}

// Atualizar exibição de preço base
function updatePriceDisplay(isOfferActive = true) {
    const priceMainElement = document.querySelector('.price-main');
    const pricePeriodElement = document.querySelector('.price-period');
    if (priceMainElement && pricePeriodElement) {
        const currentPrice = isOfferActive ? DISCOUNT_PRICE : ORIGINAL_PRICE;
        if (currentPlanType === 'monthly') {
            priceMainElement.textContent = `R$ ${currentPrice.toFixed(2).replace('.', ',')}`;
            pricePeriodElement.textContent = 'por proxy / mês';
        } else {
            const yearlyPrice = currentPrice * (12 - YEARLY_DISCOUNT);
            priceMainElement.textContent = `R$ ${yearlyPrice.toFixed(2).replace('.', ',')}`;
            pricePeriodElement.textContent = 'por proxy / ano';
        }
        // Atualizar badge de desconto
        const discountBadge = document.querySelector('.discount-percentage');
        if (discountBadge && isOfferActive) {
            const discountPercentage = Math.round(((ORIGINAL_PRICE - DISCOUNT_PRICE) / ORIGINAL_PRICE) * 100);
            discountBadge.textContent = `-${discountPercentage}%`;
            discountBadge.style.display = 'flex';
        } else if (discountBadge) {
            discountBadge.style.display = 'none';
        }
    }
}

// Calcular e atualizar o preço total
function updateTotalPrice() {
    const totalAmountElement = document.getElementById('total-amount');
    const discountInfoElement = document.getElementById('discount-info');
    if (totalAmountElement) {
        // Garantir que a quantidade seja um número inteiro válido
        const numQuantity = parseInt(quantity);
        if (isNaN(numQuantity) || numQuantity < 1) {
            console.error('Quantidade inválida:', quantity);
            return 0;
        }
        let totalPrice;
        let discountInfo = '';
        if (currentPlanType === 'monthly') {
            totalPrice = DISCOUNT_PRICE * numQuantity;
            // Aplicar descontos por volume em planos mensais usando a função existente
            const result = updateVolumeDiscount(numQuantity, totalPrice);
            totalPrice = result.totalPrice;
            discountInfo = result.discountInfo;
        } else {
            // Plano anual (12 meses - 2 meses grátis)
            const monthsToCharge = 12 - YEARLY_DISCOUNT;
            totalPrice = DISCOUNT_PRICE * monthsToCharge * numQuantity;
            discountInfo = `${YEARLY_DISCOUNT} meses grátis por ano`;
        }
        // Atualizar exibição
        totalAmountElement.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        if (discountInfoElement) {
            discountInfoElement.textContent = discountInfo;
        }
        // Atualizar dados no modal
        updateModalData(totalPrice);
        // Atualizar link do WhatsApp
        updateWhatsAppLink(totalPrice);
        console.log(`Preço total atualizado: R$ ${totalPrice.toFixed(2).replace('.', ',')} (Qtd: ${numQuantity}, Plano: ${currentPlanType})`);
        return totalPrice;
    }
    return 0;
}

// Atualizar link do WhatsApp com os detalhes da compra
function updateWhatsAppLink(totalPrice) {
    const whatsappButton = document.querySelector('.btn-whatsapp');
    if (whatsappButton) {
        // Garantir que a quantidade seja um número válido
        const numQuantity = parseInt(quantity);
        if (isNaN(numQuantity) || numQuantity < 1) {
            console.error('Quantidade inválida para WhatsApp:', quantity);
            return;
        }
        const planName = currentPlanType === 'monthly' ? 'mensal' : 'anual';
        const message = `Olá, tenho interesse em comprar ${numQuantity} proxy(s) no plano ${planName} por R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
        whatsappButton.href = whatsappURL;
    }
}

// Atualizar dados no modal
function updateModalData(totalPrice) {
    const modalQuantity = document.getElementById('modal-quantity');
    const modalPrice = document.getElementById('modal-price');
    const modalPeriod = document.getElementById('modal-period');
    const modalTotal = document.getElementById('modal-total');
    if (!modalQuantity || !modalPrice || !modalPeriod || !modalTotal) {
        return;
    }
    // Garantir que a quantidade seja um número válido
    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity < 1) {
        console.error('Quantidade inválida para modal:', quantity);
        return;
    }
    // Atualizar quantidade exibida
    modalQuantity.textContent = `${numQuantity}x`;
    // Determinar o preço unitário
    let unitPrice;
    if (currentPlanType === 'monthly') {
        unitPrice = DISCOUNT_PRICE;
        modalPeriod.textContent = 'Cobrança Mensal';
    } else {
        // Calcular preço anual (12 meses - 2 meses grátis)
        const monthsToCharge = 12 - YEARLY_DISCOUNT;
        unitPrice = DISCOUNT_PRICE * monthsToCharge;
        modalPeriod.textContent = 'Cobrança Anual (2 meses grátis)';
    }
    // Atualizar preço unitário
    modalPrice.textContent = `R$ ${unitPrice.toFixed(2).replace('.', ',')}`;
    // Atualizar preço total
    modalTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
    console.log(`Modal atualizado: ${numQuantity}x proxies no plano ${currentPlanType}, total: R$ ${totalPrice.toFixed(2)}`);
}

function initializePromotionalPrices() {
    const isActive = checkOfferValidity();
    
    // Atualizar elementos de preço original e com desconto
    const originalPriceElement = document.getElementById('original-price');
    if (originalPriceElement) {
        originalPriceElement.textContent = `R$ ${ORIGINAL_PRICE.toFixed(2).replace('.', ',')}`;
    }
    
    // Atualizar preços na calculadora
    updatePriceDisplay(isActive);
    updateTotalPrice();
}

// Função para lidar com o checkout
async function handleCheckout(paymentMethod = 'card') {
    try {
        // Garantir que a quantidade seja um número inteiro válido
        const numQuantity = parseInt(quantity);
        if (isNaN(numQuantity) || numQuantity < 1) {
            throw new Error('Quantidade inválida. Por favor, selecione pelo menos 1 proxy.');
        }

        // Desabilitar o botão de checkout para evitar cliques múltiplos
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.disabled = true;
            checkoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        }
        
        // Fechar o modal se estiver aberto
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal && checkoutModal.style.display === 'flex') {
            checkoutModal.style.display = 'none';
        }
        
        // Mostrar indicador de carregamento
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        const errorElement = document.getElementById('checkout-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        // Calcular o preço total
        const totalPrice = calculateTotalPrice();
        console.log(`Preço total calculado: ${totalPrice}`);
        
        // URL da API para criar assinatura - usando URL relativa para segurança
        const apiUrl = '/api/create-subscription';
        
        // Criar dados do checkout
        const checkoutData = {
            quantity: numQuantity,
            planType: currentPlanType === 'monthly' ? 'monthly' : 'yearly'
        };
        
        console.log('Enviando dados para criação de assinatura:', checkoutData);
        
        try {
            // Fazer a requisição ao servidor
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checkoutData),
            });
            
            // Verificar se a resposta tem o formato JSON 
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta inválida do servidor - formato não é JSON');
            }
            
            // Esconder indicador de carregamento
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                
                // Verificar se o erro está relacionado à chave do Stripe
                if (errorData.details && (
                    errorData.details.includes('Invalid API Key') || 
                    errorData.details.includes('SuaChaveSecretaDoStripe')
                )) {
                    throw new Error('Chave da API Stripe inválida. Configure uma chave válida no arquivo .env do backend.');
                }
                
                throw new Error(errorData.error || 'Erro ao criar assinatura');
            }
            
            const data = await response.json();
            console.log('Resposta do servidor:', data);
            
            if (data && data.url) {
                // Mostrar mensagem de redirecionamento
                if (checkoutButton) {
                    checkoutButton.innerHTML = '<i class="fas fa-external-link-alt"></i> Redirecionando...';
                }
                
                // Redirecionar para a página de checkout do Stripe
                console.log('Redirecionando para:', data.url);
                window.location.href = data.url;
            } else {
                throw new Error('URL de checkout não encontrada na resposta');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            
            // Redirecionar para a página de erro com a mensagem
            const errorMessage = encodeURIComponent(error.message || 'Erro ao processar pagamento');
            window.location.href = `/stripe-erro.html?error=${errorMessage}`;
            
            throw new Error(`Erro ao processar pagamento: ${error.message}`);
        }
    } catch (error) {
        console.error('Erro no checkout:', error);
        
        // Esconder indicador de carregamento em caso de erro
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Mostrar mensagem de erro
        const errorElement = document.getElementById('checkout-error');
        if (errorElement) {
            errorElement.textContent = error.message || 'Erro ao processar pagamento. Tente novamente.';
            errorElement.style.display = 'block';
        } else {
            // Fallback para alert
            alert('Erro: ' + error.message);
        }
        
        // Reabilitar o botão de checkout
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.innerHTML = 'Finalizar Compra';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Menu mobile toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Fechar menu ao clicar em um link
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target) && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
        }
    });
    
    // Animação 3D do notebook na hero section
    const notebook = document.querySelector('.hero-image img');
    const heroSection = document.querySelector('.hero');
    
    if (notebook && heroSection) {
        // Desativar a animação padrão quando o mouse estiver sobre a seção hero
        heroSection.addEventListener('mouseenter', () => {
            notebook.style.animation = 'none';
        });
        
        // Reativar a animação padrão quando o mouse sair da seção hero
        heroSection.addEventListener('mouseleave', () => {
            notebook.style.animation = 'notebook-float 6s ease-in-out infinite';
            notebook.style.transform = 'rotateY(0deg) rotateX(0deg)';
        });
        
        // Efeito 3D com o movimento do mouse
        heroSection.addEventListener('mousemove', (e) => {
            // Verificar se a animação está desativada
            if (notebook && notebook.style.animation === 'none') {
                const rect = heroSection.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Calcular a posição relativa do mouse
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Calcular a rotação com base na posição do mouse
                const rotateY = ((mouseX - centerX) / centerX) * 8; // -8 a 8 graus
                const rotateX = ((centerY - mouseY) / centerY) * 5; // -5 a 5 graus
                
                // Aplicar a rotação
                notebook.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
                
                // Atualizar efeito de luz baseado na posição do mouse
                const lightX = (mouseX / rect.width) * 100;
                const lightY = (mouseY / rect.height) * 100;
                notebook.style.backgroundImage = `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)`;
            }
        });
        
        // Adicionar efeito de reflexo
        addReflectionEffect();
    }
    
    // Pricing Calculator Functions
    const proxyQuantityInput = document.getElementById('proxy-quantity');
    const decreaseBtn = document.getElementById('decrease-btn');
    const increaseBtn = document.getElementById('increase-btn');
    const totalAmountElement = document.getElementById('total-amount');
    const discountInfoElement = document.getElementById('discount-info');
    const priceMainElement = document.querySelector('.price-main');
    const pricePeriodElement = document.querySelector('.price-period');
    const planTypeButtons = document.querySelectorAll('.plan-type-btn');
    const checkoutButton = document.getElementById('checkout-button');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeModal = document.querySelector('.close-modal');
    
    // Verificar se elementos existem (para evitar erros)
    if (proxyQuantityInput) {
        proxyQuantityInput.value = quantity;
    }
    
    // Verificar se oferta está ativa
    const isOfferActive = checkOfferValidity();
    
    // Atualizar preços iniciais
    initializePromotionalPrices();
    
    // Atualizar quando o input for alterado diretamente
    if (proxyQuantityInput) {
        proxyQuantityInput.addEventListener('input', function() {
            const newValue = parseInt(proxyQuantityInput.value) || 0;
            if (newValue >= 1 && newValue <= 100) {
                quantity = newValue;
            } else if (newValue < 1) {
                quantity = 1;
                proxyQuantityInput.value = 1;
            } else if (newValue > 100) {
                quantity = 100;
                proxyQuantityInput.value = 100;
            }
            updateTotalPrice();
        });
    }
    
    // Atualizar quantidade com os botões + e -
    if (decreaseBtn && increaseBtn && proxyQuantityInput) {
        // Botão de diminuir quantidade
        decreaseBtn.addEventListener('click', function(event) {
            event.preventDefault();
            if (quantity > 1) {
                quantity--;
                proxyQuantityInput.value = quantity;
                updateTotalPrice();
                console.log('Quantidade diminuída para:', quantity);
            }
        });
        
        // Botão de aumentar quantidade
        increaseBtn.addEventListener('click', function(event) {
            event.preventDefault();
            if (quantity < 100) {
                quantity++;
                proxyQuantityInput.value = quantity;
                updateTotalPrice();
                console.log('Quantidade aumentada para:', quantity);
            }
        });
    }
    
    // Alternar entre planos
    if (planTypeButtons.length) {
        planTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const planType = btn.getAttribute('data-plan-type');
                
                // Atualizar botões
                planTypeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Atualizar tipo de plano
                currentPlanType = planType;
                
                // Atualizar exibição de preço
                updatePriceDisplay(checkOfferValidity());
                updateTotalPrice();
            });
        });
    }
    
    // Botão de checkout (para modal)
    if (checkoutButton) {
        checkoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Iniciar checkout direto com o Stripe
            handleCheckout('card');
        });
    }
    
    // Fechar modal ao clicar no X
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn && checkoutModal) {
        closeModalBtn.addEventListener('click', function() {
            checkoutModal.style.display = 'none';
        });
    }
    
    // Fechar modal ao clicar fora dele
    window.addEventListener('click', function(e) {
        if (checkoutModal && e.target === checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    });
    
    // Botão de pagamento com cartão no modal
    const stripePaymentBtn = document.getElementById('stripe-payment');
    if (stripePaymentBtn) {
        stripePaymentBtn.addEventListener('click', function() {
            handleCheckout('card');
        });
    }
    
    // Configurar botões de pagamento alternativos
    setupAlternativePaymentButtons();
    
    function setupAlternativePaymentButtons() {
        const pixPaymentBtn = document.getElementById('pix-payment');
        const whatsappPaymentBtn = document.getElementById('whatsapp-payment');
        
        if (pixPaymentBtn) {
            pixPaymentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('O pagamento via Pix será processado em uma nova tela!');
                // Implementar redirecionamento para Pix
                handleCheckout('pix');
            });
        }
        
        if (whatsappPaymentBtn) {
            whatsappPaymentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const planName = currentPlanType === 'monthly' ? 'mensal' : 'anual';
                const totalPrice = calculateTotalPrice();
                
                // Garantir que a quantidade seja um número válido
                const numQuantity = parseInt(quantity);
                if (isNaN(numQuantity) || numQuantity < 1) {
                    console.error('Quantidade inválida para WhatsApp:', quantity);
                    return;
                }
                
                const message = `Olá, gostaria de comprar ${numQuantity} proxy(s) no plano ${planName} por R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
                const encodedMessage = encodeURIComponent(message);
                window.location.href = `https://wa.me/5511999999999?text=${encodedMessage}`;
            });
        }
    }
    
    // Inicializar calculadora
    updatePriceDisplay();
    updateTotalPrice();
    
    // Função para configurar redirecionamento de login
    setupLoginRedirect();
    
    // Adicionar novas inicializações
    setupVideoPlayer();
    setupFAQ();
    
    // Lógica para recuperar parâmetros da URL e configurar checkout
    function getURLParams() {
        const urlParams = {};
        // Sanitizar os parâmetros da URL antes de utilizá-los
        const sanitizeParam = (param) => {
            // Remover caracteres potencialmente perigosos
            if (typeof param === 'string') {
                return param
                    .replace(/[^\w\s.,;:+-]/gi, '') // Permitir apenas caracteres seguros
                    .trim();
            }
            return '';
        };
        
        // Obter parâmetros de forma segura
        try {
            const queryString = window.location.search;
            const searchParams = new URLSearchParams(queryString);
            
            // Processar parâmetros de forma segura
            for (const [key, value] of searchParams.entries()) {
                urlParams[key] = sanitizeParam(value);
            }
        } catch (error) {
            console.error('Erro ao processar parâmetros da URL:', error);
        }
        
        return urlParams;
    }
    
    // Verificar parâmetros da URL ao carregar a página
    const urlParams = getURLParams();
    if (urlParams && urlParams.session_id) {
        const sessionId = urlParams.session_id;
        // Verificar se o sessionId parece válido antes de usá-lo
        if (/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
            // Processar o ID da sessão do Stripe
            console.log('Checkout concluído, session ID:', sessionId);
        }
    }
    
    // Definição da função animateOnScroll
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.fade-in-element');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 50) {
                element.classList.add('visible');
            }
        });
    };
    
    // Animações ao rolar a página
    document.addEventListener('scroll', animateOnScroll);
    
    // Iniciar animação ao carregar a página
    animateOnScroll();
});

// Função para adicionar efeito de reflexo nos elementos
function addReflectionEffect() {
    const videoContainer = document.querySelector('.video-container');
    const videoReflection = document.querySelector('.video-reflection');
    
    if (videoContainer && videoReflection) {
        // Clonar o conteúdo para o reflexo
        const observer = new MutationObserver(() => {
            // Atualizar o reflexo com base no conteúdo atual
            videoReflection.style.backgroundImage = `linear-gradient(to bottom, rgba(255, 255, 255, 0.1), transparent), url('${getComputedStyle(videoContainer).backgroundImage}')`;
        });
        
        // Observar mudanças no container do vídeo
        observer.observe(videoContainer, { attributes: true, childList: true, subtree: true });
    }
}

// Configura o player de vídeo na seção hero
function setupVideoPlayer() {
    const heroVideo = document.getElementById('hero-video');
    const playBtn = document.getElementById('play-video');
    const videoOverlay = document.querySelector('.video-overlay');
    
    if (heroVideo && playBtn && videoOverlay) {
        playBtn.addEventListener('click', function() {
            // Reproduzir vídeo
            heroVideo.src += '&autoplay=1';
            
            // Esconder o overlay após clicar no play
            videoOverlay.style.opacity = '0';
            setTimeout(() => {
                videoOverlay.style.display = 'none';
            }, 500);
        });
    }
}

// Configura a interatividade da seção de FAQ
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon i');
        
        if (question && answer && icon) {
            question.addEventListener('click', () => {
                // Verificar se este item já está aberto
                const isOpen = item.classList.contains('active');
                
                // Fechar todos os itens
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherIcon = otherItem.querySelector('.faq-icon i');
                    
                    if (otherAnswer && otherIcon) {
                        otherAnswer.style.maxHeight = null;
                        otherIcon.className = 'fas fa-chevron-down';
                    }
                });
                
                // Se o item clicado não estava aberto, abri-lo
                if (!isOpen) {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    icon.className = 'fas fa-chevron-up';
                }
            });
        }
    });
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('offer-timer');
    if (!timerElement) return;
    
    try {
        const offerData = JSON.parse(localStorage.getItem('proxyOffer') || '{}');
        if (!offerData.endTime) return;
        
        const currentTime = new Date().getTime();
        const timeLeft = offerData.endTime - currentTime;
        
        if (timeLeft <= 0) {
            // Oferta expirou
            timerElement.textContent = '';
            const expiredSpan = document.createElement('span');
            expiredSpan.className = 'expired';
            expiredSpan.textContent = 'Oferta expirada!';
            timerElement.appendChild(expiredSpan);
            
            // Registrar quando expirou
            localStorage.setItem('proxyOffer', JSON.stringify({
                lastExpired: currentTime
            }));
            
            // Atualizar preços para valores normais
            updatePriceDisplay(false);
            updateTotalPrice();
            
            return;
        }
        
        // Calcular horas, minutos e segundos restantes
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Limpar conteúdo anterior
        timerElement.innerHTML = '';
        
        // Criar e adicionar os elementos com segurança
        const createTimerUnit = (value, label) => {
            const unitDiv = document.createElement('div');
            unitDiv.className = 'timer-unit';
            
            const numberSpan = document.createElement('span');
            numberSpan.className = 'timer-number';
            numberSpan.textContent = value.toString().padStart(2, '0');
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'timer-label';
            labelSpan.textContent = label;
            
            unitDiv.appendChild(numberSpan);
            unitDiv.appendChild(labelSpan);
            
            return unitDiv;
        };
        
        const createSeparator = () => {
            const separator = document.createElement('div');
            separator.className = 'timer-separator';
            separator.textContent = ':';
            return separator;
        };
        
        // Adicionar unidades e separadores ao timer
        timerElement.appendChild(createTimerUnit(hours, 'horas'));
        timerElement.appendChild(createSeparator());
        timerElement.appendChild(createTimerUnit(minutes, 'min'));
        timerElement.appendChild(createSeparator());
        timerElement.appendChild(createTimerUnit(seconds, 'seg'));
    } catch (error) {
        console.error('Erro ao atualizar timer:', error);
    }
}

// Iniciar o timer e atualizá-lo a cada segundo
updateTimerDisplay();
setInterval(updateTimerDisplay, 1000);

// Função para configurar redirecionamento de login
function setupLoginRedirect() {
    // Corrigir o seletor inválido
    const loginButtons = document.querySelectorAll('a[href="/login"], a[href="/acessar"]');
    
    loginButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'http://localhost:3000/maintenance.html';
        });
    });
}

// Carregar GSAP através de CDN
const loadGSAP = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar GSAP'));
    document.body.appendChild(script);
  });
};

// Inicializar animações avançadas com GSAP
const initAdvancedAnimations = () => {
  const laptop = document.querySelector('.hero-image img');
  const heroImage = document.querySelector('.hero-image');
  
  if (!laptop || !heroImage || !window.gsap) return;
  
  // Criar glow effects
  const createGlowEffects = () => {
    // Remover glows existentes
    const existingGlows = heroImage.querySelectorAll('.laptop-glow');
    existingGlows.forEach(glow => glow.remove());
    
    // Adicionar múltiplos elementos de glow para efeito mais rico
    for (let i = 0; i < 3; i++) {
      const glow = document.createElement('div');
      glow.classList.add('laptop-glow', `glow-${i}`);
      heroImage.appendChild(glow);
      
      // Estilizar cada glow
      Object.assign(glow.style, {
        position: 'absolute',
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        filter: `blur(${30 + i * 10}px)`,
        opacity: 0.15 - i * 0.03,
        zIndex: -1,
        background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))'
      });
      
      // Posicionar cada glow ligeiramente deslocado para criar efeito de profundidade
      gsap.set(glow, {
        left: `${10 - i * 7}%`,
        top: `${10 - i * 5}%`
      });
    }
  };
  
  // Inicializar animações
  const initAnimations = () => {
    // Animação do laptop
    gsap.fromTo(laptop, 
      { y: 30, opacity: 0, rotationY: 15, scale: 0.95 },
      { 
        y: 0, 
        opacity: 1, 
        rotationY: 0, 
        scale: 1, 
        duration: 1.2, 
        ease: "power3.out"
      }
    );
    
    // Animação dos glows
    heroImage.querySelectorAll('.laptop-glow').forEach((glow, index) => {
      gsap.to(glow, {
        scale: 1.1 + index * 0.1,
        opacity: 0.15 - index * 0.03,
        duration: 2 + index,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.3
      });
      
      // Adicionar movimento leve
      gsap.to(glow, {
        x: `+=${10 + index * 5}`,
        y: `+=${5 + index * 3}`,
        duration: 5 + index * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.5
      });
    });
    
    // Animação de hover para o laptop
    heroImage.addEventListener('mouseenter', () => {
      gsap.to(laptop, {
        y: -10,
        scale: 1.03,
        rotationY: 5,
        duration: 0.5,
        ease: "power2.out"
      });
      
      heroImage.querySelectorAll('.laptop-glow').forEach(glow => {
        gsap.to(glow, {
          scale: 1.15,
          opacity: "+= 0.05",
          duration: 0.5
        });
      });
    });
    
    heroImage.addEventListener('mouseleave', () => {
      gsap.to(laptop, {
        y: 0,
        scale: 1,
        rotationY: 0,
        duration: 0.5,
        ease: "power2.out"
      });
      
      heroImage.querySelectorAll('.laptop-glow').forEach((glow, index) => {
        gsap.to(glow, {
          scale: 1.1 + index * 0.1,
          opacity: 0.15 - index * 0.03,
          duration: 0.5
        });
      });
    });
  };
  
  // Executar setup
  createGlowEffects();
  initAnimations();
};

// Executar animações avançadas após carregar a página
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await loadGSAP();
    initAdvancedAnimations();
  } catch (error) {
    console.error('Erro ao inicializar animações:', error);
  }
  
  // ... existing code ...
}); 