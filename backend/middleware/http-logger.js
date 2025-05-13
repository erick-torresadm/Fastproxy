/**
 * Middleware para logging de requisições HTTP
 */
const logger = require('../utils/logger');

const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  // Processar a requisição
  next();
  
  // Após a requisição ser processada
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ip}`;
    
    // Determinar o nível de log com base no status code
    if (statusCode >= 500) {
      logger.error(logMessage);
    } else if (statusCode >= 400) {
      logger.warn(logMessage);
    } else {
      logger.http(logMessage);
    }
  });
};

module.exports = httpLogger; 