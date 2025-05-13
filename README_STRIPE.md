# Configuração do FastProxy com Stripe

## Configuração do Stripe

Para o funcionamento adequado do sistema de assinaturas, é necessário configurar as seguintes variáveis de ambiente:

1. Crie um arquivo `.env` na raiz do diretório `backend` com as seguintes variáveis:

```
# Configurações Stripe
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
STRIPE_MONTHLY_PRICE_ID=price_id_do_plano_mensal
STRIPE_YEARLY_PRICE_ID=price_id_do_plano_anual

# Configurações do servidor
PORT=8080
```

### Onde encontrar estas informações

1. **STRIPE_SECRET_KEY**: Disponível no Dashboard do Stripe > Developers > API Keys
2. **STRIPE_WEBHOOK_SECRET**: 
   - No Dashboard do Stripe, acesse Developers > Webhooks
   - Crie um endpoint com a URL do seu servidor: `https://seudominio.com/webhook`
   - Eventos para monitorar: 
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
   - O webhook secret será gerado após a criação

3. **STRIPE_MONTHLY_PRICE_ID e STRIPE_YEARLY_PRICE_ID**:
   - No Dashboard do Stripe, acesse Products
   - Crie produtos para seus planos com preços recorrentes (mensais e anuais)
   - Copie os IDs dos preços para o arquivo .env

## Correção de erros de porta

Se você encontrar erros relacionados a portas em uso:

```
Error: listen EADDRINUSE: address already in use :::3000
Error: listen EADDRINUSE: address already in use :::8080
```

Execute os seguintes comandos para liberar as portas:

### Windows
```
netstat -ano | findstr :3000
netstat -ano | findstr :8080
```
Anote os PIDs (números na última coluna) e execute:
```
taskkill /PID [PID_NUMBER] /F
```

### Linux/Mac
```
sudo lsof -i :3000
sudo lsof -i :8080
```
Anote os PIDs e execute:
```
sudo kill -9 [PID_NUMBER]
```

## Solução básica
Para evitar problemas com portas ocupadas, edite o arquivo `start-app.js` para usar portas alternativas:

```javascript
// Exemplo para mudar as portas
const FRONTEND_PORT = 3001;  // Em vez de 3000
const BACKEND_PORT = 8081;   // Em vez de 8080
```

## Fluxo de processamento de pagamento

1. Usuário seleciona quantidade de proxies e plano (mensal/anual)
2. Ao clicar em "Finalizar Compra", o backend cria uma sessão de checkout no Stripe
3. O usuário é redirecionado para a página de pagamento do Stripe
4. Após o pagamento, o Stripe envia um webhook para o servidor
5. O servidor processa o webhook e o usuário é redirecionado para a página de sucesso

## Testes e modo de desenvolvimento

Em ambiente de desenvolvimento, você pode usar os webhooks de teste do Stripe CLI:

```
stripe listen --forward-to localhost:8080/webhook
```

Isso permitirá testar todo o fluxo de pagamento sem precisar de um servidor publicamente acessível. 