document.addEventListener('DOMContentLoaded', function() {
    // Função para sanitizar texto para evitar XSS
    function sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
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
            if (notebook.style.animation === 'none') {
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
    
    // Pricing constants
    const ORIGINAL_PRICE = 39.90;
    const DISCOUNT_PRICE = 14.90;
    const YEARLY_DISCOUNT = 2; // 2 meses grátis no plano anual
    let currentPlanType = 'monthly';
    
    // Quantidade inicial
    let quantity = 1;
    
    // Verificar se oferta está ativa
    const isOfferActive = checkOfferValidity();
    
    // Atualizar preços iniciais
    initializePromotionalPrices();
    
    // Lógica para timer e escassez
    function checkOfferValidity() {
        // Verificar data do localStorage
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
    }
    
    function updateTimerDisplay() {
        const timerElement = document.getElementById('offer-timer');
        if (!timerElement) return;
        
        const offerData = JSON.parse(localStorage.getItem('proxyOffer') || '{}');
        if (!offerData.endTime) return;
        
        const currentTime = new Date().getTime();
        const timeLeft = offerData.endTime - currentTime;
        
        if (timeLeft <= 0) {
            // Oferta expirou
            timerElement.innerHTML = `<span class="expired">Oferta expirada!</span>`;
            
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
        
        // Atualizar timer
        timerElement.innerHTML = `
            <div class="timer-unit">
                <span class="timer-number">${hours.toString().padStart(2, '0')}</span>
                <span class="timer-label">horas</span>
            </div>
            <div class="timer-separator">:</div>
            <div class="timer-unit">
                <span class="timer-number">${minutes.toString().padStart(2, '0')}</span>
                <span class="timer-label">min</span>
            </div>
            <div class="timer-separator">:</div>
            <div class="timer-unit">
                <span class="timer-number">${seconds.toString().padStart(2, '0')}</span>
                <span class="timer-label">seg</span>
            </div>
        `;
    }
    
    // Iniciar o timer e atualizá-lo a cada segundo
    updateTimerDisplay();
    setInterval(updateTimerDisplay, 1000);
    
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
    
    // Atualizar quantidade com os botões + e -
    if (decreaseBtn && increaseBtn && proxyQuantityInput) {
        decreaseBtn.addEventListener('click', () => {
            if (quantity > 1) {
                quantity--;
                proxyQuantityInput.value = quantity;
                updateTotalPrice();
            }
        });
        
        increaseBtn.addEventListener('click', () => {
            if (quantity < 100) {
                quantity++;
                proxyQuantityInput.value = quantity;
                updateTotalPrice();
            }
        });
        
        // Atualizar quando o input for alterado diretamente
        proxyQuantityInput.addEventListener('input', () => {
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
    
    // Atualizar exibição de preço base
    function updatePriceDisplay(isOfferActive = true) {
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
        if (!proxyQuantityInput || !totalAmountElement) return;
        
        // Garantir que quantidade é um número válido
        quantity = parseInt(proxyQuantityInput.value) || 1;
        
        // Limitar quantidade a valores razoáveis
        if (quantity < 1) quantity = 1;
        if (quantity > 100) quantity = 100;
        
        // Atualizar o valor no input
        proxyQuantityInput.value = quantity;
        
        // Calcular preço total
        const totalPrice = calculateTotalPrice();
        
        // Atualizar elemento com o total sanitizado
        totalAmountElement.textContent = sanitizeText(`R$ ${totalPrice.toFixed(2).replace('.', ',')}`);
        
        // Verificar se há desconto por volume
        updateVolumeDiscount(quantity);
        
        // Atualizar link do WhatsApp com o preço total
        updateWhatsAppLink(totalPrice);
        
        // Atualizar dados do modal
        updateModalData(totalPrice);
    }
    
    // Função segura para obter parâmetros da URL
    function getUrlParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return sanitizeText(urlParams.get(param) || '');
    }
    
    // Função para adicionar proteção ao WhatsApp 
    function updateWhatsAppLink(totalPrice) {
        const whatsappBtn = document.getElementById('whatsapp-checkout');
        if (!whatsappBtn) return;
        
        const mensagem = `Olá! Gostaria de adquirir ${quantity} ${quantity === 1 ? 'proxy' : 'proxies'} no plano ${currentPlanType === 'monthly' ? 'mensal' : 'anual'} por R$ ${totalPrice.toFixed(2).replace('.', ',')}.`;
        
        // Criação segura de URL
        const encodedMessage = encodeURIComponent(mensagem);
        whatsappBtn.href = `https://wa.me/5511999999999?text=${encodedMessage}`;
    }
    
    // Atualizar dados no modal
    function updateModalData(totalPrice) {
        const modalQuantity = document.getElementById('modal-quantity');
        const modalPrice = document.getElementById('modal-price');
        const modalTotal = document.getElementById('modal-total');
        const modalPeriod = document.getElementById('modal-period');
        
        if (modalQuantity && modalPrice && modalTotal && modalPeriod) {
            modalQuantity.textContent = `${quantity}x`;
            
            if (currentPlanType === 'monthly') {
                const pricePerUnit = totalPrice / quantity;
                modalPrice.textContent = `R$ ${pricePerUnit.toFixed(2).replace('.', ',')}`;
                modalPeriod.textContent = 'Cobrança Mensal';
            } else {
                const monthsToCharge = 12 - YEARLY_DISCOUNT;
                const pricePerUnit = (DISCOUNT_PRICE * monthsToCharge);
                modalPrice.textContent = `R$ ${pricePerUnit.toFixed(2).replace('.', ',')}`;
                modalPeriod.textContent = 'Cobrança Anual';
            }
            
            modalTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        }
    }
    
    // Checkout modal
    if (checkoutButton && checkoutModal && closeModal) {
        // Abrir modal
        checkoutButton.addEventListener('click', () => {
            // Inicializar o checkout direto com o Stripe
            handleCheckout();
        });
        
        // Fechar modal
        closeModal.addEventListener('click', () => {
            checkoutModal.style.display = 'none';
        });
        
        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === checkoutModal) {
                checkoutModal.style.display = 'none';
            }
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
                const message = `Olá, gostaria de comprar ${quantity} proxy(s) no plano ${planName} por R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
                const encodedMessage = encodeURIComponent(message);
                window.location.href = `https://wa.me/5511999999999?text=${encodedMessage}`;
            });
        }
    }
    
    // Função para calcular o preço total atual
    function calculateTotalPrice() {
        let totalPrice;
        
        if (currentPlanType === 'monthly') {
            totalPrice = DISCOUNT_PRICE * quantity;
            
            // Aplicar descontos por volume
            if (quantity >= 10) {
                totalPrice *= 0.9; // 10% de desconto
            } else if (quantity >= 5) {
                totalPrice *= 0.95; // 5% de desconto
            }
        } else {
            // Plano anual
            const monthsToCharge = 12 - YEARLY_DISCOUNT;
            totalPrice = DISCOUNT_PRICE * monthsToCharge * quantity;
        }
        
        return totalPrice;
    }
    
    // Função para lidar com o checkout
    async function handleCheckout(paymentMethod = 'card') {
        try {
            // Desativar botão durante processamento
            if (checkoutButton) {
                checkoutButton.disabled = true;
                checkoutButton.textContent = 'Processando...';
            }
            
            const quantity = parseInt(proxyQuantityInput.value) || 1;
            // Adicionar validação extra de quantidade
            if (quantity < 1 || quantity > 100) {
                throw new Error('Quantidade inválida. Escolha de 1 a 100 proxies.');
            }
            
            const planType = currentPlanType;
            // Validar planType
            if (planType !== 'monthly' && planType !== 'yearly') {
                throw new Error('Tipo de plano inválido.');
            }
            
            if (paymentMethod === 'card') {
                // Obter chave pública do Stripe do servidor
                const response = await fetch('/stripe-key');
                if (!response.ok) {
                    throw new Error('Erro ao obter chave do Stripe.');
                }
                
                const { publicKey } = await response.json();
                
                // Criar sessão de checkout
                const checkoutResponse = await fetch('/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        quantity,
                        planType,
                        // Adicionar token CSRF aqui se implementado
                    }),
                });
                
                if (!checkoutResponse.ok) {
                    throw new Error('Erro ao criar sessão de checkout.');
                }
                
                const { sessionId } = await checkoutResponse.json();
                
                // Redirecionar para checkout do Stripe
                const stripe = Stripe(publicKey);
                const { error } = await stripe.redirectToCheckout({ sessionId });
                
                if (error) {
                    throw new Error(error.message);
                }
            } else if (paymentMethod === 'pix' || paymentMethod === 'boleto') {
                // Para métodos alternativos, abrir modal com instruções
                if (checkoutModal) {
                    checkoutModal.classList.add('active');
                }
            }
        } catch (error) {
            console.error('Erro no checkout:', error);
            alert(`Erro: ${error.message || 'Ocorreu um erro no processamento do pagamento.'}`);
        } finally {
            // Reativar botão
            if (checkoutButton) {
                checkoutButton.disabled = false;
                checkoutButton.textContent = 'Assinar Agora';
            }
        }
    }
    
    // Inicializar calculadora
    updatePriceDisplay();
    updateTotalPrice();
    
    // Chamada inicial para atualizar o link do WhatsApp
    const initialTotalPrice = currentPlanType === 'monthly' ? DISCOUNT_PRICE : DISCOUNT_PRICE * (12 - YEARLY_DISCOUNT);
    updateWhatsAppLink(initialTotalPrice);
    
    // Alternar entre planos (mensal, anual, ipv6)
    const planTypeBtns = document.querySelectorAll('.plan-type-btn');
    const pricingContainers = document.querySelectorAll('.pricing-container');
    
    planTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const planType = btn.getAttribute('data-plan-type');
            
            // Atualizar botões
            planTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Atualizar containers de preço
            pricingContainers.forEach(container => {
                container.classList.remove('active');
            });
            
            const targetContainer = document.querySelector(`.${planType}-plans`);
            if (targetContainer) {
                targetContainer.classList.add('active');
            }
        });
    });
    
    // Scroll suave para links de âncora
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (this.getAttribute('href') === '#') return;
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Botão de voltar ao topo
    const scrollTopBtn = document.querySelector('.scroll-top');
    
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
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
    
    // Função para configurar redirecionamento de login
    setupLoginRedirect();
    
    // Adicionar novas inicializações
    setupVideoPlayer();
    setupFAQ();
});

