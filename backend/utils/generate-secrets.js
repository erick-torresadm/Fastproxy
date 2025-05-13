/**
 * Utilitário para gerar segredos seguros
 * Execute com: node utils/generate-secrets.js
 */
const crypto = require('crypto');

// Gerar um segredo para o webhook
const webhookSecret = crypto.randomBytes(24).toString('base64');

console.log('===== Segredos Gerados =====');
console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
console.log('\nAdicione este valor ao seu arquivo .env');
console.log('============================='); 