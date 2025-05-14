/**
 * Configurações da aplicação
 */
const path = require('path');

// Carregar variáveis de ambiente baseado no ambiente
const env = process.env.NODE_ENV || 'development';
const dotenv = require('dotenv');

// Carregar arquivo .env apropriado baseado no ambiente
if (env === 'production') {
  // Em produção, tentar carregar .env.production, mas não falhar se não existir
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env.production') });
  } catch (error) {
    // Ignorar erro se o arquivo não existir, pois as variáveis podem vir do docker-compose
    console.log('Arquivo .env.production não encontrado, usando variáveis de ambiente do sistema');
  }
} else {
  // Em outros ambientes (desenvolvimento, teste), usar .env
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const logger = require('../utils/logger');

// Verificar variáveis de ambiente essenciais
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY'
];

// Verificar se todas as variáveis necessárias estão definidas
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Variáveis de ambiente faltando: ${missingEnvVars.join(', ')}`);
  logger.info(`Crie um arquivo ${env === 'production' ? '.env.production' : '.env'} na raiz do projeto baseado no arquivo env.template`);
  process.exit(1);
}

// Gerar um segredo JWT forte se não existir
const jwtSecret = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

// Função para encontrar uma porta disponível
const findAvailablePort = (initialPort) => {
  return initialPort;
};

const config = {
  // Ambiente da aplicação
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Configurações JWT
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Configurações do servidor
  port: parseInt(process.env.PORT || '8080', 10),
  alternativePorts: [8081, 8082, 8083, 3000, 3001],
  
  // Configurações do Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    isLiveKey: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')
  },
  
  // Configurações de webhooks externos
  webhooks: {
    externalUrl: process.env.EXTERNAL_WEBHOOK_URL || null,
    sendData: process.env.SEND_TO_EXTERNAL_WEBHOOK === 'true',
    secret: process.env.EXTERNAL_WEBHOOK_SECRET || null,
    // Configurações adicionais de segurança
    security: {
      validateSignature: true,
      validateTimestamp: true,
      maxTimestampAge: 300, // 5 minutos em segundos
      replayProtection: true
    }
  },
  
  // Configurações de CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature']
  },
  
  // Configurações de rate limit
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos padrão
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10) // 100 requisições por IP
  },
  
  // Configurações de negócio
  business: {
    monthlyPrice: 14.90, // Preço mensal base em BRL
    yearlyDiscount: 2, // Meses gratuitos no plano anual
    volumeDiscounts: {
      medium: {
        minQuantity: 5,
        discountPercent: 5 // 5% de desconto
      },
      large: {
        minQuantity: 10,
        discountPercent: 10 // 10% de desconto
      }
    }
  }
};

// Verificações e avisos sobre configurações de produção vs. desenvolvimento
if (config.stripe.isLiveKey && config.isDevelopment) {
  logger.warn('AVISO: Você está usando uma chave de PRODUÇÃO do Stripe em ambiente de DESENVOLVIMENTO!');
  logger.warn('Recomendamos fortemente usar chaves de teste (sk_test_) em desenvolvimento.');
}

// Verificar se existe um segredo de webhook configurado (produção)
if (config.isProduction && !config.stripe.webhookSecret) {
  logger.warn('AVISO: Ambiente de produção sem segredo de webhook do Stripe configurado.');
  logger.warn('Recomendamos configurar STRIPE_WEBHOOK_SECRET para maior segurança.');
}

module.exports = config; 