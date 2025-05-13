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

// Configurar os logs antes de tudo
const logger = require('./utils/logger');
const httpLogger = require('./middleware/http-logger');

// Função para enviar dados de pagamento para o webhook externo
async function sendToExternalWebhook(eventType, data) {
  try {
    // Verificar se temos uma URL de webhook configurada
    if (!config || !config.webhooks || !config.webhooks.externalUrl) {
      logger.warn('Tentativa de enviar para webhook externo sem URL configurada');
      return false;
    }

    // Validar a URL do webhook para garantir que é HTTPS (em produção)
    if (config.isProduction && !config.webhooks.externalUrl.startsWith('https://')) {
      logger.error('Webhook externo deve usar HTTPS em ambiente de produção');
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

    // Validar tamanho dos dados - limitar para prevenir ataques de DoS
    const dataSize = JSON.stringify(filteredData).length;
    if (dataSize > 1024 * 1024) { // Limitar a 1MB
      logger.error(`Payload de webhook muito grande (${Math.round(dataSize/1024)}KB). Máximo permitido: 1MB`);
      return false;
    }

    // Enviar dados para o webhook externo com a assinatura no cabeçalho
    logger.info(`Enviando dados para webhook externo: ${config.webhooks.externalUrl}`);
    const response = await axios.post(config.webhooks.externalUrl, filteredData, {
      headers: {
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'Content-Type': 'application/json'
      },
      timeout: 5000, // Timeout de 5 segundos para evitar bloqueios
      maxContentLength: 1024 * 1024, // Limitar tamanho da resposta a 1MB
      validateStatus: (status) => status >= 200 && status < 500 // Considerar qualquer status 2xx-4xx como resposta válida
    });
    
    if (response.status >= 200 && response.status < 300) {
      logger.info(`Dados enviados com sucesso para webhook externo. Status: ${response.status}`);
      return true;
    } else {
      logger.warn(`Falha ao enviar dados para webhook externo. Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      logger.error(`Timeout ao enviar dados para webhook externo após 5 segundos`);
    } else {
      logger.error(`Erro ao enviar dados para webhook externo: ${error.message}`);
      logger.error(error.stack);
    }
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
if (!fs.existsSync('.env') && !fs.existsSync('env.template')) {
  logger.error('Arquivo .env não encontrado e o template não está disponível.');
  process.exit(1);
}

// Se .env não existir mas temos o template, criar a partir do template
if (!fs.existsSync('.env') && fs.existsSync('env.template')) {
  logger.info('Arquivo .env não encontrado. Criando a partir do template...');
  
  try {
    // Copiar o template para .env
    fs.copyFileSync('env.template', '.env');
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

// Carregar validadores
const { validateCheckoutSession, validateLogin, validateAdmin } = require('./middleware/validators');

// Autenticação e segurança
const { requireAuth, handleUnauthorized } = require('./middleware/auth');
const authService = require('./utils/auth-service');

// Criar app Express
const app = express();

// Adicionar middlewares de segurança
// 1. Configurações avançadas de Helmet para segurança HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://checkout.stripe.com", "https://*.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com", "http://localhost:8080", "http://localhost:3000"],
      imgSrc: ["'self'", "data:", "https://stripe.com", "https://*.stripe.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://*.stripe.com"],
      mediaSrc: ["'self'"]
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
  origin: config.cors.origin, // Valor definido no config
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders
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
    res.status(429).json(options.message);
  }
});

// Rate limit mais restrito para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limitar a 5 tentativas de login por janela
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit de autenticação excedido para IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Aplicar rate limiting para as rotas da API
app.use('/stripe-key', apiLimiter);
app.use('/create-checkout-session', apiLimiter);
app.use('/api/stripe/webhooks/incoming', apiLimiter);
app.use('/login', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin', authLimiter);

// Logging de requisições HTTP
app.use(httpLogger);

// Parser para JSON
app.use(bodyParser.json());

// Parser para formulários
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para lidar com erros de autenticação JWT
app.use(handleUnauthorized);

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Rota para obter a chave pública do Stripe
app.get('/stripe-key', (req, res) => {
  logger.info(`Chave pública do Stripe requisitada por ${req.ip}`);
  
  // Enviar a chave pública do Stripe (é seguro compartilhar a chave pública)
  res.json({
    success: true,
    publishableKey: config.stripe.publishableKey
  });
});

// Nova rota para obter configurações de preços e planos
app.get('/pricing-config', (req, res) => {
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
app.post('/create-checkout-session', validateCheckoutSession, async (req, res) => {
  try {
    const { quantity, planType, paymentMethod } = req.body;
    
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
    
    logger.info(`Nova sessão de checkout solicitada: ${quantity} itens, plano ${planType}, intervalo: ${interval}`);
    
    try {
      // Criar um produto para a assinatura
      const product = await stripe.products.create({
        name: `${quantity} ${quantity > 1 ? 'Proxies IPv6' : 'Proxy IPv6'} - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
        description: `${quantity} proxy(s) IPv6 de alta performance - Valor unitário: R$ ${interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ',')} por mês - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
        metadata: {
          quantity: quantity.toString(),
          price_per_unit: interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ','),
          plan_type: interval === 'month' ? 'Mensal' : 'Anual'
        }
      });
      
      // Criar um preço para o produto (definindo a recorrência)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'brl',
        recurring: { interval: interval },
      });
      
      // Criar a sessão de checkout com o preço criado
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: quantity,
          },
        ],
        mode: 'subscription',
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
        client_reference_id: `${quantity}_proxies_${interval}`,
        custom_text: {
          submit: {
            message: `Você está comprando ${quantity} proxy(s) IPv6 de alta performance. Valor unitário: R$ ${interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ',')} por mês.`,
          },
        },
        metadata: {
          quantity: quantity.toString(),
          plan_type: interval,
          unit_price: (unitAmount / 100).toString(),
          total_price: ((unitAmount * quantity) / 100).toString(),
          product_name: `${quantity} proxy(s) IPv6 de alta performance - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
          price_per_proxy: interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ',')
        },
        success_url: `${req.headers.origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}?canceled=true`,
      });
      
      logger.info(`Sessão de checkout criada com sucesso: ${session.id}`);
      
      // Retorna apenas a URL de checkout, eliminando a necessidade do Stripe.js no frontend
      res.json({ url: session.url });
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

