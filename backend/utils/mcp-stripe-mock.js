/**
 * Mock do MCP Stripe para desenvolvimento
 * Este arquivo simula as chamadas ao MCP Stripe para facilitar o desenvolvimento
 */

const logger = require('./logger');

// Armazenar dados em memória para simular o Stripe
const mockDb = {
  customers: [],
  products: [],
  prices: [],
  paymentLinks: []
};

// Funções auxiliares para gerar IDs aleatórios
function generateCustomerId() {
  return `cus_${generateRandomString(14)}`;
}

function generateProductId() {
  return `prod_${generateRandomString(14)}`;
}

function generatePriceId() {
  return `price_${generateRandomString(14)}`;
}

function generatePaymentLinkId() {
  return `plink_${generateRandomString(14)}`;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Mock das funções do MCP Stripe
const mcpStripeMock = {
  // Funções para clientes
  createCustomer: async function(name, email, phone) {
    logger.debug(`[MOCK] Criando cliente: ${name}, ${email}`);
    
    const customer = {
      id: generateCustomerId(),
      name,
      email,
      phone,
      created: new Date().toISOString()
    };
    
    mockDb.customers.push(customer);
    return customer;
  },
  
  listCustomers: async function(email = null, limit = 10) {
    logger.debug(`[MOCK] Listando clientes, email: ${email}, limit: ${limit}`);
    
    let customers = [...mockDb.customers];
    
    if (email) {
      customers = customers.filter(c => c.email === email);
    }
    
    return {
      data: customers.slice(0, limit)
    };
  },
  
  // Funções para produtos
  createProduct: async function(name, description = '') {
    logger.debug(`[MOCK] Criando produto: ${name}`);
    
    const product = {
      id: generateProductId(),
      name,
      description,
      active: true,
      created: new Date().toISOString()
    };
    
    mockDb.products.push(product);
    return product;
  },
  
  listProducts: async function(limit = 10) {
    logger.debug(`[MOCK] Listando produtos, limit: ${limit}`);
    
    return {
      data: mockDb.products.slice(0, limit)
    };
  },
  
  // Funções para preços
  createPrice: async function(product, unitAmount, currency = 'brl') {
    logger.debug(`[MOCK] Criando preço para produto ${product}: ${unitAmount/100} ${currency}`);
    
    const price = {
      id: generatePriceId(),
      product,
      unit_amount: unitAmount,
      currency,
      active: true,
      created: new Date().toISOString()
    };
    
    mockDb.prices.push(price);
    return price;
  },
  
  listPrices: async function(product = null, limit = 10) {
    logger.debug(`[MOCK] Listando preços, produto: ${product}, limit: ${limit}`);
    
    let prices = [...mockDb.prices];
    
    if (product) {
      prices = prices.filter(p => p.product === product);
    }
    
    return {
      data: prices.slice(0, limit)
    };
  },
  
  // Funções para links de pagamento
  createPaymentLink: async function(lineItems, customer = null) {
    logger.debug(`[MOCK] Criando link de pagamento, customer: ${customer}`);
    
    const paymentLink = {
      id: generatePaymentLinkId(),
      url: `http://localhost:8080/mock-checkout?link_id=${generateRandomString(16)}`,
      customer,
      line_items: lineItems,
      created: new Date().toISOString()
    };
    
    mockDb.paymentLinks.push(paymentLink);
    return paymentLink;
  }
};

module.exports = mcpStripeMock; 