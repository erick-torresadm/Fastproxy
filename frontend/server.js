const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; // Porta padrão alterada para 3000
const axios = require('axios');
const bodyParser = require('body-parser');

// Configuração do backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';

// Configurações para processamento de requisições
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Adicionar middleware para logging de requisições
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/create-subscription') {
    console.log(`[${new Date().toISOString()}] Requisição recebida: ${req.method} ${req.path}`);
    console.log('Corpo da requisição:', req.body);
  }
  next();
});

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Função para lidar com erros de requisição
function handleRequestError(error, res) {
  console.error('Erro ao comunicar com o backend:', error.message);
  
  // Verificar se o erro tem uma resposta do servidor
  if (error.response) {
    console.error('Dados da resposta de erro:', error.response.data);
    return res.status(error.response.status).json(error.response.data);
  }
  
  res.status(500).json({
    error: 'Erro ao processar requisição. Tente novamente mais tarde.',
    details: error.message
  });
}

// Endpoint proxy para o backend
app.post('/api/stripe/public-key', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/stripe/public-key`);
    res.json(response.data);
  } catch (error) {
    handleRequestError(error, res);
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Requisição recebida: POST /api/create-checkout-session`);
    console.log('Corpo da requisição:', req.body);
    
    console.log('Redirecionando solicitação para o backend:', req.body);
    const response = await axios.post(`${BACKEND_URL}/api/create-checkout-session`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    res.json(response.data);
  } catch (error) {
    handleRequestError(error, res);
  }
});

// Manter a rota antiga para compatibilidade, mas redirecionar para a nova rota
app.post('/api/create-subscription', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Requisição recebida: POST /api/create-subscription`);
    console.log('Corpo da requisição:', req.body);
    
    // Modificar os dados da requisição para se adequar à nova rota
    const modifiedData = {
      ...req.body,
      planType: req.body.planType || 'monthly'
    };
    
    console.log('Redirecionando solicitação para o backend:', modifiedData);
    // Redireciona para a nova rota
    const response = await axios.post(`${BACKEND_URL}/api/create-checkout-session`, modifiedData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    res.json(response.data);
  } catch (error) {
    handleRequestError(error, res);
  }
});

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

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: err.message
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor frontend rodando em http://localhost:${PORT}`);
  console.log(`Conectado ao backend em ${BACKEND_URL}`);
  console.log('Para encerrar o servidor, pressione Ctrl+C');
}); 