// Webhook para capturar eventos do Stripe (com caminho obscuro para evitar tentativas de acesso direto)
app.post('/api/stripe/webhooks/incoming', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  // 1. Verificar se a requisição veio realmente do Stripe checando a assinatura
  if (!sig) {
    logger.error('Tentativa de acesso ao webhook sem assinatura do Stripe');
    // Não revelamos motivo específico ao cliente para evitar ataques
    return res.status(403).send('Acesso não autorizado');
  }
  
  // 2. Verificar IP de origem para adicionar uma camada extra de segurança
  // Lista de IPs permitidos do Stripe (atualizar esta lista periodicamente)
  // https://stripe.com/docs/webhooks/signatures#verify-ip-addresses
  const STRIPE_WEBHOOK_IPS = [
    '3.18.12.63',
    '3.130.192.231',
    '13.235.14.237',
    '13.235.122.149',
    '18.211.135.69',
    '35.154.171.200',
    '52.15.183.38',
    '54.88.130.119',
    '54.88.130.237',
    '54.187.174.169',
    '54.187.205.235',
    '54.187.216.72',
    '54.241.31.99',
    '54.241.31.102',
    '54.241.34.107'
    // Esta lista deve ser atualizada regularmente a partir da documentação do Stripe
  ];
  
  const clientIP = req.ip || req.connection.remoteAddress;
  logger.info(`Requisição webhook recebida de IP: ${clientIP}`);
  
  // Verificar IP em ambiente de produção
  if (config.isProduction) {
    const isAllowedIP = STRIPE_WEBHOOK_IPS.some(ip => clientIP.includes(ip));
    if (!isAllowedIP) {
      logger.warn(`Possível tentativa não autorizada: IP não permitido: ${clientIP}`);
      // Responder com atraso aleatório para dificultar ataques de timing
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 200));
      return res.status(403).send('Acesso não autorizado');
    }
  }
  
  // 3. Verificar origem da requisição
  const origin = req.get('origin');
  if (origin && !origin.includes('stripe.com')) {
    logger.warn(`Possível tentativa de spoofing: ${origin}`);
  }
  
  let event;

  try {
    // Verificar se temos um segredo de webhook configurado
    if (!config.stripe.webhookSecret) {
      logger.error('Webhook do Stripe chamado sem um segredo configurado');
      return res.status(500).send('Configuração incorreta');
    }

    try {
      // Verificar a assinatura do webhook (isso garante que a requisição veio do Stripe)
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      logger.error(`Erro na assinatura do webhook: ${err.message}`);
      // Não revelamos o erro específico para evitar ataques
      return res.status(403).send('Assinatura inválida');
    }
    
    logger.info(`Evento de webhook autenticado recebido: ${event.type}`);
    
    // Verificar se este evento já foi processado (prevenção de replay)
    const eventId = event.id;
    const isProcessed = await checkIfEventWasProcessed(eventId);
    if (isProcessed) {
      logger.warn(`Evento já processado (possível replay attack): ${eventId}`);
      return res.status(200).send('Evento já processado');
    }
    
    // Verificar a idade do evento para prevenir replay attacks
    const eventCreatedAt = new Date(event.created * 1000);
    const now = new Date();
    const eventAgeInSeconds = (now - eventCreatedAt) / 1000;
    const MAX_EVENT_AGE = 300; // 5 minutos
    
    if (eventAgeInSeconds > MAX_EVENT_AGE) {
      logger.warn(`Evento expirado (possível replay attack): ${eventId}, idade: ${eventAgeInSeconds} segundos`);
      return res.status(400).send('Evento expirado');
    }
    
    // Marcar evento como processado antes de iniciar o processamento
    await markEventAsProcessed(eventId);
    
    // Adicionar um pequeno atraso aleatório para dificultar ataques de timing
    const randomDelay = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    // Processar eventos específicos
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Verificar se o pagamento foi realmente bem-sucedido
        if (session.payment_status === 'paid') {
          // Log da referência do cliente e quantidade
          logger.info(`ID de referência: ${session.client_reference_id || 'N/A'}`);
          
          // Formatar os dados de maneira amigável para o webhook
          const valorTotalFormatado = (session.amount_total / 100).toFixed(2).replace('.', ',');
          
          // Extrair quantidade de metadados
          const quantidadeProxies = session.metadata?.quantity || 'N/D';
          const planoTipo = session.metadata?.plan_type === 'month' ? 'Mensal' : 'Anual';
          const nomeProduto = session.metadata?.product_name || `${quantidadeProxies} proxy(s) IPv6 - Plano ${planoTipo}`;
          const precoUnitario = session.metadata?.price_per_proxy || '14,90';
          
          // Buscar dados da assinatura se existir
          let subscriptionDetails = null;
          
          try {
            if (session.subscription) {
              // Obter detalhes completos da assinatura
              const subscription = await stripe.subscriptions.retrieve(session.subscription, {
                expand: ['items.data.price.product']
              });
              
              subscriptionDetails = subscription;
              
              logger.info(`Assinatura associada à sessão encontrada: ${subscription.id}`);
              logger.info(`Quantidade de itens: ${subscription.items.data[0]?.quantity || 1}`);
            }
          } catch (err) {
            logger.error(`Erro ao buscar assinatura do checkout: ${err.message}`);
          }
          
          // Criar objeto de dados formatados para enviar ao webhook
          const checkoutData = {
            id_sessao: session.id,
            valor: `R$ ${valorTotalFormatado}`,
            valor_numerico: session.amount_total / 100,
            quantidade_proxies: parseInt(quantidadeProxies) || 1,
            preco_por_proxy: precoUnitario,
            plano: planoTipo,
            produto: nomeProduto,
            cliente: {
              id: session.customer,
              email: session.customer_details?.email || 'N/D',
              telefone: session.customer_details?.phone || 'N/D'
            },
            status: session.payment_status,
            moeda: session.currency.toUpperCase(),
            data_pagamento: new Date(session.created * 1000).toISOString(),
            // Incluir dados da assinatura se disponível
            subscription: subscriptionDetails ? {
              id: subscriptionDetails.id,
              status: subscriptionDetails.status,
              current_period_start: new Date(subscriptionDetails.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscriptionDetails.current_period_end * 1000).toISOString(),
              items: subscriptionDetails.items.data.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: {
                  id: item.price.id,
                  unit_amount: item.price.unit_amount / 100,
                  currency: item.price.currency,
                  recurring: item.price.recurring ? {
                    interval: item.price.recurring.interval
                  } : null
                },
                product: item.price.product ? {
                  id: item.price.product.id,
                  name: item.price.product.name,
                  description: item.price.product.description,
                  metadata: item.price.product.metadata
                } : null
              }))
            } : null
          };
          
          // Enviar os dados para o webhook externo
          await sendToExternalWebhook('checkout_completed', checkoutData);
          
          logger.info(`Pagamento bem-sucedido para a sessão: ${session.id}`);
          logger.info(`Detalhes da compra: ${JSON.stringify(checkoutData)}`);
          
          // Aqui você pode processar o pedido, enviar e-mails, atualizar banco de dados, etc.
          // Exemplo:
          // await processOrder(session);
        } else {
          logger.warn(`Sessão de checkout completada, mas pagamento não confirmado: ${session.id}, status: ${session.payment_status}`);
        }
        break;
      
      case 'customer.subscription.created':
        const newSubscription = event.data.object;
        
        try {
          // Obter detalhes completos da assinatura
          const subscriptionDetails = await stripe.subscriptions.retrieve(newSubscription.id, {
            expand: ['items.data.price.product', 'customer']
          });
          
          // Extrair quantidade de itens
          const quantidade = subscriptionDetails.items.data[0]?.quantity || 1;
          const planoTipo = subscriptionDetails.items.data[0]?.plan.interval === 'month' ? 'Mensal' : 'Anual';
          
          // Formatar valores
          const valorTotalFormatado = ((subscriptionDetails.items.data[0]?.price.unit_amount || 0) * quantidade / 100).toFixed(2).replace('.', ',');
          
          logger.info(`Nova assinatura criada: ${newSubscription.id}`);
          logger.info(`Detalhes da assinatura: Cliente: ${newSubscription.customer}, Quantidade: ${quantidade}, Plano: ${planoTipo}`);
          
          // Criar objeto com dados formatados
          const subscriptionData = {
            id_assinatura: subscriptionDetails.id,
            cliente: {
              id: subscriptionDetails.customer.id,
              email: subscriptionDetails.customer.email || 'N/A',
              nome: subscriptionDetails.customer.name || 'N/A'
            },
            status: subscriptionDetails.status,
            valor: `R$ ${valorTotalFormatado}`,
            valor_numerico: (subscriptionDetails.items.data[0]?.price.unit_amount || 0) * quantidade / 100,
            quantidade_proxies: quantidade,
            plano: planoTipo,
            periodo: {
              inicio: new Date(subscriptionDetails.current_period_start * 1000).toISOString(),
              fim: new Date(subscriptionDetails.current_period_end * 1000).toISOString()
            },
            proxima_cobranca: subscriptionDetails.current_period_end 
              ? new Date(subscriptionDetails.current_period_end * 1000).toISOString() 
              : null,
            itens: subscriptionDetails.items.data.map(item => ({
              id: item.id,
              quantity: item.quantity,
              price: {
                id: item.price.id,
                unit_amount: item.price.unit_amount / 100,
                currency: item.price.currency,
                recurring: item.price.recurring ? {
                  interval: item.price.recurring.interval
                } : null
              },
              product: item.price.product ? {
                id: item.price.product.id,
                name: item.price.product.name,
                description: item.price.product.description,
                metadata: item.price.product.metadata
              } : null
            }))
          };
          
          // Enviar dados para o webhook externo
          await sendToExternalWebhook('subscription_created', subscriptionData);
          
          logger.info(`Detalhes da nova assinatura enviados para webhook externo`);
          
          // Aqui você pode ativar o serviço para o cliente, atualizando sua base de dados
        } catch (err) {
          logger.error(`Erro ao processar nova assinatura: ${err.message}`);
          logger.error(err.stack);
          
          // Enviar dados básicos em caso de erro
          const basicSubscriptionData = {
            id_assinatura: newSubscription.id,
            cliente: newSubscription.customer,
            status: newSubscription.status
          };
          
          await sendToExternalWebhook('subscription_created_basic', basicSubscriptionData);
        }
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        logger.info(`Assinatura atualizada: ${updatedSubscription.id}, Status: ${updatedSubscription.status}`);
        // Aqui você pode atualizar os detalhes da assinatura na sua base de dados
        break;
        
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        logger.info(`Assinatura cancelada: ${canceledSubscription.id}`);
        // Aqui você pode desativar o serviço para este cliente
        break;
        
      case 'invoice.payment_succeeded':
        const paidInvoice = event.data.object;
        
        try {
          // Buscar detalhes da assinatura se existir
          let subscriptionDetails = { quantity: '1', plan: 'Mensal' };
          let fullSubscription = null;
          
          if (paidInvoice.subscription) {
            try {
              // Obter detalhes completos da assinatura
              const subscription = await stripe.subscriptions.retrieve(paidInvoice.subscription, {
                expand: ['items.data.price.product']
              });
              
              fullSubscription = subscription;
              
              if (subscription && subscription.items && subscription.items.data.length > 0) {
                subscriptionDetails = {
                  quantity: (subscription.items.data[0].quantity || 1).toString(),
                  plan: subscription.items.data[0].plan.interval === 'month' ? 'Mensal' : 'Anual'
                };
                
                logger.info(`Detalhes da assinatura na fatura: ID ${subscription.id}, Quantidade: ${subscriptionDetails.quantity}, Plano: ${subscriptionDetails.plan}`);
              }
            } catch (err) {
              logger.error(`Erro ao obter detalhes da assinatura: ${err.message}`);
            }
          }
          
          // Formatar os valores com vírgula brasileira
          const valorTotalFormatado = (paidInvoice.amount_paid / 100).toFixed(2).replace('.', ',');
          const valorSubtotalFormatado = (paidInvoice.subtotal / 100).toFixed(2).replace('.', ',');
          
          // Criar objeto com dados formatados
          const invoiceData = {
            id_fatura: paidInvoice.id,
            valor: `R$ ${valorTotalFormatado}`,
            valor_numerico: paidInvoice.amount_paid / 100,
            valor_subtotal: `R$ ${valorSubtotalFormatado}`,
            quantidade_proxies: parseInt(subscriptionDetails.quantity) || 1,
            plano: subscriptionDetails.plan,
            proxies_descricao: `${parseInt(subscriptionDetails.quantity) || 1} proxy(s) IPv6 de alta performance`,
            preco_unitario: subscriptionDetails.plan === 'Mensal' ? '14,90' : 
              ((paidInvoice.amount_paid / 100) / (parseInt(subscriptionDetails.quantity) || 1) / 10).toFixed(2).replace('.', ','),
            cliente: paidInvoice.customer,
            status: paidInvoice.status,
            moeda: paidInvoice.currency.toUpperCase(),
            periodo: {
              inicio: new Date(paidInvoice.period_start * 1000).toISOString(),
              fim: new Date(paidInvoice.period_end * 1000).toISOString()
            },
            proxima_fatura: paidInvoice.next_payment_attempt 
              ? new Date(paidInvoice.next_payment_attempt * 1000).toISOString() 
              : null,
            // Incluir dados completos da assinatura
            subscription: fullSubscription ? {
              id: fullSubscription.id,
              status: fullSubscription.status,
              current_period_start: new Date(fullSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(fullSubscription.current_period_end * 1000).toISOString(),
              items: fullSubscription.items.data.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: {
                  id: item.price.id,
                  unit_amount: item.price.unit_amount / 100,
                  currency: item.price.currency,
                  recurring: item.price.recurring ? {
                    interval: item.price.recurring.interval
                  } : null
                },
                product: item.price.product ? {
                  id: item.price.product.id,
                  name: item.price.product.name,
                  description: item.price.product.description,
                  metadata: item.price.product.metadata
                } : null
              }))
            } : null
          };
          
          // Enviar dados para o webhook externo
          await sendToExternalWebhook('invoice_paid', invoiceData);
          
          logger.info(`Pagamento de fatura realizado: ${paidInvoice.id}`);
          logger.info(`Detalhes da fatura: ${JSON.stringify(invoiceData)}`);
          
          // Aqui você pode registrar o pagamento e estender o período de serviço
          // Exemplo: await atualizarServicoCliente(paidInvoice.customer, subscriptionDetails.quantity, new Date(paidInvoice.period_end * 1000));
        } catch (err) {
          logger.error(`Erro ao processar dados da fatura: ${err.message}`);
          
          // Enviar pelo menos as informações básicas
          const basicInvoiceData = {
            id_fatura: paidInvoice.id,
            valor: `R$ ${(paidInvoice.amount_paid / 100).toFixed(2).replace('.', ',')}`,
            valor_numerico: paidInvoice.amount_paid / 100,
            cliente: paidInvoice.customer,
            status: paidInvoice.status
          };
          
          await sendToExternalWebhook('invoice_paid_basic', basicInvoiceData);
          logger.info(`Pagamento de fatura (informações básicas): ${paidInvoice.id}, Valor: R$ ${(paidInvoice.amount_paid / 100).toFixed(2).replace('.', ',')}`);
        }
        
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        logger.info(`Falha no pagamento da fatura: ${failedInvoice.id}, Cliente: ${failedInvoice.customer}`);
        // Aqui você pode enviar um alerta ao cliente sobre a falha no pagamento
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        try {
          // Formatar o valor com vírgula brasileira
          const valorFormatado = (paymentIntent.amount / 100).toFixed(2).replace('.', ',');
          
          // Registrar informações básicas do pagamento imediatamente
          logger.info(`Pagamento recebido: ${paymentIntent.id}, Valor: R$ ${valorFormatado}`);
          
          // Tentar buscar a assinatura relacionada ao pagamento
          let quantidade = '1';
          let plano = 'Mensal';
          let subscriptionDetails = null;
          
          // Tentar buscar detalhes de quantidade e plano
          try {
            const invoices = await stripe.invoices.list({
              payment_intent: paymentIntent.id,
              limit: 1,
              expand: ['data.subscription']
            });
            
            if (invoices.data.length > 0 && invoices.data[0].subscription) {
              const subscriptionId = typeof invoices.data[0].subscription === 'string' 
                ? invoices.data[0].subscription 
                : invoices.data[0].subscription.id;
              
              const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data.price.product']
              });
              
              subscriptionDetails = subscription;
              
              if (subscription && subscription.items && subscription.items.data.length > 0) {
                quantidade = (subscription.items.data[0].quantity || 1).toString();
                plano = subscription.items.data[0].plan.interval === 'month' ? 'Mensal' : 'Anual';
                
                // Log detalhado da assinatura
                logger.info(`Detalhes da assinatura encontrados: ID ${subscription.id}, Quantidade: ${quantidade}, Plano: ${plano}`);
              }
            }
          } catch (err) {
            logger.error(`Erro ao buscar detalhes da assinatura: ${err.message}`);
          }
          
          // Construir os detalhes do pagamento formatados
          const paymentData = {
            id_pagamento: paymentIntent.id,
            valor: `R$ ${valorFormatado}`,
            valor_numerico: paymentIntent.amount / 100,
            quantidade_proxies: parseInt(quantidade) || 1,
            plano: plano,
            cliente: paymentIntent.customer,
            moeda: paymentIntent.currency.toUpperCase(),
            data_pagamento: new Date(paymentIntent.created * 1000).toISOString(),
            status: paymentIntent.status,
            // Incluir detalhes completos da assinatura se disponíveis
            subscription: subscriptionDetails ? {
              id: subscriptionDetails.id,
              status: subscriptionDetails.status,
              current_period_start: new Date(subscriptionDetails.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscriptionDetails.current_period_end * 1000).toISOString(),
              items: subscriptionDetails.items.data.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: {
                  id: item.price.id,
                  unit_amount: item.price.unit_amount / 100,
                  currency: item.price.currency,
                  recurring: item.price.recurring ? {
                    interval: item.price.recurring.interval
                  } : null
                },
                product: item.price.product ? {
                  id: item.price.product.id,
                  name: item.price.product.name,
                  description: item.price.product.description,
                  metadata: item.price.product.metadata
                } : null
              }))
            } : null
          };
          
          // Enviar dados formatados para o webhook externo
          await sendToExternalWebhook('payment_succeeded', paymentData);
          
          logger.info(`Detalhes do pagamento enviados: ${JSON.stringify(paymentData)}`);
        } catch (err) {
          logger.error(`Erro ao processar payment_intent.succeeded: ${err.message}`);
          logger.error(err.stack);
          
          // Enviar pelo menos as informações básicas
          const basicData = {
            id_pagamento: paymentIntent.id,
            valor: `R$ ${(paymentIntent.amount / 100).toFixed(2).replace('.', ',')}`,
            valor_numerico: paymentIntent.amount / 100,
            status: paymentIntent.status
          };
          
          await sendToExternalWebhook('payment_succeeded_basic', basicData);
        }
        
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        logger.warn(`Pagamento falhou: ${failedPayment.id}`);
        break;
        
      default:
        logger.info(`Evento não tratado: ${event.type}`);
    }
    
    // Confirmar recebimento do evento
    return res.status(200).json({ received: true });
    
  } catch (err) {
    logger.error(`Erro no processamento do webhook: ${err.message}`);
    logger.error(err.stack);
    // Não revelamos informações específicas do erro
    return res.status(500).send('Erro interno');
  }
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
    const { quantity, planType, paymentMethod } = req.body;
    
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
    
    logger.info(`Nova sessão de checkout solicitada: ${quantity} itens, plano ${planType}, intervalo: ${interval}`);
    
    try {
      // Criar um produto para a assinatura
      const product = await stripe.products.create({
        name: `${quantity} ${quantity > 1 ? 'Proxies IPv6' : 'Proxy IPv6'} - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
        description: `${quantity} proxy(s) IPv6 de alta performance - Valor unitário: R$ ${interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ',')} por mês - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
        metadata: {
          quantity: quantity.toString(),
          price_per_unit: interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ','),
          plan_type: interval === 'month' ? 'Mensal' : 'Anual'
        }
      });
      
      // Criar um preço para o produto (definindo a recorrência)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'brl',
        recurring: { interval: interval },
      });
      
      // Criar a sessão de checkout com o preço criado
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: quantity,
          },
        ],
        mode: 'subscription',
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
        client_reference_id: `${quantity}_proxies_${interval}`,
        custom_text: {
          submit: {
            message: `Você está comprando ${quantity} proxy(s) IPv6 de alta performance. Valor unitário: R$ ${interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 12).toFixed(2).replace('.', ',')} por mês.`,
          },
        },
        metadata: {
          quantity: quantity.toString(),
          plan_type: interval,
          unit_price: (unitAmount / 100).toString(),
          total_price: ((unitAmount * quantity) / 100).toString(),
          product_name: `${quantity} proxy(s) IPv6 de alta performance - Plano ${interval === 'month' ? 'Mensal' : 'Anual'}`,
          price_per_proxy: interval === 'month' ? '14,90' : ((baseUnitPrice * (12 - yearlyDiscount)) / 10).toFixed(2).replace('.', ',')
        },
        success_url: `${req.headers.origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}?canceled=true`,
      });
      
      logger.info(`Sessão de checkout criada com sucesso: ${session.id}`);
      
      // Retorna apenas a URL de checkout, eliminando a necessidade do Stripe.js no frontend
      res.json({ url: session.url });
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

