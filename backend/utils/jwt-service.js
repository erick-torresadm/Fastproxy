/**
 * Serviço para gerenciamento de tokens JWT
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('./logger');
const config = require('../config');

/**
 * Gera um token JWT para um usuário
 * @param {Object} payload - Dados do usuário para incluir no token
 * @param {Object} options - Opções adicionais para o token
 * @returns {String} Token JWT
 */
function generateToken(payload, options = {}) {
  try {
    const defaultOptions = {
      expiresIn: config.jwt.expiresIn || '1h'
    };

    const tokenOptions = { ...defaultOptions, ...options };
    
    return jwt.sign(
      payload,
      config.jwt.secret,
      tokenOptions
    );
  } catch (error) {
    logger.error(`Erro ao gerar token JWT: ${error.message}`);
    throw error;
  }
}

/**
 * Verifica e decodifica um token JWT
 * @param {String} token - Token JWT para verificar
 * @returns {Object} Payload decodificado ou null se inválido
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    logger.warn(`Token JWT inválido: ${error.message}`);
    return null;
  }
}

/**
 * Gera um segredo forte para JWT
 * @returns {String} Segredo forte gerado
 */
function generateJwtSecret() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Extrai o token JWT da request
 * @param {Object} req - Request do Express
 * @returns {String|null} Token JWT ou null se não encontrado
 */
function extractTokenFromRequest(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

/**
 * Verifica se o token está expirado
 * @param {Object} decodedToken - Token JWT decodificado
 * @returns {Boolean} true se expirado, false caso contrário
 */
function isTokenExpired(decodedToken) {
  const now = Math.floor(Date.now() / 1000);
  return decodedToken.exp < now;
}

module.exports = {
  generateToken,
  verifyToken,
  generateJwtSecret,
  extractTokenFromRequest,
  isTokenExpired
}; 