# Guia de Integração - FastProxy

## Estrutura do Projeto

O projeto FastProxy é dividido em dois componentes principais:

1. **Frontend (porta 3000)**
   - Serve os arquivos estáticos da interface
   - Atua como um proxy para o backend, encaminhando requisições
   - Pasta: `frontend/`

2. **Backend (porta 8080)**
   - Gerencia a integração com a API do Stripe
   - Processa pagamentos e webhooks
   - Gerencia as configurações do sistema
   - Pasta: `backend/`

## Configuração de Ambiente

### Arquivos de Ambiente (.env)

#### Localização dos arquivos .env

Os arquivos de configuração de ambiente estão localizados na pasta `backend/`:

- `backend/.env` - Configurações para ambiente de desenvolvimento
- `backend/.env.production` - Configurações para ambiente de produção
- `backend/env.template` - Modelo de arquivo .env

Se o arquivo `.env` não existir, o sistema tentará criar um a partir do `env.template`.

#### Principais variáveis de ambiente

```
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_SuaChaveSecretaDoStripe
STRIPE_PUBLISHABLE_KEY=pk_test_SuaChavePublicaDoStripe

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_SeuSegredoDoWebhook

# Server Port
PORT=8080

# Allowed CORS URL
CORS_ORIGIN=http://localhost:3000

# Rate Limiting Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuração de Webhook Externo
EXTERNAL_WEBHOOK_URL=https://seu-servico-webhook.com/endpoint
SEND_TO_EXTERNAL_WEBHOOK=true
```

## Comunicação Entre Frontend e Backend

O frontend atua como um proxy para o backend:

1. **Requisições do navegador** → Frontend (porta 3000)
2. **Frontend** → Backend (porta 8080)
3. **Backend** → Stripe API

### Rotas Importantes

- `/stripe-key` - Obtém a chave pública do Stripe
- `/create-checkout-session` - Cria uma sessão de checkout do Stripe
- `/api/stripe/webhooks/incoming` - Endpoint para webhooks do Stripe

## Inicialização do Sistema

### Script de Inicialização

O arquivo `start-app.js` na raiz do projeto inicia tanto o frontend quanto o backend:

```bash
node start-app.js
```

Este script:
1. Verifica dependências em ambos os diretórios
2. Inicia o servidor backend (porta 8080)
3. Inicia o servidor frontend (porta 3000)
4. Configura logs para cada processo

## Depuração e Solução de Problemas

### Logs

Os logs são armazenados na pasta `logs/` na raiz do projeto.

### Testes Manuais

Para testar apenas o backend:
```bash
cd backend
node server.js
```

Para testar apenas o frontend:
```bash
cd frontend
node server.js
```

### Verificação de Conexão

Se o frontend não conseguir se conectar ao backend, verifique:

1. O backend está executando na porta configurada (8080 por padrão)
2. O frontend está configurado para acessar o backend corretamente (BACKEND_URL)
3. As configurações CORS no backend permitem requisições do frontend

## Segurança

- Todas as chaves do Stripe devem ser mantidas no arquivo `.env`
- As chaves de produção (sk_live_) não devem ser usadas em ambiente de desenvolvimento
- O arquivo `.env` está incluído no `.gitignore` para evitar comprometimento de chaves 