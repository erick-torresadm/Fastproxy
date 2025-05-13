/**
 * FastProxy - Script de Checkout com integração Stripe
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o objeto Stripe
    let stripe;
    
    // Elementos do formulário de checkout
    const checkoutForm = document.getElementById('checkout-form');
    const quantityInput = document.getElementById('proxy-quantity');
    const subtotalElement = document.getElementById('subtotal-value');
    const totalElement = document.getElementById('total-value');
    const checkoutButton = document.getElementById('checkout-button');
    const errorMessage = document.getElementById('error-message');
    
    // Variáveis para preços
    let selectedPlan = '';
    let planPrice = 0;
    let billingType = 'monthly';
    
    // Recupera os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    const quantityParam = urlParams.get('quantity');
    const billingParam = urlParams.get('billing');
    
    // Inicializa o Stripe
    async function initStripe() {
        try {
            const response = await fetch('/api/stripe/public-key');
            const data = await response.json();
            
            if (data.publishableKey) {
                stripe = Stripe(data.publishableKey);
            } else {
                throw new Error('Chave pública do Stripe não encontrada');
            }
        } catch (error) {
            console.error('Erro ao inicializar Stripe:', error);
            if (errorMessage) {
                errorMessage.textContent = 'Não foi possível inicializar o sistema de pagamento. Tente novamente mais tarde.';
                errorMessage.style.display = 'block';
            }
        }
    }
    
    // Configura o plano selecionado
    if (planParam) {
        selectedPlan = planParam;
        document.getElementById('plan-type').value = selectedPlan;
        
        // Define o preço com base no plano
        switch (selectedPlan) {
            case 'basic':
                planPrice = 49;
                document.getElementById('plan-name').textContent = 'Básico';
                break;
            case 'professional':
                planPrice = 139;
                document.getElementById('plan-name').textContent = 'Profissional';
                break;
            case 'business':
                planPrice = 399;
                document.getElementById('plan-name').textContent = 'Empresarial';
                break;
        }
    }
    
    // Configura o tipo de cobrança
    if (billingParam && billingParam === 'annual') {
        billingType = 'annual';
        planPrice = Math.round(planPrice * 0.8); // 20% de desconto
        document.getElementById('billing-type').value = billingType;
        document.getElementById('billing-cycle').textContent = 'Anual';
    } else {
        document.getElementById('billing-cycle').textContent = 'Mensal';
    }
    
    // Configura a quantidade
    if (quantityParam) {
        quantityInput.value = quantityParam;
    }
    
    // Atualiza o resumo do pedido
    function updateOrderSummary() {
        const quantity = parseInt(quantityInput.value) || 1;
        const subtotal = planPrice * quantity;
        const total = subtotal;
        
        subtotalElement.textContent = formatCurrency(subtotal);
        totalElement.textContent = formatCurrency(total);
        
        // Atualiza a quantidade no campo hidden
        document.getElementById('proxy-quantity-hidden').value = quantity;
    }
    
    // Formata valores em moeda brasileira
    function formatCurrency(value) {
        return 'R$ ' + value.toFixed(2).replace('.', ',');
    }
    
    // Atualiza o resumo ao carregar a página
    updateOrderSummary();
    
    // Atualiza o resumo quando a quantidade é alterada
    if (quantityInput) {
        quantityInput.addEventListener('change', updateOrderSummary);
    }
    
    // Botões de incremento/decremento de quantidade
    const decrementBtn = document.getElementById('decrement-btn');
    const incrementBtn = document.getElementById('increment-btn');
    
    if (decrementBtn && incrementBtn) {
        decrementBtn.addEventListener('click', function() {
            const currentQuantity = parseInt(quantityInput.value) || 1;
            if (currentQuantity > 1) {
                quantityInput.value = currentQuantity - 1;
                updateOrderSummary();
            }
        });
        
        incrementBtn.addEventListener('click', function() {
            const currentQuantity = parseInt(quantityInput.value) || 1;
            quantityInput.value = currentQuantity + 1;
            updateOrderSummary();
        });
    }
    
    // Processar o pagamento com Stripe
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Verificar se o Stripe foi inicializado
            if (!stripe) {
                try {
                    await initStripe();
                } catch (error) {
                    console.error('Erro ao inicializar o Stripe:', error);
                    if (errorMessage) {
                        errorMessage.textContent = 'Não foi possível inicializar o sistema de pagamento. Tente novamente mais tarde.';
                        errorMessage.style.display = 'block';
                    }
                    return;
                }
            }
            
            // Desabilita o botão e mostra o indicador de carregamento
            checkoutButton.disabled = true;
            checkoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            
            // Esconde possíveis mensagens de erro anteriores
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            try {
                // Prepara os dados para enviar ao backend
                const formData = new FormData(checkoutForm);
                const quantity = parseInt(formData.get('quantity')) || 1;
                
                // Cria a sessão de checkout no backend
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        planType: billingType === 'annual' ? 'yearly' : 'monthly',
                        quantity: quantity,
                        customerName: formData.get('name'),
                        customerEmail: formData.get('email'),
                        customerPhone: formData.get('phone')
                    }),
                });
                
                const session = await response.json();
                
                if (session.error) {
                    throw new Error(session.error || 'Erro ao criar a sessão de checkout');
                }
                
                // Redireciona para o checkout do Stripe ou para a URL fornecida
                if (session.url) {
                    window.location.href = session.url;
                } else if (session.id) {
                    const result = await stripe.redirectToCheckout({
                        sessionId: session.id
                    });
                    
                    if (result.error) {
                        throw new Error(result.error.message);
                    }
                } else {
                    throw new Error('Resposta inválida do servidor');
                }
                
            } catch (error) {
                console.error('Erro:', error);
                
                // Reabilita o botão e remove o indicador de carregamento
                checkoutButton.disabled = false;
                checkoutButton.innerHTML = 'Finalizar Compra';
                
                // Exibe a mensagem de erro
                if (errorMessage) {
                    errorMessage.textContent = error.message || 'Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.';
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
    
    // Inicializar o Stripe quando a página carregar
    initStripe();
}); 