const addReflectionEffect = () => {
    const notebook = document.querySelector('.hero-image img');
    const heroImage = document.querySelector('.hero-image');
    
    if (notebook && heroImage) {
        // Criar o elemento de reflexão se não existir
        let reflection = heroImage.querySelector('.notebook-reflection');
        
        if (!reflection) {
            reflection = document.createElement('div');
            reflection.classList.add('notebook-reflection');
            heroImage.appendChild(reflection);
        }
        
        // Definir tamanho e posição inicial
        reflection.style.width = notebook.offsetWidth * 0.8 + 'px';
        reflection.style.height = notebook.offsetHeight * 0.6 + 'px';
        
        // Atualizar reflexo quando a imagem muda
        notebook.addEventListener('load', () => {
            reflection.style.width = notebook.offsetWidth * 0.8 + 'px';
            reflection.style.height = notebook.offsetHeight * 0.6 + 'px';
        });
        
        // Atualizar tamanho do reflexo durante o redimensionamento
        window.addEventListener('resize', () => {
            reflection.style.width = notebook.offsetWidth * 0.8 + 'px';
            reflection.style.height = notebook.offsetHeight * 0.6 + 'px';
        });
    }
}; 

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

// Função para configurar o vídeo
const setupVideoPlayer = () => {
    const videoContainer = document.querySelector('.video-container');
    const video = document.getElementById('hero-video');
    const playBtn = document.getElementById('play-video');
    const videoOverlay = document.querySelector('.video-overlay');
    
    if (videoContainer && video && playBtn && videoOverlay) {
        // Iniciar vídeo quando clicar no botão de play
        playBtn.addEventListener('click', () => {
            video.play();
            videoOverlay.style.opacity = 0;
            
            // Após um pequeno delay, esconder completamente o overlay
            setTimeout(() => {
                videoOverlay.style.display = 'none';
            }, 300);
        });
        
        // Quando o vídeo terminar, mostrar novamente o overlay
        video.addEventListener('ended', () => {
            videoOverlay.style.display = 'flex';
            setTimeout(() => {
                videoOverlay.style.opacity = 1;
            }, 10);
        });
        
        // Se o vídeo for pausado, mostrar o overlay
        video.addEventListener('pause', () => {
            if (!video.ended) {
                videoOverlay.style.display = 'flex';
                setTimeout(() => {
                    videoOverlay.style.opacity = 1;
                }, 10);
            }
        });
        
        // Aplicar os mesmos efeitos 3D do notebook no vídeo
        if (heroSection) {
            // Mesmos eventos que tínhamos para a imagem do notebook
            heroSection.addEventListener('mouseenter', () => {
                videoContainer.style.animation = 'none';
            });
            
            heroSection.addEventListener('mouseleave', () => {
                videoContainer.style.animation = 'notebook-float 6s ease-in-out infinite';
                videoContainer.style.transform = 'rotateY(0deg) rotateX(0deg)';
            });
            
            heroSection.addEventListener('mousemove', (e) => {
                if (videoContainer.style.animation === 'none') {
                    const rect = heroSection.getBoundingClientRect();
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    
                    const rotateY = ((mouseX - centerX) / centerX) * 8;
                    const rotateX = ((centerY - mouseY) / centerY) * 5;
                    
                    videoContainer.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
                }
            });
        }
    }
};

// Função para configurar o accordion da seção FAQ
const setupFAQ = () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                // Verificar se este item já está ativo
                const isActive = item.classList.contains('active');
                
                // Fechar todos os itens ativos
                faqItems.forEach(faqItem => {
                    faqItem.classList.remove('active');
                });
                
                // Se este item não estava ativo, abri-lo
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
        
        // Abrir primeiro item por padrão
        faqItems[0].classList.add('active');
    }
}; 