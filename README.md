# FastProxy - Serviço de Proxies IPv6

## Estrutura do Projeto

O projeto FastProxy é composto por duas partes principais:

1. **Frontend (porta 3000)**
   - Interface de usuário acessível pelo navegador
   - Exibe informações sobre o serviço e a calculadora de preços
   - Permite que o usuário inicie o processo de checkout

2. **Backend (porta 8080)**
   - API que processa pagamentos via Stripe
   - Manipula as configurações do sistema (arquivo .env)
   - Gerencia os webhooks e comunicação com serviços externos

## Como Iniciar

### Método Fácil

Temos scripts de inicialização para facilitar a execução do projeto:

- **Windows**: Clique duas vezes no arquivo `iniciar.bat`
- **Linux/Mac**: Execute `./iniciar.sh` no terminal (pode ser necessário dar permissão com `chmod +x iniciar.sh`)

### Método Manual

Se preferir iniciar manualmente, siga os passos abaixo:

1. Certifique-se de estar no diretório raiz do projeto
2. Execute o comando `npm run start:all`

### Verificando se o Sistema está Funcionando

- Frontend: Abra o navegador e acesse `http://localhost:3000`
- Backend: O servidor da API estará rodando em `http://localhost:8080`

## Configuração

As configurações do sistema estão no arquivo `.env` na pasta `backend`. Um modelo está disponível em `backend/env.template`.

Configurações importantes:
- `STRIPE_SECRET_KEY`: Sua chave secreta do Stripe
- `STRIPE_PUBLISHABLE_KEY`: Sua chave pública do Stripe
- `PORT`: Porta do backend (padrão: 8080)

## Desenvolvimento

- O frontend está na pasta `frontend/`
- O backend está na pasta `backend/`
- Os logs são armazenados na pasta `logs/`

Para executar apenas o frontend: `npm run start:frontend`
Para executar apenas o backend: `npm run start`

## Observações Importantes

- O frontend e o backend são serviços separados que se comunicam via API
- O frontend deve acessar o backend na porta 8080
- Certifique-se que ambas as portas (3000 e 8080) estão disponíveis no seu sistema

## Execução Local

### Iniciar Apenas o Backend

```bash
# Na pasta raiz do projeto
npm start
```

### Iniciar Apenas o Frontend

```bash
# Na pasta raiz do projeto
npm run start:frontend
```

### Iniciar Ambos os Serviços

```bash
# Na pasta raiz do projeto
npm run start:all
```

## Desenvolvimento

Para desenvolvimento, você pode executar os servidores com hot-reload:

```bash
# Backend com hot-reload
npm run dev

# Frontend com hot-reload
npm run dev:frontend
```

## Backup e Restauração

O sistema inclui scripts para backup e restauração:

```bash
# Criar um backup
npm run backup

# Ver backups disponíveis e restaurar
npm run restore
```

## Implantação

Para implantar o sistema em um ambiente de produção:

```bash
# Usando Docker Compose
docker-compose up -d
```

Consulte o arquivo `DEPLOY.md` para instruções detalhadas sobre a implantação do sistema em ambientes de produção.

## Características

- Layout responsivo para desktop e dispositivos móveis
- Design limpo e moderno com CSS variables
- Interatividade com JavaScript
- Fácil de personalizar e estender
- Suporte a múltiplos idiomas (pt-br, en, es)
- Sistema de backup e restauração integrado

## Requisitos

- Node.js 14+
- NPM 6+
- Docker e Docker Compose (para implantação em produção)

## Licença

Este projeto é distribuído sob a licença ISC.

## Autor

Seu Nome - [seu-email@exemplo.com](mailto:seu-email@exemplo.com) 