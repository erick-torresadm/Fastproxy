FROM node:20-alpine

WORKDIR /app

# Copiar apenas os arquivos de dependências primeiro
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o resto dos arquivos
COPY . .

# Criar volume para persistência de dados
VOLUME ["/app/logs"]

# Expor a porta
EXPOSE 8080

# Variáveis de ambiente
ENV NODE_ENV=production

# Comando para iniciar
CMD ["node", "server.js"] 