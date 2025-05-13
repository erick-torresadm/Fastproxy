#!/bin/bash

echo "Configurando ambiente Docker..."

# Criar arquivo .env para Docker Compose
cat > .env << EOL
# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Domain Configuration
DOMAIN=fastproxy.com.br
API_DOMAIN=api.fastproxy.com.br

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here
EOL

# Verificar se a rede traefik-public existe
if ! docker network ls | grep -q traefik-public; then
    echo "Criando rede traefik-public..."
    docker network create traefik-public
fi

echo "Ambiente Docker configurado com sucesso!"
echo "IMPORTANTE: Atualize as chaves no arquivo .env antes de prosseguir!" 