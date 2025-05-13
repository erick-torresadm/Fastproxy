/**
 * Middleware de autenticação JWT
 */
const { expressjwt: jwt } = require('express-jwt');
const logger = require('../utils/logger');
const config = require('../config');
const crypto = require('crypto');

// Constante para evitar timing attacks
const FIXED_DELAY_MS = 200;
const MAX_RANDOM_DELAY_MS = 300;

// Função para criar atraso criptograficamente seguro
function secureRandomDelay() {
  const randomDelay = crypto.randomInt(0, MAX_RANDOM_DELAY_MS);
  return new Promise(resolve => setTimeout(resolve, FIXED_DELAY_MS + randomDelay));
}

// Middleware para proteger rotas com JWT
const requireAuth = jwt({
  secret: config.jwt.secret,
  algorithms: ['HS256'],
  credentialsRequired: true,
  getToken: function fromHeaderOrQuerystring(req) {
    // Verificar token no cabeçalho de autorização
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    } 
    // Verificar token na query string
    else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }
});

// Middleware para registrar erro de autenticação
const handleUnauthorized = async (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn(`Tentativa de acesso não autorizado: ${req.originalUrl} de ${req.ip}`);
    
    // Verificar se houve muitas tentativas do mesmo IP
    const ipAttempts = await trackFailedAttempts(req.ip);
    
    // Atrasar resposta para dificultar ataques de força bruta
    // Utilizando atraso criptograficamente seguro
    await secureRandomDelay();
    
    // Responder com erro 401
    res.status(401).json({ 
      error: 'Acesso não autorizado',
      message: 'Você precisa estar autenticado para acessar este recurso'
    });
  } else {
    next(err);
  }
};

// Função para rastrear tentativas falhas de autenticação
async function trackFailedAttempts(ip) {
  // Esta função seria implementada com armazenamento em memória ou Redis
  // para controlar tentativas falhas de autenticação e potencialmente
  // bloquear IPs com muitas tentativas
  // Por enquanto apenas registra no log
  logger.debug(`Tentativa de autenticação falha registrada para IP: ${ip}`);
  return 1; // Mock para contagem de tentativas
}

module.exports = { 
  requireAuth,
  handleUnauthorized
}; 