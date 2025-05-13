/**
 * Classe para gerenciar autenticação no frontend
 */
class AuthService {
  constructor() {
    this.tokenKey = 'fastproxy_access_token';
    this.refreshTokenKey = 'fastproxy_refresh_token';
    this.userKey = 'fastproxy_user';
    
    // Verificar se o usuário está autenticado na inicialização
    this.checkAuthentication();
  }
  
  /**
   * Fazer login no sistema
   * @param {String} username - Nome de usuário
   * @param {String} password - Senha
   * @returns {Promise} Resultado da operação
   */
  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha na autenticação');
      }
      
      // Armazenar tokens e dados do usuário
      localStorage.setItem(this.tokenKey, data.accessToken);
      localStorage.setItem(this.refreshTokenKey, data.refreshToken);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verificar se o usuário está autenticado
   * @returns {Boolean} True se estiver autenticado
   */
  isAuthenticated() {
    return Boolean(this.getToken());
  }
  
  /**
   * Obter o token de acesso
   * @returns {String|null} Token de acesso ou null se não estiver autenticado
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }
  
  /**
   * Obter dados do usuário
   * @returns {Object|null} Dados do usuário ou null se não estiver autenticado
   */
  getUser() {
    try {
      const userStr = localStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return null;
    }
  }
  
  /**
   * Atualizar o token de acesso
   * @returns {Promise} Resultado da operação
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem(this.refreshTokenKey);
      
      if (!refreshToken) {
        return { success: false, error: 'Refresh token não encontrado' };
      }
      
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao atualizar token');
      }
      
      // Atualizar token de acesso
      localStorage.setItem(this.tokenKey, data.accessToken);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Fazer logout do sistema
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    
    // Redirecionar para a página inicial
    window.location.href = '/';
  }
  
  /**
   * Verificar status de autenticação no servidor
   */
  async checkAuthentication() {
    // Verificar se temos um token
    if (!this.isAuthenticated()) return;
    
    try {
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });
      
      // Se o token for inválido, tentar atualizar
      if (response.status === 401) {
        const refreshResult = await this.refreshToken();
        
        // Se não conseguir atualizar, fazer logout
        if (!refreshResult.success) {
          this.logout();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    }
  }
  
  /**
   * Adicionar cabeçalho de autorização a uma requisição
   * @param {Object} options - Opções da requisição
   * @returns {Object} Opções com cabeçalho de autorização
   */
  addAuthHeader(options = {}) {
    const token = this.getToken();
    
    if (!token) return options;
    
    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  }
}

// Criar instância global do serviço de autenticação
const authService = new AuthService(); 