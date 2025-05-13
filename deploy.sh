#!/bin/bash

echo "Iniciando deploy do FastProxy..."

# Puxar as últimas alterações do GitHub
git pull

# Parar os containers existentes
docker-compose -f fastproxy-deploy/docker-compose.yml down

# Reconstruir as imagens (sem cache para garantir últimas alterações)
docker-compose -f fastproxy-deploy/docker-compose.yml build --no-cache

# Subir os containers
docker-compose -f fastproxy-deploy/docker-compose.yml up -d

# Limpar imagens não utilizadas
docker image prune -f

echo "Deploy concluído com sucesso!"

# Mostrar logs dos containers
echo "Mostrando logs dos containers..."
docker-compose -f fastproxy-deploy/docker-compose.yml logs -f 