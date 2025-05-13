#!/bin/bash

echo "Iniciando FastProxy..."
# Mudar para o diretório do script
cd "$(dirname "$0")"
echo "Diretório atual: $(pwd)"
echo

echo "Verificando dependências necessárias..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não está instalado ou não está no PATH."
    echo "Por favor, instale o Node.js e tente novamente."
    echo "Download: https://nodejs.org/"
    exit 1
fi

echo "Node.js encontrado: $(node --version)"
echo

echo "Iniciando a aplicação..."
node start-app.js

echo
if [ $? -ne 0 ]; then
    echo "Ocorreu um erro ao iniciar a aplicação."
else
    echo "Aplicação encerrada."
fi 