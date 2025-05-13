/**
 * Validadores para as requisições
 */
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validador para a criação da sessão de checkout
const validateCheckoutSession = [
  // Validar quantidade
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('A quantidade deve ser um número inteiro entre 1 e 100'),
  
  // Validar tipo de plano
  body('planType')
    .isIn(['monthly', 'yearly'])
    .withMessage('O tipo de plano deve ser "monthly" ou "yearly"'),
  
  // Middleware para verificar erros de validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validação falhou ao criar sessão de checkout: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware para validar o login
const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Nome de usuário é obrigatório')
    .isLength({ min: 4, max: 30 })
    .withMessage('Nome de usuário deve ter entre 4 e 30 caracteres'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validação falhou ao fazer login: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validador para criação de usuário administrativo
const validateAdmin = [
  body('username')
    .notEmpty()
    .withMessage('Nome de usuário é obrigatório')
    .isLength({ min: 4, max: 30 })
    .withMessage('Nome de usuário deve ter entre 4 e 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Nome de usuário deve conter apenas letras, números e sublinhados'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('secretKey')
    .notEmpty()
    .withMessage('Chave secreta é obrigatória'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validação falhou ao criar admin: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateCheckoutSession,
  validateLogin,
  validateAdmin
}; 