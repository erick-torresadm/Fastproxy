# Guia de Implantação - FastProxy

Este documento contém instruções para implantar o sistema FastProxy em uma VPS utilizando Docker e Portainer.

## Pré-requisitos

- Uma VPS com Docker e Portainer instalados
- Acesso SSH à VPS
- Conhecimento básico de Docker e Portainer

## Método 1: Implantação via Portainer

1. **Acesse o Portainer** da sua VPS através do navegador (normalmente em `http://seu-ip:9000`)

2. **Navegue até "Stacks"** no menu lateral e clique em "Add stack"

3. **Dê um nome à stack**, por exemplo: "fastproxy"

4. **Método de implantação**:
   - Escolha "Web editor"
   - Cole o conteúdo do arquivo `docker-compose.yml` no editor

5. **Configure o deploy**:
   - Você pode ajustar as portas no arquivo (se 8080 ou 3000 entrarem em conflito com algum serviço existente)
   - Certifique-se de que os volumes estão configurados corretamente

6. **Inicie o deploy** clicando em "Deploy the stack"

7. **Verifique se os serviços estão rodando** na página de detalhes da stack

## Método 2: Implantação via SSH

1. **Conecte-se à sua VPS via SSH**:
   ```
   ssh usuario@seu-ip
   ```

2. **Crie uma pasta para o projeto**:
   ```
   mkdir -p /opt/fastproxy
   cd /opt/fastproxy
   ```

3. **Clone o repositório ou envie os arquivos** para a VPS:
   ```
   git clone https://github.com/seu-usuario/fastproxy.git .
   ```
   Ou use SFTP/SCP para transferir os arquivos.

4. **Instale as dependências**:
   ```
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   cd ..
   ```

5. **Inicie os serviços com Docker Compose**:
   ```
   docker-compose up -d
   ```

6. **Verifique se os serviços estão rodando**:
   ```
   docker-compose ps
   ```

## Configurando um Proxy Reverso com Nginx

Se você já tem outros serviços rodando na VPS, pode ser útil configurar um proxy reverso com Nginx:

1. **Instale o Nginx** (se ainda não estiver instalado):
   ```
   apt update
   apt install nginx
   ```

2. **Crie uma configuração de site**:
   ```
   nano /etc/nginx/sites-available/fastproxy
   ```

3. **Adicione a seguinte configuração**:
   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Ative a configuração**:
   ```
   ln -s /etc/nginx/sites-available/fastproxy /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

5. **Configure o SSL com Certbot** (opcional, mas recomendado):
   ```
   apt install certbot python3-certbot-nginx
   certbot --nginx -d seu-dominio.com
   ```

## Subdiretório em uma VPS com Outros Sites

Se você precisa hospedar o FastProxy em um subdiretório (por exemplo, `seu-dominio.com/fastproxy`), configure o Nginx da seguinte forma:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Configuração FastProxy no subdiretório /fastproxy
    location /fastproxy/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /fastproxy/api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Outras configurações para seu site principal ou outros serviços
}
```

## Manutenção e Monitoramento

### Atualização do Sistema

Para atualizar o sistema para uma nova versão:

```
cd /opt/fastproxy
git pull
docker-compose up -d --build
```

### Logs

Para verificar os logs dos serviços:

```
# Logs do frontend
docker-compose logs frontend

# Logs do backend
docker-compose logs backend

# Acompanhar logs em tempo real
docker-compose logs -f
```

### Backup

Você pode usar o sistema de backup integrado:

```
cd /opt/fastproxy
npm run backup
```

Os backups serão salvos na pasta `backups/`.

## Solução de Problemas

Se encontrar problemas durante a implantação:

1. **Verifique os logs** dos containers para identificar erros:
   ```
   docker-compose logs
   ```

2. **Verifique as portas** para garantir que não haja conflitos:
   ```
   netstat -tulpn | grep -E '3000|8080'
   ```

3. **Reinicie os serviços** se necessário:
   ```
   docker-compose restart
   ```

4. **Reconstrua as imagens** se houver problemas de dependências:
   ```
   docker-compose up -d --build
   ```

5. **Problemas com os arquivos estáticos do frontend**:
   - Verifique se o volume do frontend está configurado corretamente
   - Tente reconstruir apenas a imagem do frontend:
     ```
     docker-compose build frontend
     docker-compose up -d frontend
     ``` 