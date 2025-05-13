FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o código fonte
COPY . .

# Criar volume para persistência de dados
VOLUME ["/app/logs"]

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production

# Iniciar o servidor
CMD ["npm", "start"] 