// Montar as rotas da API
app.use('/api', apiRouter);

// Rota para servir a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});

// Rota para servir a página de sucesso
app.get('/sucesso', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public', 'sucesso.html'));
});

// Rota alternativa para a página de sucesso (para compatibilidade)
app.get('/sucesso.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public', 'sucesso.html'));
});

// Página 404 para rotas não encontradas
app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.originalUrl}`);
  res.status(404).sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
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
const startServer = async (port) => {
  try {
    const server = app.listen(port, () => {
      logger.info(`Servidor backend rodando na porta ${port}`);
      logger.info(`Ambiente: ${config.nodeEnv}`);
      logger.info(`http://localhost:${port}`);
    });
    
    // Configurar um timeout maior para lidar com webhooks mais longos
    server.timeout = 120000; // 2 minutos
    return server;
  } catch (err) {
    logger.error(`Erro ao iniciar servidor: ${err.message}`);
    throw err;
  }
};

// Tentar iniciar o servidor, com fallback para portas alternativas se a porta padrão estiver ocupada
const tryStartServer = async () => {
  // Lista de portas para tentar, começando com a porta padrão
  const portOptions = [8080, 8081, 8082, 8083, 8000, 8001];
  
  // Tenta portas em sequência
  let server = null;
  let successPort = null;
  
  // Função recursiva para tentar portas
  const tryPort = (index) => {
    if (index >= portOptions.length) {
      // Tentamos todas as portas sem sucesso
      logger.error('Falha ao iniciar o servidor em todas as portas disponíveis');
      process.exit(1);
    }
    
    const port = portOptions[index];
    return startServer(port)
      .then(s => {
        server = s;
        successPort = port;
        return { server, port };
      })
      .catch(err => {
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Porta ${port} em uso, tentando a próxima opção...`);
          return tryPort(index + 1);
        }
        throw err;
      });
  };
  
  // Iniciar tentativas com a primeira porta
  return tryPort(0);
};

// Iniciar o servidor
tryStartServer().catch(err => {
  logger.error(`Erro fatal ao iniciar o servidor: ${err.message}`);
  process.exit(1);
}); 