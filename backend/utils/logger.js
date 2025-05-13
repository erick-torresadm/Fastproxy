/**
 * Configuração do logger para a aplicação
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Criar diretório de logs se não existir
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Definir níveis de log personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Adicionar cores ao Winston
winston.addColors(colors);

// Definir o formato dos logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Definir os transportes (onde os logs serão gravados)
const transports = [
  // Console para desenvolvimento
  new winston.transports.Console(),
  
  // Arquivo para todos os logs
  new winston.transports.File({
    filename: path.join(logDir, 'all.log'),
  }),
  
  // Arquivo separado para erros
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
  }),
];

// Criar a instância do logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'http' : 'debug',
  levels,
  format,
  transports,
});

module.exports = logger; 