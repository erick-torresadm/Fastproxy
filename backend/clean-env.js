/**
 * Script para limpar o arquivo .env duplicado
 * Execute este script para criar um arquivo .env limpo e corrigido
 */
const fs = require('fs');
const crypto = require('crypto');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Função para gerar um segredo forte
function generateStrongSecret() {
  return crypto.randomBytes(32).toString('base64');
}

console.log(`${colors.blue}Iniciando limpeza do arquivo .env...${colors.reset}`);

// Backup do arquivo atual
if (fs.existsSync('.env')) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `.env.backup.${timestamp}`;
  
  try {
    fs.copyFileSync('.env', backupName);
    console.log(`${colors.green}✓ Backup criado: ${backupName}${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}✗ Erro ao criar backup: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

// Criar novo arquivo .env limpo
try {
  // Gerar segredos fortes
  const webhookSecret = generateStrongSecret();
  const externalWebhookSecret = generateStrongSecret();
  
  // Arquivo .env limpo
  const envContent = `# Stripe API Keys
# Use sk_test for development and sk_live only in production
# NUNCA COMITE CHAVES REAIS EM ARQUIVOS DE CÓDIGO
STRIPE_SECRET_KEY=sk_test_SUBSTITUA_PELA_SUA_CHAVE_SECRETA
STRIPE_PUBLISHABLE_KEY=pk_test_SUBSTITUA_PELA_SUA_CHAVE_PUBLICA

# Server Port
PORT=3000

# Stripe Webhook Secret
# Segredo forte gerado automaticamente
STRIPE_WEBHOOK_SECRET=whsec_${webhookSecret}

# Environment Configuration
# "development", "test" ou "production"
NODE_ENV=development

# Allowed CORS URL (leave blank to allow all in development)
CORS_ORIGIN=http://localhost:3000

# Rate Limiting Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuração de Webhook Externo
# URL para onde os dados de pagamento serão enviados após processamento
EXTERNAL_WEBHOOK_URL=https://seu-servico-webhook.com/endpoint
# Defina como "true" para enviar dados para webhook externo
SEND_TO_EXTERNAL_WEBHOOK=true
# Segredo para assinatura HMAC do webhook externo
EXTERNAL_WEBHOOK_SECRET=${externalWebhookSecret}
`;

  // Escrever o novo arquivo
  fs.writeFileSync('.env.new', envContent);
  console.log(`${colors.green}✓ Novo arquivo .env.new criado com sucesso${colors.reset}`);
  console.log(`${colors.yellow}! Para usá-lo, renomeie o arquivo para .env:${colors.reset}`);
  console.log(`${colors.yellow}! No Windows: ren .env.new .env${colors.reset}`);
  console.log(`${colors.yellow}! No Linux/Mac: mv .env.new .env${colors.reset}`);
  
  // Exibir os novos segredos (apenas para referência)
  console.log(`\n${colors.blue}Novos segredos gerados:${colors.reset}`);
  console.log(`${colors.green}STRIPE_WEBHOOK_SECRET=whsec_${webhookSecret.substring(0, 5)}...${colors.reset}`);
  console.log(`${colors.green}EXTERNAL_WEBHOOK_SECRET=${externalWebhookSecret.substring(0, 5)}...${colors.reset}`);
  
} catch (err) {
  console.error(`${colors.red}✗ Erro ao criar novo arquivo .env: ${err.message}${colors.reset}`);
}

console.log(`\n${colors.green}Processo concluído!${colors.reset}`); 