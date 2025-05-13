#!/bin/bash

echo "Configurando ambiente Docker..."

<<<<<<< HEAD
# Criar arquivo .env para Docker Compose se não existir
if [ ! -f ".env" ]; then
    cat > .env << EOL
=======
# Criar arquivo .env para Docker Compose
cat > .env << EOL
>>>>>>> edfff44 (Initial commit)
# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

<<<<<<< HEAD
# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here

# Domain Configuration
DOMAIN=fastproxy.com.br
API_DOMAIN=api.fastproxy.com.br
EOL

    echo "Arquivo .env criado."
    echo "IMPORTANTE: Edite o arquivo .env e configure suas chaves antes de prosseguir!"
else
    echo "Arquivo .env já existe."
fi
=======
# Domain Configuration
DOMAIN=fastproxy.com.br
API_DOMAIN=api.fastproxy.com.br

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here
EOL
>>>>>>> edfff44 (Initial commit)

# Verificar se a rede traefik-public existe
if ! docker network ls | grep -q traefik-public; then
    echo "Criando rede traefik-public..."
    docker network create traefik-public
<<<<<<< HEAD
else
    echo "Rede traefik-public já existe."
fi

echo "Ambiente Docker configurado com sucesso!" 
=======
fi

echo "Ambiente Docker configurado com sucesso!"
echo "IMPORTANTE: Atualize as chaves no arquivo .env antes de prosseguir!" 
>>>>>>> edfff44 (Initial commit)
