#!/bin/bash

echo "Configurando variáveis de ambiente..."

# Criar .env do Frontend
cat > frontend/.env.production << EOL
NODE_ENV=production
REACT_APP_API_URL=https://api.fastproxy.com.br
PORT=3000
EOL

# Criar .env do Backend
cat > backend/.env << EOL
NODE_ENV=production
PORT=8081
CORS_ORIGIN=https://fastproxy.com.br
JWT_SECRET=your-secret-key-here
EOL

echo "Variáveis de ambiente configuradas com sucesso!" 