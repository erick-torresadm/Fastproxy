document.addEventListener('DOMContentLoaded', function() {
    // Função para obter parâmetros da URL de forma segura
    function getURLParams() {
        const urlParams = {};
        try {
            const queryString = window.location.search;
            const searchParams = new URLSearchParams(queryString);
            
            for (const [key, value] of searchParams.entries()) {
                // Sanitizar o valor para evitar XSS
                urlParams[key] = value.replace(/[<>]/g, '');
            }
        } catch (error) {
            console.error('Erro ao processar parâmetros da URL:', error);
        }
        return urlParams;
    }
    
    // Obter parâmetros da URL
    const params = getURLParams();
    
    // Verificar se há ID de sessão
    if (params.session_id) {
        const sessionId = params.session_id;
        document.getElementById('session-id').textContent = sessionId;
        
        // Verificar se é uma sessão simulada
        if (sessionId.startsWith('sim_')) {
            const parts = sessionId.split('_');
            
            if (parts.length >= 4) {
                // Extrair informações da simulação
                const timestamp = parseInt(parts[1]);
                const quantity = parts[2];
                const planType = parts[3];
                
                // Mostrar detalhes da compra simulada
                document.getElementById('quantity').textContent = quantity + (quantity > 1 ? ' proxies' : ' proxy');
                document.getElementById('plan-type').textContent = planType === 'monthly' ? 'Mensal' : 'Anual';
                
                // Formatar data
                const purchaseDate = new Date(timestamp);
                document.getElementById('purchase-date').textContent = purchaseDate.toLocaleString('pt-BR');
                
                // MODO DE SIMULAÇÃO
                document.querySelector('.success-content h1').textContent = 'Simulação de compra concluída!';
                document.querySelector('.success-content > p').textContent = 'Isto é uma simulação. Em um ambiente de produção, você receberia os dados reais do seu pedido.';
            }
        }
    }
    
    // Configurar botão do WhatsApp
    const whatsappButton = document.getElementById('whatsapp-button');
    if (whatsappButton) {
        const message = 'Olá! Acabei de fazer uma compra de proxies (ID: ' + (params.session_id || 'N/A') + ') e gostaria de saber mais informações.';
        whatsappButton.href = 'https://wa.me/5511999999999?text=' + encodeURIComponent(message);
    }
    
    // Menu mobile
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
}); 