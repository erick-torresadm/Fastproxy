#!/bin/bash

echo "Iniciando deploy do FastProxy..."

# Puxar as últimas alterações do GitHub
git pull

# Instalar dependências do projeto principal
npm install

# Instalar dependências do backend
cd backend
npm install
cd ..

# Instalar dependências do frontend
cd frontend
npm install
cd ..

# Reiniciar os serviços usando PM2
pm2 reload all

echo "Deploy concluído com sucesso!" 