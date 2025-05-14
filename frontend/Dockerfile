FROM node:20-alpine

WORKDIR /app

# Copiar apenas os arquivos de dependências primeiro
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o resto dos arquivos
COPY . .

# Expor a porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"] 