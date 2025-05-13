#!/bin/bash

echo "Iniciando deploy do FastProxy..."

# Verificar se está no diretório correto
if [ ! -d "fastproxy-deploy" ]; then
    echo "Erro: Diretório fastproxy-deploy não encontrado"
    echo "Execute este script do diretório raiz do projeto"
    exit 1
fi

cd fastproxy-deploy

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "Erro: Arquivo .env não encontrado"
    echo "Execute setup-docker.sh primeiro para criar o arquivo .env"
    exit 1
fi

# Parar os containers existentes
echo "Parando containers existentes..."
docker-compose down

# Reconstruir as imagens
echo "Reconstruindo imagens..."
docker-compose build --no-cache

# Subir os containers
echo "Iniciando containers..."
docker-compose up -d

# Limpar imagens não utilizadas
echo "Limpando imagens antigas..."
docker image prune -f

echo "Deploy concluído com sucesso!"

# Mostrar status dos containers
echo "Status dos containers:"
docker-compose ps

# Mostrar logs
echo "Mostrando logs dos containers..."
docker-compose logs -f