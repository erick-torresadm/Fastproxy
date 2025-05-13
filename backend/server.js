/**
 * Servidor para integração com o Stripe
 * Versão segura com melhorias de segurança
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const dotenv = require('dotenv');

// Configurar os logs antes de tudo
const logger = require('./utils/logger');
const httpLogger = require('./middleware/http-logger');

// Configurar variáveis de ambiente
dotenv.config();

// Função para sanitizar entrada e prevenir injeção
function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Sanitizar strings para prevenir XSS e outros ataques
    return sanitizeHtml(input, {
      allowedTags: [], // Não permitir nenhuma tag HTML
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape' 
    });
  } else if (input !== null && typeof input === 'object') {
    // Sanitizar objetos recursivamente
    if (Array.isArray(input)) {
      return input.map(item => sanitizeInput(item));
    } else {
      const sanitized = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          sanitized[key] = sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }
  }
  // Retornar valores primitivos sem alteração
  return input;
}

// Middleware para sanitizar automaticamente o corpo da requisição
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  
  next();
};

// Função para enviar dados de pagamento para o webhook externo
async function sendToExternalWebhook(eventType, data) {
  try {
    // Verificar se temos uma URL de webhook configurada
    if (!config || !config.webhooks || !config.webhooks.externalUrl) {
      logger.warn('Tentativa de enviar para webhook externo sem URL configurada');
      return false;
    }

    // Gerar timestamp para evitar ataques de replay
    const timestamp = new Date().toISOString();
    
    // Formatar os dados para o webhook externo
    const webhookData = {
      event_type: eventType,
      ...data,
      timestamp: timestamp,
      environment: config.nodeEnv
    };
    
    // Filtrar informações sensíveis dos dados antes de enviá-los
    const filteredData = filterSensitiveData(webhookData);
    
    // Gerar uma assinatura HMAC para o payload
    const signature = generateHmacSignature(filteredData, config.webhooks.secret || 'default-secret');

    // Enviar dados para o webhook externo com a assinatura no cabeçalho
    logger.info(`Enviando dados para webhook externo: ${config.webhooks.externalUrl}`);
    const response = await axios.post(config.webhooks.externalUrl, filteredData, {
      headers: {
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status >= 200 && response.status < 300) {
      logger.info(`Dados enviados com sucesso para webhook externo. Status: ${response.status}`);
      return true;
    } else {
      logger.warn(`Falha ao enviar dados para webhook externo. Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logger.error(`Erro ao enviar dados para webhook externo: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

// Função para filtrar informações sensíveis dos dados
function filterSensitiveData(data) {
  // Clone os dados para não modificar o original
  const filtered = JSON.parse(JSON.stringify(data));
  
  // Lista de campos sensíveis a serem removidos ou mascarados
  const sensitiveFields = ['card', 'cvv', 'cvc', 'password', 'secret'];
  
  // Função recursiva para processar objetos
  function processObject(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Se for um campo sensível, mascarar ou remover
      if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } 
      // Se for um objeto aninhado, processá-lo recursivamente
      else if (typeof obj[key] === 'object' && obj[key] !== null) {
        processObject(obj[key]);
      }
    });
  }
  
  processObject(filtered);
  return filtered;
}

// Função para gerar assinatura HMAC
function generateHmacSignature(data, secret) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return require('crypto')
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verificar se o arquivo de template existe
if (!fs.existsSync(path.join(__dirname, '.env')) && !fs.existsSync(path.join(__dirname, 'env.template'))) {
  logger.error('Arquivo .env não encontrado e o template não está disponível.');
  process.exit(1);
}

// Se .env não existir mas temos o template, criar a partir do template
if (!fs.existsSync(path.join(__dirname, '.env')) && fs.existsSync(path.join(__dirname, 'env.template'))) {
  logger.info('Arquivo .env não encontrado. Criando a partir do template...');
  
  try {
    // Copiar o template para .env
    fs.copyFileSync(path.join(__dirname, 'env.template'), path.join(__dirname, '.env'));
    logger.info('Arquivo .env criado com sucesso!');
    logger.warn('IMPORTANTE: Edite o arquivo .env e substitua as chaves de exemplo por suas chaves reais!');
  } catch (err) {
    logger.error(`Erro ao criar arquivo .env: ${err.message}`);
    process.exit(1);
  }
}

// Carregar configurações
const config = require('./config');

// Inicialização do Stripe com a chave secreta
const stripe = require('stripe')(config.stripe.secretKey);

// Inicializar variáveis MCP para usar com Stripe
const mcpStripe = {
  stripe_create_customer: async (name, email = null) => {
    try {
      const customerData = { name };
      if (email) customerData.email = email;
      
      logger.info(`Criando cliente via MCP: ${name}, ${email}`);
      return await stripe.customers.create(customerData);
    } catch (error) {
      logger.error(`Erro ao criar cliente via MCP: ${error.message}`);
      throw error;
    }
  },
  
  stripe_list_customers: async (email = null, limit = 10) => {
    try {
      const params = { limit };
      if (email) params.email = email;
      
      logger.info(`Listando clientes via MCP: ${email ? 'email=' + email : ''}, limit=${limit}`);
      return await stripe.customers.list(params);
    } catch (error) {
      logger.error(`Erro ao listar clientes via MCP: ${error.message}`);
      throw error;
    }
  },
  
  stripe_create_product: async (name, description = null) => {
    try {
      const productData = { name };
      if (description) productData.description = description;
      
      logger.info(`Criando produto via MCP: ${name}`);
      return await stripe.products.create(productData);
    } catch (error) {
      logger.error(`Erro ao criar produto via MCP: ${error.message}`);
      throw error;
    }
  },
  
  stripe_list_products: async (limit = 10) => {
    try {
      logger.info(`Listando produtos via MCP: limit=${limit}`);
      return await stripe.products.list({ limit });
    } catch (error) {
      logger.error(`Erro ao listar produtos via MCP: ${error.message}`);
      throw error;
    }
  },
  
  stripe_create_price: async (product, unit_amount, currency = 'brl') => {
    try {
      logger.info(`Criando preço via MCP: produto=${product}, valor=${unit_amount/100} ${currency}`);
      return await stripe.prices.create({
        product,
        unit_amount,
        currency
      });
    } catch (error) {
      logger.error(`Erro ao criar preço via MCP: ${error.message}`);
      throw error;
    }
  },
  
  stripe_list_prices: async (product = null, limit = 10) => {
    try {
      const params = { limit };
      if (product) params.product = product;
      
      logger.info(`Listando preços via MCP: ${product ? 'produto=' + product : ''}, limit=${limit}`);
      return await stripe.prices.list(params);
    } catch (error) {
      logger.error(`Erro ao listar preços via MCP: ${error.message}`);
      throw error;
    }
  },
  
  stripe_create_payment_link: async (price, quantity = 1) => {
    try {
      logger.info(`Criando link de pagamento via MCP: preço=${price}, quantidade=${quantity}`);
      return await stripe.paymentLinks.create({
        line_items: [
          {
            price,
            quantity
          }
        ]
      });
    } catch (error) {
      logger.error(`Erro ao criar link de pagamento via MCP: ${error.message}`);
      throw error;
    }
  }
};

// Se estiver em modo de desenvolvimento, usar o mock do MCP Stripe
if (config.isDevelopment && process.env.USE_STRIPE_MOCK === 'true') {
  logger.info('Usando mock do MCP Stripe para desenvolvimento');
  const mcpStripeMock = require('./utils/mcp-stripe-mock');
  mcpStripe.stripe_create_customer = mcpStripeMock.createCustomer;
  mcpStripe.stripe_list_customers = mcpStripeMock.listCustomers;
  mcpStripe.stripe_create_product = mcpStripeMock.createProduct;
  mcpStripe.stripe_list_products = mcpStripeMock.listProducts;
  mcpStripe.stripe_create_price = mcpStripeMock.createPrice;
  mcpStripe.stripe_list_prices = mcpStripeMock.listPrices;
  mcpStripe.stripe_create_payment_link = mcpStripeMock.createPaymentLink;
}

// Carregar validadores
const { validateCheckoutSession, validateLogin, validateAdmin } = require('./middleware/validators');

// Autenticação e segurança
const { requireAuth, handleUnauthorized } = require('./middleware/auth');
const authService = require('./utils/auth-service');

const app = express();
const PORT = process.env.PORT || 8080;

// Adicionar middlewares de segurança
// 1. Configurações avançadas de Helmet para segurança HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://checkout.stripe.com", "https://*.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com", "http://localhost:8080"],
      imgSrc: ["'self'", "data:", "https://stripe.com", "https://*.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"]
    }
  },
  // Proteção contra clickjacking
  frameguard: { action: 'deny' },
  // Proteção XSS
  xssFilter: true,
  // Impedir navegadores de sniffar MIME types
  noSniff: true,
  // Evitar download de arquivos
  ieNoOpen: true,
  // Segurança de referenciador
  referrerPolicy: { policy: 'same-origin' },
  // Configuração de HSTS para forçar HTTPS
  hsts: {
    maxAge: 15552000, // 180 dias em segundos
    includeSubDomains: true,
    preload: true
  }
}));

// 2. CORS configurado adequadamente
app.use(cors({
  origin: function(origin, callback) {
    // Em ambiente de desenvolvimento, aceitar qualquer origem
    if (config.isDevelopment) {
      return callback(null, true);
    }
    
    // Lista de origens permitidas para produção
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://fastproxy.com.br',
      'https://www.fastproxy.com.br',
      'https://homolog.fastproxy.com.br',
      'https://staging.fastproxy.com.br'
    ];
    
    // Verificar se a origem está na lista de permitidas
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`Acesso CORS bloqueado para origem: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 horas em segundos (cache do preflight)
}));

// 3. Rate limiting para prevenir brute force e DDoS
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
  standardHeaders: true, // Incluir cabeçalhos padrão de rate limit
  legacyHeaders: false, // Desabilitar cabeçalhos legados
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit excedido para IP: ${req.ip}`);
    // Registrar tentativas de exceder limite
    logger.error(`Limite máximo de requisições alcançado para ${req.ip}`);
    res.status(429).json(options.message);
  },
  // Implementar estratégia de limite adaptável
  keyGenerator: (req) => {
    // Usar combinação de IP e user agent para ser mais difícil de burlar
    return `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
  },
  skip: (req, res) => {
    // Pular limitação em ambiente de desenvolvimento ou para IPs de confiança
    if (config.isDevelopment) {
      return true;
    }
    
    // Lista de IPs confiáveis (deve ser configurada no ambiente)
    const trustedIps = config.trustedIps || [];
    return trustedIps.includes(req.ip);
  },
  // Adicionar atraso para respostas sob alta carga
  // (desencorajar tentativas em larga escala)
  requestWasSuccessful: (req, res) => true
});

// Aplicar rate limiting apenas para as rotas da API
app.use('/stripe-key', apiLimiter);
app.use('/create-checkout-session', apiLimiter);
app.use('/api/stripe/webhooks/incoming', apiLimiter);

// Rate limiting mais restritivo para rotas críticas
const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // 5 requisições por janela
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Limite estrito excedido para IP: ${req.ip} na rota ${req.originalUrl}`);
    // Adicionar atraso maior para dificultar ataques de timing
    setTimeout(() => {
      res.status(429).json(options.message);
    }, Math.floor(Math.random() * 1000) + 500);
  },
  skip: (req, res) => {
    // Pular limitação em ambiente de desenvolvimento
    return config.isDevelopment;
  }
});

// Aplicar rate limiting estrito para rotas críticas
app.use('/admin/*', strictLimiter);
app.use('/api/admin/*', strictLimiter);

// Logging de requisições HTTP
app.use(httpLogger);

// Parser para JSON
app.use(bodyParser.json());

// Parser para formulários
app.use(bodyParser.urlencoded({ extended: true }));

// Aplicar sanitização após parsing do body
app.use(sanitizeMiddleware);

// Middleware para lidar com erros de autenticação JWT
app.use(handleUnauthorized);

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Verificar a chave do Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('AVISO: STRIPE_SECRET_KEY não está definida no arquivo .env');
  console.warn('As funcionalidades de pagamento podem não funcionar corretamente');
}

// Rota para criar uma assinatura
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { quantity, planType } = req.body;
    
    // Validar os dados recebidos
    if (!quantity || !planType) {
      return res.status(400).json({ error: 'Quantidade e tipo de plano são obrigatórios' });
    }

    // Verificar quantidade (entre 1 e 100)
    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity < 1 || numQuantity > 100) {
      return res.status(400).json({ error: 'Quantidade inválida. Deve ser entre 1 e 100' });
    }
    
    // Determinar qual ID do produto/preço do Stripe usar com base no tipo de plano
    let stripePriceId;
    if (planType === 'monthly') {
      stripePriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    } else if (planType === 'yearly') {
      stripePriceId = process.env.STRIPE_YEARLY_PRICE_ID;
    } else {
      return res.status(400).json({ error: 'Tipo de plano inválido' });
    }
    
    // Verificar se temos o ID do preço configurado
    if (!stripePriceId) {
      return res.status(500).json({ 
        error: `ID do preço Stripe para o plano ${planType} não configurado no arquivo .env` 
      });
    }

    // Criar sessão de checkout para assinatura
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: numQuantity,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/#planos`,
      metadata: {
        quantity: numQuantity.toString(),
        planType: planType
      }
    });

    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ 
      error: 'Erro ao processar sua solicitação. Por favor, tente novamente.' 
    });
  }
});

// Webhook do Stripe para processar eventos de assinatura
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verificar a assinatura do webhook
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      return res.status(400).send('Webhook secret não configurado');
    }
    
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Erro na assinatura do webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lidar com eventos específicos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Aqui você processaria a assinatura bem-sucedida
      // Por exemplo, enviar um email ou mensagem para o WhatsApp
      console.log('Checkout concluído:', session.id);
      break;
      
    case 'customer.subscription.created':
      const subscription = event.data.object;
      console.log('Nova assinatura criada:', subscription.id);
      // Implementar lógica de provisão de proxy
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Pagamento de fatura bem-sucedido:', invoice.id);
      break;
      
    case 'customer.subscription.deleted':
      const canceledSubscription = event.data.object;
      console.log('Assinatura cancelada:', canceledSubscription.id);
      // Implementar lógica de desprovisionamento
      break;
      
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({ received: true });
});

// Rotas de API protegidas
const apiRouter = express.Router();

// Aplicar rate limiting nas rotas da API
apiRouter.use(apiLimiter);

// Endpoints públicos (não requerem autenticação)
apiRouter.post('/auth/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    
    if (!result.success) {
      // Adicionar atraso para dificultar ataques de força bruta
      setTimeout(() => {
        res.status(401).json({ error: result.error });
      }, Math.floor(Math.random() * 200) + 100);
      return;
    }
    
    res.json(result);
  } catch (error) {
    logger.error(`Erro no login: ${error.message}`);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

apiRouter.post('/auth/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Token de atualização não fornecido' });
    }
    
    const result = authService.refreshAccessToken(refreshToken);
    
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    logger.error(`Erro ao atualizar token: ${error.message}`);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Endpoint para criar admin (deve ser desativado em produção)
if (!config.isProduction) {
  apiRouter.post('/auth/create-admin', validateAdmin, async (req, res) => {
    try {
      const { username, password, email, secretKey } = req.body;
      const result = await authService.createAdmin({ username, password, email }, secretKey);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.status(201).json(result);
    } catch (error) {
      logger.error(`Erro ao criar admin: ${error.message}`);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });
}

// Endpoints protegidos (requerem autenticação)
apiRouter.get('/admin/dashboard', requireAuth, (req, res) => {
  // Verificar se o usuário é admin
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  res.json({ message: 'Bem-vindo ao painel admin!', user: req.auth });
});

// Verificar status de autenticação
apiRouter.get('/auth/status', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.auth.id,
      username: req.auth.username,
      role: req.auth.role
    }
  });
});

// Rota para obter a chave pública do Stripe
apiRouter.get('/stripe/public-key', (req, res) => {
  logger.info(`Chave pública do Stripe requisitada por ${req.ip}`);
  
  // Enviar a chave pública do Stripe (é seguro compartilhar a chave pública)
  res.json({
    success: true,
    publishableKey: config.stripe.publishableKey
  });
});

// Nova rota para obter configurações de preços e planos
apiRouter.get('/pricing-config', (req, res) => {
  logger.info(`Configurações de preço requisitadas por ${req.ip}`);
  
  // Enviar apenas as informações necessárias, sem credenciais
  res.json({
    success: true,
    pricing: {
      monthly: 14.90,
      yearlyDiscount: 2, // meses grátis no plano anual
      volumeDiscounts: {
        tier1: { min: 5, discount: 0.05 }, // 5% para 5 ou mais
        tier2: { min: 10, discount: 0.10 } // 10% para 10 ou mais
      }
    }
  });
});

// Rota para criar uma sessão de checkout (com validação)
apiRouter.post('/create-checkout-session', validateCheckoutSession, async (req, res) => {
  try {
    const { quantity, planType, customerName, customerEmail, customerPhone } = req.body;
    
    // Validar entrada
    if (!quantity || quantity < 1) {
      logger.warn(`Tentativa de checkout com quantidade inválida: ${quantity}`);
      return res.status(400).json({ error: 'A quantidade deve ser maior que zero' });
    }
    
    // Carregar o Stripe apenas no momento do checkout, não no front-end
    logger.info('Iniciando criação de sessão de checkout do Stripe');
    
    // Calcular preço base
    const baseUnitPrice = 14.90; // preço unitário mensal base
    let unitAmount; // em centavos
    let productName;
    let interval = 'month'; // Padrão para mensal
    
    if (planType === 'monthly') {
      // Plano mensal
      let unitPrice = baseUnitPrice;
      
      // Aplicar descontos por volume
      if (quantity >= 10) {
        unitPrice *= 0.9; // 10% de desconto
      } else if (quantity >= 5) {
        unitPrice *= 0.95; // 5% de desconto
      }
      
      unitAmount = Math.round(unitPrice * 100); // Converter para centavos
      productName = 'Proxy IPv6 - Plano Mensal';
    } else {
      // Plano anual (com desconto)
      const yearlyDiscount = 2; // dois meses grátis
      const monthsToCharge = 12 - yearlyDiscount;
      
      // Calcular preço anual
      unitAmount = Math.round(baseUnitPrice * monthsToCharge * 100); // Converter para centavos
      productName = 'Proxy IPv6 - Plano Anual';
      interval = 'year'; // Configurar como assinatura anual
    }
    
    logger.info(`Nova sessão de checkout solicitada: ${quantity} itens, plano ${planType}, intervalo: ${interval}, valor unitário: ${unitAmount / 100}`);
    
    try {
      // Criar um produto individual
      const product = await stripe.products.create({
        name: `Proxy IPv6 - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
        description: `Proxy IPv6 de alta performance - Valor unitário: R$ ${(unitAmount / 100).toFixed(2).replace('.', ',')} - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
        metadata: {
          price_per_unit: (unitAmount / 100).toFixed(2).replace('.', ','),
          plan_type: interval === 'month' ? 'Mensal' : 'Anual'
        }
      });
      
      // Criar um preço para o produto
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'brl',
        recurring: { interval: interval },
      });
      
      logger.info(`Produto criado com ID: ${product.id}, Preço criado com ID: ${price.id}`);
      
      // Dados para criação da sessão de checkout
      const checkoutSessionData = {
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: quantity
          },
        ],
        mode: 'subscription',
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
        client_reference_id: `${quantity}_proxies_${interval}`,
        metadata: {
          quantity: quantity.toString(),
          plan_type: interval,
          unit_price: (unitAmount / 100).toString(),
          total_price: ((unitAmount * quantity) / 100).toString(),
          product_name: `${quantity} proxy(s) IPv6 de alta performance - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`
        },
        success_url: `${req.headers.origin || req.protocol + '://' + req.get('host')}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || req.protocol + '://' + req.get('host')}/?canceled=true`,
      };
      
      // Adicionar dados do cliente se fornecidos
      if (customerEmail) {
        checkoutSessionData.customer_email = customerEmail;
      }
      
      // Adicionar texto personalizado
      checkoutSessionData.custom_text = {
        submit: {
          message: `Você está comprando ${quantity} proxy(s) IPv6 de alta performance. Valor unitário: R$ ${(unitAmount / 100).toFixed(2).replace('.', ',')}`,
        },
      };
      
      // Criar a sessão de checkout
      const session = await stripe.checkout.sessions.create(checkoutSessionData);
      
      logger.info(`Sessão de checkout criada com sucesso: ${session.id}`);
      
      // Retorna apenas a URL de checkout ou o ID da sessão
      res.json({ 
        id: session.id,
        url: session.url 
      });
    } catch (error) {
      logger.error(`Erro ao criar produtos/preços no Stripe: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      
      return res.status(500).json({
        error: 'Não foi possível criar a sessão de checkout',
        details: config.isDevelopment ? error.message : 'Erro interno'
      });
    }
  } catch (error) {
    logger.error(`Erro ao criar sessão de checkout: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    return res.status(500).json({
      error: 'Não foi possível criar a sessão de checkout',
      details: config.isDevelopment ? error.message : 'Erro interno'
    });
  }
});

// Novas rotas para MCP Stripe
apiRouter.post('/create-customer', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    // Validar entrada
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    logger.info(`Criando cliente no Stripe: ${name}, ${email}`);
    
    // Verificar se o cliente já existe pelo e-mail (opcional)
    let customer;
    if (email) {
      const existingCustomers = await mcpStripe.stripe_list_customers(email, 1);
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        logger.info(`Cliente existente encontrado: ${customer.id}`);
        
        // Atualizar informações do cliente se necessário
        if (name && name !== customer.name) {
          customer = await stripe.customers.update(customer.id, {
            name: name,
            phone: phone || customer.phone
          });
          logger.info(`Cliente atualizado: ${customer.id}`);
        }
      }
    }
    
    // Criar novo cliente se não existir
    if (!customer) {
      customer = await mcpStripe.stripe_create_customer(name, email);
      
      // Adicionar telefone se fornecido
      if (phone) {
        customer = await stripe.customers.update(customer.id, {
          phone: phone
        });
      }
      
      logger.info(`Novo cliente criado: ${customer.id}`);
    }
    
    // Retornar dados do cliente
    res.status(201).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    });
    
  } catch (error) {
    logger.error(`Erro ao criar cliente no Stripe: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    res.status(500).json({
      error: 'Não foi possível criar o cliente',
      details: config.isDevelopment ? error.message : 'Erro interno'
    });
  }
});

apiRouter.post('/create-product', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validar entrada
    if (!name) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório' });
    }
    
    logger.info(`Criando produto no Stripe: ${name}`);
    
    // Verificar se já existe um produto com esse nome
    const existingProducts = await mcpStripe.stripe_list_products(100);
    
    const existingProduct = existingProducts.data.find(p => p.name === name);
    
    if (existingProduct) {
      logger.info(`Produto existente encontrado: ${existingProduct.id}`);
      
      return res.status(200).json({
        id: existingProduct.id,
        name: existingProduct.name,
        description: existingProduct.description
      });
    }
    
    // Criar novo produto
    const product = await mcpStripe.stripe_create_product(name, description);
    
    logger.info(`Novo produto criado: ${product.id}`);
    
    // Retornar dados do produto
    res.status(201).json({
      id: product.id,
      name: product.name,
      description: product.description
    });
    
  } catch (error) {
    logger.error(`Erro ao criar produto no Stripe: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    res.status(500).json({
      error: 'Não foi possível criar o produto',
      details: config.isDevelopment ? error.message : 'Erro interno'
    });
  }
});

apiRouter.post('/create-price', async (req, res) => {
  try {
    const { product, unit_amount, currency } = req.body;
    
    // Validar entrada
    if (!product || !unit_amount) {
      return res.status(400).json({ error: 'Produto e valor são obrigatórios' });
    }
    
    logger.info(`Criando preço no Stripe para produto ${product}: ${unit_amount/100} ${currency || 'BRL'}`);
    
    // Criar preço
    const price = await mcpStripe.stripe_create_price(product, unit_amount, currency || 'brl');
    
    logger.info(`Novo preço criado: ${price.id}`);
    
    // Retornar dados do preço
    res.status(201).json({
      id: price.id,
      product: price.product,
      unit_amount: price.unit_amount,
      currency: price.currency
    });
    
  } catch (error) {
    logger.error(`Erro ao criar preço no Stripe: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    res.status(500).json({
      error: 'Não foi possível criar o preço',
      details: config.isDevelopment ? error.message : 'Erro interno'
    });
  }
});

apiRouter.post('/create-payment-link', async (req, res) => {
  try {
    const { price, quantity, customer } = req.body;
    
    // Validar entrada
    if (!price) {
      return res.status(400).json({ error: 'Preço é obrigatório' });
    }
    
    const qty = quantity || 1;
    
    logger.info(`Criando link de pagamento no Stripe: preço ${price}, quantidade ${qty}`);
    
    // Criar link de pagamento
    const paymentLinkData = {
      line_items: [
        {
          price: price,
          quantity: qty
        }
      ],
      metadata: {
        quantity: qty.toString()
      }
    };
    
    // Adicionar cliente se fornecido
    if (customer) {
      paymentLinkData.customer = customer;
    }
    
    // Criar link de pagamento usando o MCP
    const paymentLink = await stripe.paymentLinks.create(paymentLinkData);
    
    logger.info(`Novo link de pagamento criado: ${paymentLink.id}`);
    
    // Retornar dados do link de pagamento
    res.status(201).json({
      id: paymentLink.id,
      url: paymentLink.url
    });
    
  } catch (error) {
    logger.error(`Erro ao criar link de pagamento no Stripe: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    res.status(500).json({
      error: 'Não foi possível criar o link de pagamento',
      details: config.isDevelopment ? error.message : 'Erro interno'
    });
  }
});

// Montar as rotas da API
app.use('/api', apiRouter);

// Rota para servir a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Rota para servir a página de sucesso
app.get('/sucesso', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/sucesso.html'));
});

// Rota alternativa para a página de sucesso (para compatibilidade)
app.get('/sucesso.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/sucesso.html'));
});

// Página 404 para rotas não encontradas
app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.originalUrl}`);
  res.status(404).sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Middleware para tratar erros
app.use((err, req, res, next) => {
  logger.error(`Erro não tratado: ${err.message}`);
  logger.error(err.stack);
  
  res.status(500).json({
    error: 'Erro interno do servidor. Por favor, tente novamente mais tarde.'
  });
});

// Armazenamento em memória de eventos processados (em produção, usar Redis ou banco de dados)
const processedEvents = new Map();

// Verificar se um evento já foi processado
async function checkIfEventWasProcessed(eventId) {
  // Em produção, verificar em um armazenamento persistente como Redis ou banco de dados
  return processedEvents.has(eventId);
}

// Marcar um evento como processado
async function markEventAsProcessed(eventId) {
  // Em produção, armazenar em um armazenamento persistente como Redis ou banco de dados
  // com um TTL adequado
  processedEvents.set(eventId, new Date().toISOString());
  
  // Limitar o tamanho do Map para evitar consumo excessivo de memória
  if (processedEvents.size > 1000) {
    // Remover o evento mais antigo
    const oldestKey = processedEvents.keys().next().value;
    processedEvents.delete(oldestKey);
  }
}

// Inicializar o serviço de autenticação
authService.initialize();

// Função para iniciar o servidor
const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
    logger.info(`Ambiente: ${config.nodeEnv}`);
    logger.info(`http://localhost:${PORT}`);
  });
};

// Tentar iniciar o servidor
startServer(); 