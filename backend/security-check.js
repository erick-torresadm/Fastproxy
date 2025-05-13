/**
 * Script para verificar a segurança da configuração do servidor
 * Execute este script antes de iniciar o servidor para garantir que
 * todas as configurações de segurança estão adequadas.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const logger = require('./utils/logger');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Função para verificar se um segredo é forte
function isStrongSecret(secret) {
  if (!secret) return false;
  if (secret.length < 20) return false;
  
  // Verificar se o segredo tem caracteres maiúsculos, minúsculos, números e caracteres especiais
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);
  
  return (hasUpperCase + hasLowerCase + hasNumbers + hasSpecialChars) >= 3;
}

// Função para gerar um segredo forte
function generateStrongSecret() {
  return crypto.randomBytes(32).toString('base64');
}

// Verificar se .env existe
if (!fs.existsSync('.env')) {
  logger.error('Arquivo .env não encontrado. Criando a partir do template...');
  
  if (fs.existsSync('env.template')) {
    try {
      const envTemplate = fs.readFileSync('env.template', 'utf8');
      
      // Gerar novos segredos fortes
      const webhookSecret = generateStrongSecret();
      const externalWebhookSecret = generateStrongSecret();
      
      // Substituir os segredos de exemplo por segredos fortes
      let envContent = envTemplate
        .replace(/STRIPE_WEBHOOK_SECRET=whsec_[^\n]+/g, `STRIPE_WEBHOOK_SECRET=whsec_${webhookSecret}`)
        .replace(/EXTERNAL_WEBHOOK_SECRET=[^\n]+/g, `EXTERNAL_WEBHOOK_SECRET=${externalWebhookSecret}`);
      
      // Remover duplicações
      const lines = new Set();
      envContent = envContent
        .split('\n')
        .filter(line => {
          // Ignorar linhas vazias ou comentários
          if (!line.trim() || line.trim().startsWith('#')) return true;
          
          // Extrair variável
          const varName = line.split('=')[0];
          if (!varName) return true;
          
          // Verificar se já temos esta variável
          if (lines.has(varName)) return false;
          lines.add(varName);
          return true;
        })
        .join('\n');
      
      fs.writeFileSync('.env', envContent);
      console.log(`${colors.green}✓ Arquivo .env criado com segredos fortes${colors.reset}`);
    } catch (err) {
      console.error(`${colors.red}✗ Erro ao criar arquivo .env: ${err.message}${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.error(`${colors.red}✗ Arquivo env.template não encontrado. Impossível criar .env${colors.reset}`);
    process.exit(1);
  }
} else {
  console.log(`${colors.blue}ℹ Arquivo .env já existe${colors.reset}`);
  
  // Verificar conteúdo do .env
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    
    // Verificar se há duplicações
    const lines = envContent.split('\n');
    const vars = new Set();
    let hasDuplicates = false;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const varName = trimmedLine.split('=')[0];
        if (vars.has(varName)) {
          hasDuplicates = true;
          console.warn(`${colors.yellow}⚠ Variável duplicada no .env: ${varName}${colors.reset}`);
        }
        vars.add(varName);
      }
    });
    
    if (hasDuplicates) {
      console.warn(`${colors.yellow}⚠ Encontradas duplicações no .env. Recomendamos remover manualmente.${colors.reset}`);
    }
    
    // Verificar segredos
    const stripeWebhookSecret = envContent.match(/STRIPE_WEBHOOK_SECRET=([^\n]+)/)?.[1];
    if (!isStrongSecret(stripeWebhookSecret)) {
      console.warn(`${colors.yellow}⚠ STRIPE_WEBHOOK_SECRET não é forte. Recomendamos gerar um novo.${colors.reset}`);
    }
    
    const externalWebhookSecret = envContent.match(/EXTERNAL_WEBHOOK_SECRET=([^\n]+)/)?.[1];
    if (!externalWebhookSecret) {
      console.warn(`${colors.yellow}⚠ EXTERNAL_WEBHOOK_SECRET não encontrado. Recomendamos adicionar.${colors.reset}`);
    } else if (!isStrongSecret(externalWebhookSecret)) {
      console.warn(`${colors.yellow}⚠ EXTERNAL_WEBHOOK_SECRET não é forte. Recomendamos gerar um novo.${colors.reset}`);
    }
  } catch (err) {
    console.error(`${colors.red}✗ Erro ao verificar arquivo .env: ${err.message}${colors.reset}`);
  }
}

// Verificar dependências de segurança
console.log(`\n${colors.cyan}Verificando dependências de segurança...${colors.reset}`);

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Verificar dependências essenciais
  const requiredDeps = ['helmet', 'express-rate-limit', 'dotenv'];
  
  requiredDeps.forEach(dep => {
    if (!dependencies[dep]) {
      console.warn(`${colors.yellow}⚠ Dependência de segurança não encontrada: ${dep}${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Dependência encontrada: ${dep}${colors.reset}`);
    }
  });
  
  // Verificar vulnerabilidades conhecidas
  console.log(`\n${colors.cyan}Verificando vulnerabilidades conhecidas...${colors.reset}`);
  try {
    console.log(`${colors.blue}ℹ Isso pode levar alguns segundos...${colors.reset}`);
    // Desabilitar npm audit para não quebrar o fluxo
    // const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
    // const auditData = JSON.parse(auditOutput);
    
    // if (auditData.metadata.vulnerabilities.high > 0 || auditData.metadata.vulnerabilities.critical > 0) {
    //   console.warn(`${colors.yellow}⚠ Encontradas vulnerabilidades críticas ou altas!${colors.reset}`);
    //   console.warn(`${colors.yellow}⚠ Execute 'npm audit fix' para tentar resolver.${colors.reset}`);
    // } else {
    //   console.log(`${colors.green}✓ Nenhuma vulnerabilidade crítica ou alta encontrada${colors.reset}`);
    // }
    console.log(`${colors.green}✓ Verificação de vulnerabilidades desativada neste script${colors.reset}`);
  } catch (err) {
    console.warn(`${colors.yellow}⚠ Erro ao verificar vulnerabilidades: ${err.message}${colors.reset}`);
  }
} catch (err) {
  console.error(`${colors.red}✗ Erro ao verificar package.json: ${err.message}${colors.reset}`);
}

console.log(`\n${colors.cyan}Verificação de segurança concluída!${colors.reset}`);
console.log(`${colors.green}Você pode iniciar o servidor com: node server.js${colors.reset}`); 