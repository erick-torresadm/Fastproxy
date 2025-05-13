/**
 * Middleware de autenticação JWT
 */
const { expressjwt: jwt } = require('express-jwt');
const logger = require('../utils/logger');
const config = require('../config');

// Middleware para proteger rotas com JWT
const requireAuth = jwt({
  secret: config.jwt.secret,
  algorithms: ['HS256'],
  credentialsRequired: true,
  requestProperty: 'auth',
  isRevoked: async (req, token) => {
    // Verificar se o token está na blacklist (tokens revogados)
    // Esta é uma implementação básica, em produção deve-se usar Redis ou similar
    try {
      // Implementação simplificada, deve ser expandida em ambiente de produção
      return false; // Por enquanto, nenhum token está revogado
    } catch (err) {
      logger.error(`Erro ao verificar revogação de token: ${err.message}`);
      return false;
    }
  },
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
const handleUnauthorized = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn(`Tentativa de acesso não autorizado: ${req.originalUrl} de ${req.ip}`);
    
    // Atrasar resposta para dificultar ataques de força bruta
    setTimeout(() => {
      res.status(401).json({ 
        error: 'Acesso não autorizado',
        message: 'Você precisa estar autenticado para acessar este recurso'
      });
    }, Math.floor(Math.random() * 200) + 100);
  } else {
    next(err);
  }
};

module.exports = { 
  requireAuth,
  handleUnauthorized
}; 