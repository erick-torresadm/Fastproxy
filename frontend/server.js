const express = require('express');
const path = require('path');
const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 3000;

// Adicionar camadas de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://stripe.com"],
      connectSrc: ["'self'", "http://localhost:8080"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com"]
    }
  }
}));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true, // Ativar ETags para caching
  lastModified: true, // Ativar cabeçalhos Last-Modified
  setHeaders: (res, path) => {
    // Definir cabeçalhos de cache para diferentes tipos de arquivos
    if (path.endsWith('.html')) {
      // Para arquivos HTML, não cachear
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.endsWith('.css') || path.endsWith('.js')) {
      // Para CSS e JS, cachear por 1 dia
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
      // Para imagens, cachear por 7 dias
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

// Rota para manutenção (quando usuário clica em login ou acessar)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
});

app.get('/acessar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
});

// Redirecionar todas as outras rotas para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor frontend rodando em http://localhost:${PORT}`);
  console.log('Para encerrar o servidor, pressione Ctrl+C');
}); 