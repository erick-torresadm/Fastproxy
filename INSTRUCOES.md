# Instruções para Executar o Sistema FastProxy

Este documento contém instruções simples para executar o sistema de venda de proxies da FastProxy.

## Requisitos

- Node.js (versão 14 ou superior)
- Conta no Stripe para processamento de pagamentos (modo teste é suficiente)

## Configuração Inicial

1. **Configurar o Stripe:**
   - Crie uma conta no [Stripe](https://stripe.com) caso ainda não tenha
   - Obtenha sua chave secreta de teste (`sk_test_...`)
   - Edite o arquivo `backend/.env` e substitua a chave de exemplo pela sua

2. **Instalar Dependências:**
   - No diretório principal, abra uma janela de comando e execute:
   ```
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

## Executando o Sistema

### Método Fácil (Recomendado)

Simplesmente dê um duplo clique no arquivo `run-site.bat`. Isso abrirá duas janelas de terminal:
- Uma para o backend (porta 8081)
- Uma para o frontend (porta 3001)

Acesse o site no navegador através do endereço: http://localhost:3001

### Método Manual

Se preferir iniciar manualmente os servidores:

1. **Iniciar o Backend:**
   ```
   cd backend
   node simple-server.js
   ```

2. **Iniciar o Frontend (em outra janela de terminal):**
   ```
   cd frontend
   node server.js
   ```

3. Acesse o site no navegador: http://localhost:3001

## Funcionamento

- O sistema permite a venda de proxies IPv6 por R$ 14,90 cada
- O cliente pode escolher a quantidade desejada (botões + e -)
- Há opção de plano mensal ou anual (com 2 meses grátis)
- Ao clicar em "Finalizar Compra", o sistema gera uma sessão de checkout no Stripe
- O cliente é redirecionado para a página segura do Stripe para pagar via cartão
- Após o pagamento, o cliente é direcionado para a página de sucesso

## Solução de Problemas

- **Erro nos botões de quantidade:** Certifique-se de usar um navegador atualizado
- **Erro de conexão com o Stripe:** Verifique se a chave API no arquivo `.env` está correta
- **Páginas não carregam:** Certifique-se de que ambos os servidores (backend e frontend) estão rodando

Em caso de dúvidas ou problemas, entre em contato com o suporte.

---

© 2024 FastProxy. Todos os direitos reservados. 