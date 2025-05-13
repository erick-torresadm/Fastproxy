/**
 * Servidor simplificado para integração com o Stripe
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const fs = require('fs');

// Configurar variáveis de ambiente
dotenv.config();

// Verificar se arquivo .env existe, se não, criar a partir do template
if (!fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('Arquivo .env não encontrado. Criando a partir do template...');
  
  try {
    if (fs.existsSync(path.join(__dirname, 'env.template'))) {
      fs.copyFileSync(path.join(__dirname, 'env.template'), path.join(__dirname, '.env'));
      console.log('Arquivo .env criado com sucesso!');
      console.log('IMPORTANTE: Edite o arquivo .env e substitua as chaves de exemplo por suas chaves reais!');
    } else {
      console.log('Arquivo template não encontrado. Criando .env básico...');
      fs.writeFileSync(path.join(__dirname, '.env'), 
        'STRIPE_SECRET_KEY=sk_test_SuaChaveSecretaDoStripe\n' +
        'STRIPE_WEBHOOK_SECRET=whsec_SeuSegredoDoWebhook\n' +
        'NODE_ENV=development\n' +
        'PORT=8081\n'
      );
    }
  } catch (err) {
    console.error(`Erro ao criar arquivo .env: ${err.message}`);
  }
}

// Recarregar variáveis de ambiente
dotenv.config();

// Chave do Stripe - usar variável de ambiente ou chave de teste padrão
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_SuaChaveSecretaDoStripe';

// Adicionar IDs de preço padrão se não estiverem definidos no .env (solução temporária)
if (!process.env.STRIPE_PRICE_ID_MONTHLY) {
  console.warn('⚠️ AVISO: STRIPE_PRICE_ID_MONTHLY não encontrado no arquivo .env. Usando valor padrão para desenvolvimento.');
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_1OyKUOP6qlr82aJyGqasR4OE';
}

if (!process.env.STRIPE_PRICE_ID_YEARLY) {
  console.warn('⚠️ AVISO: STRIPE_PRICE_ID_YEARLY não encontrado no arquivo .env. Usando valor padrão para desenvolvimento.');
  process.env.STRIPE_PRICE_ID_YEARLY = 'price_1OyKUOP6qlr82aJyHytE53xL';
}

// Inicialização do Stripe com a chave secreta
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 8081;

// Configurar middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Verificar a chave do Stripe
if (STRIPE_SECRET_KEY === 'sk_test_SuaChaveSecretaDoStripe') {
  console.warn('\n⚠️ AVISO: Você está usando a chave de teste padrão do Stripe. ⚠️');
  console.warn('⚠️ Isso pode impedir que o checkout funcione corretamente.');
  console.warn('⚠️ Edite o arquivo .env e substitua por sua chave real para testes.');
  console.warn('\n⚠️ Para testes, você pode criar uma conta em https://stripe.com e obter as chaves de teste.');
  console.warn('⚠️ Você também pode continuar com a chave padrão para ver a interface, mas o checkout não funcionará.\n');
}

// Rota para criar uma sessão de assinatura
app.post('/api/create-subscription', async (req, res) => {
  try {
    console.log('Recebendo requisição no backend:', req.body);
    const { quantity, planType } = req.body;
    
    // Validar entrada
    if (!quantity || quantity < 1) {
      console.warn(`Tentativa de checkout com quantidade inválida: ${quantity}`);
      return res.status(400).json({ error: 'A quantidade deve ser maior que zero' });
    }
    
    console.log(`Nova sessão de checkout solicitada: ${quantity} proxies, plano ${planType}`);
    
    // Definir o intervalo base no plano (mensal ou anual)
    let interval = 'month'; // Padrão para mensal
    
    // Obter o ID do preço conforme o plano escolhido
    let priceId;
    if (planType === 'monthly') {
      priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
      interval = 'month';
    } else {
      priceId = process.env.STRIPE_PRICE_ID_YEARLY;
      interval = 'year';
    }
    
    // Verificar se o ID do preço está configurado
    if (!priceId) {
      const errorMsg = `ID do preço Stripe para o plano ${planType} não configurado no arquivo .env`;
      console.error(errorMsg);
      return res.status(500).json({ 
        error: errorMsg,
        details: `Adicione STRIPE_PRICE_ID_${planType.toUpperCase()} ao arquivo .env`
      });
    }
    
    console.log(`Usando preço ID: ${priceId} (${interval})`);
    
    try {
      // Criar a sessão de checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: quantity
          },
        ],
        mode: 'subscription',
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
        metadata: {
          quantity: quantity.toString(),
          plan_type: interval,
        },
        success_url: `${req.headers.origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}?canceled=true`,
      });
      
      console.log(`Sessão de checkout criada com sucesso: ${session.id}`);
      console.log(`URL de checkout: ${session.url}`);
      
      // Retorna apenas a URL de checkout
      res.json({ url: session.url });
    } catch (error) {
      console.error(`Erro ao criar checkout no Stripe: ${error.message}`);
      console.error('Detalhes do erro:', error);
      
      // Detectar erros comuns do Stripe
      if (error.type === 'StripeAuthenticationError') {
        console.error('Erro de autenticação do Stripe, verifique sua chave API:', error.message);
        return res.status(500).json({
          error: 'Falha na autenticação com o Stripe',
          details: 'Verifique se a sua chave do Stripe está configurada corretamente no arquivo .env'
        });
      }
      
      if (error.message && error.message.includes('Invalid API Key')) {
        console.error('Chave API inválida do Stripe:', error.message);
        return res.status(500).json({
          error: 'Chave API do Stripe inválida',
          details: 'Configure uma chave API válida no arquivo .env do backend'
        });
      }

      if (error.message && error.message.includes('No such price')) {
        return res.status(500).json({
          error: `ID do preço Stripe inválido: ${priceId}`,
          details: 'Verifique se os IDs dos preços estão configurados corretamente no arquivo .env'
        });
      }
      
      return res.status(500).json({
        error: 'Não foi possível criar a sessão de checkout',
        details: error.message
      });
    }
  } catch (error) {
    console.error(`Erro ao processar requisição: ${error.message}`);
    console.error('Detalhes do erro:', error);
    
    // Detectar erros comuns do Stripe
    if (error.type === 'StripeAuthenticationError' || 
        (error.message && error.message.includes('Invalid API Key'))) {
      return res.status(500).json({
        error: 'Chave API do Stripe inválida',
        details: 'Configure uma chave API válida no arquivo .env do backend'
      });
    }
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Rota para servir a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Rota para servir a página de sucesso
app.get('/sucesso', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/sucesso.html'));
});

// Rota para a página de erro do Stripe
app.get('/stripe-erro', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/stripe-erro.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Para testar, acesse http://localhost:3001 no frontend');
}); 