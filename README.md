# FastProxy

Sistema de gerenciamento e venda de proxies IPv6 com integração de pagamentos via Stripe.

## Funcionalidades

- Interface de usuário moderna e responsiva
- Sistema de checkout usando Stripe
- Painel administrativo para gestão de proxies
- Planos de assinatura mensal e anual
- Descontos por volume de compra
- Sistema de webhooks para integração

## Tecnologias utilizadas

- **Frontend**: HTML, CSS, JavaScript puro
- **Backend**: Node.js, Express
- **Pagamentos**: Stripe API

## Requisitos

- Node.js 18 ou superior
- Conta Stripe (para processamento de pagamentos)

## Instalação e Execução

### Instalação Manual

1. Clone o repositório:
   ```bash
   git clone https://github.com/erick-torresadm/Fastproxy.git
   cd Fastproxy
   ```

2. Instale as dependências do backend:
   ```bash
   cd backend
   npm install
   cp env.template .env
   # Edite o arquivo .env com suas configurações
   cd ..
   ```

3. Instale as dependências do frontend:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. Inicie a aplicação:
   ```bash
   node start-app.js
   ```

5. Acesse a aplicação em http://localhost:3000

## Configurações do Stripe

1. Crie uma conta no [Stripe](https://stripe.com)
2. Obtenha suas chaves de API no painel do Stripe
3. Configure as chaves no arquivo .env do backend:
   ```
   STRIPE_SECRET_KEY=sk_test_sua_chave_secreta
   STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica
   STRIPE_WEBHOOK_SECRET=whsec_seu_segredo_webhook
   ```

## Estrutura do Projeto

```
├── backend/              # Servidor Node.js com Express
│   ├── config/           # Configurações da aplicação
│   ├── middleware/       # Middlewares do Express
│   ├── utils/            # Utilitários e funções auxiliares
│   └── server.js         # Ponto de entrada do backend
├── frontend/             # Frontend web
│   ├── public/           # Arquivos públicos
│   │   ├── images/       # Imagens
│   │   ├── js/           # Scripts JavaScript
│   │   └── styles.css    # Estilos CSS
│   └── server.js         # Servidor estático para o frontend
└── start-app.js          # Script para iniciar a aplicação completa
```

## Licença

ISC © FastProxy Team 