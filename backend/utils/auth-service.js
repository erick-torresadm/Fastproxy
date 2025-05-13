/**
 * Serviço de autenticação
 */
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const jwtService = require('./jwt-service');
const config = require('../config');

// Caminho para o arquivo de usuários (na prática, seria um banco de dados)
const USERS_FILE = path.join(__dirname, '../config/users.json');

// Chave secreta para criar admin (deve ser definida no .env em produção)
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'admin-secret-key-dev-only';

/**
 * Inicializar o serviço de autenticação
 */
function initialize() {
  // Verificar se o arquivo de usuários existe
  if (!fs.existsSync(USERS_FILE)) {
    try {
      // Criar arquivo de usuários com estrutura inicial
      fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
      logger.info('Arquivo de usuários criado com sucesso');
    } catch (error) {
      logger.error(`Erro ao criar arquivo de usuários: ${error.message}`);
    }
  }
}

/**
 * Obter lista de usuários
 * @returns {Array} Lista de usuários
 */
function getUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    logger.error(`Erro ao ler usuários: ${error.message}`);
    return [];
  }
}

/**
 * Salvar usuários no arquivo
 * @param {Array} users - Lista de usuários
 */
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
  } catch (error) {
    logger.error(`Erro ao salvar usuários: ${error.message}`);
    throw error;
  }
}

/**
 * Criar um novo usuário administrador
 * @param {Object} userData - Dados do usuário
 * @param {String} secretKey - Chave secreta para autorizar a criação
 * @returns {Object} Resultado da operação
 */
async function createAdmin(userData, secretKey) {
  // Verificar se a chave secreta é válida
  if (secretKey !== ADMIN_SECRET_KEY) {
    logger.warn(`Tentativa de criar admin com chave inválida: ${secretKey}`);
    return { success: false, error: 'Chave secreta inválida' };
  }

  const { username, password, email } = userData;

  // Verificar se o usuário já existe
  const users = getUsers();
  if (users.some(user => user.username === username || user.email === email)) {
    return { success: false, error: 'Usuário ou email já existem' };
  }

  try {
    // Gerar ID único para o usuário
    const userId = crypto.randomUUID();
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar novo usuário
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      created: new Date().toISOString(),
      lastLogin: null
    };

    // Adicionar usuário à lista
    users.push(newUser);
    saveUsers(users);

    logger.info(`Novo admin criado: ${username}`);
    
    // Retornar usuário sem a senha
    const { password: _, ...userWithoutPassword } = newUser;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    logger.error(`Erro ao criar admin: ${error.message}`);
    return { success: false, error: 'Erro ao criar usuário' };
  }
}

/**
 * Autenticar um usuário
 * @param {String} username - Nome de usuário
 * @param {String} password - Senha
 * @returns {Object} Resultado da autenticação
 */
async function login(username, password) {
  try {
    // Buscar usuário
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return { success: false, error: 'Credenciais inválidas' };
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Tentativa de login com senha incorreta para ${username}`);
      return { success: false, error: 'Credenciais inválidas' };
    }

    // Atualizar último login
    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    // Gerar tokens
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = jwtService.generateToken(payload);
    const refreshToken = jwtService.generateToken(
      { id: user.id },
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    logger.info(`Login bem-sucedido: ${username}`);

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    logger.error(`Erro durante login: ${error.message}`);
    return { success: false, error: 'Erro durante autenticação' };
  }
}

/**
 * Atualizar token de acesso usando refresh token
 * @param {String} refreshToken - Token de atualização
 * @returns {Object} Resultado da operação
 */
function refreshAccessToken(refreshToken) {
  try {
    // Verificar refresh token
    const decoded = jwtService.verifyToken(refreshToken);
    if (!decoded || !decoded.id) {
      return { success: false, error: 'Token inválido' };
    }

    // Buscar usuário
    const users = getUsers();
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    // Gerar novo token de acesso
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = jwtService.generateToken(payload);

    return {
      success: true,
      accessToken
    };
  } catch (error) {
    logger.error(`Erro ao atualizar token: ${error.message}`);
    return { success: false, error: 'Erro ao atualizar token' };
  }
}

module.exports = {
  initialize,
  createAdmin,
  login,
  refreshAccessToken
}; 