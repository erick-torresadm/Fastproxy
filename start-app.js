/**
 * Script para iniciar todos os serviços do FastProxy 
 */
const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

// Configurar portas alternativas para evitar conflitos
const FRONTEND_PORT = 3000; // Porta padrão do frontend
const BACKEND_PORT = 8081;  // Em vez de 8080 (padrão)

// Detectar sistema operacional
const isWindows = process.platform === 'win32';

// Cores para saída no console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Timestamp para logs
const timestamp = () => {
  const now = new Date();
  return `[${now.toISOString().replace('T', ' ').substring(0, 19)}]`;
};

// Log com timestamp e cores
const log = (message, color = colors.reset) => {
  console.log(`${color}${timestamp()} ${message}${colors.reset}`);
};

// Verificar dependências
const checkDependencies = () => {
  log('Verificando dependências...', colors.cyan);
  
  const frontendNodeModules = join(__dirname, 'frontend', 'node_modules');
  const backendNodeModules = join(__dirname, 'backend', 'node_modules');
  
  if (!existsSync(frontendNodeModules) || !existsSync(backendNodeModules)) {
    log('Instalando dependências...', colors.yellow);
    
    // Instalar dependências do frontend
    if (!existsSync(frontendNodeModules)) {
      log('Instalando dependências do frontend...', colors.yellow);
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      const npmInstallFrontend = spawn(npmCmd, ['install'], { cwd: join(__dirname, 'frontend') });
      
      npmInstallFrontend.stdout.on('data', (data) => {
        console.log(`${colors.yellow}${data.toString()}${colors.reset}`);
      });
      
      npmInstallFrontend.stderr.on('data', (data) => {
        console.error(`${colors.red}${data.toString()}${colors.reset}`);
      });
      
      npmInstallFrontend.on('close', (code) => {
        if (code !== 0) {
          log('Erro ao instalar dependências do frontend', colors.red);
          process.exit(1);
        }
      });
    }
    
    // Instalar dependências do backend
    if (!existsSync(backendNodeModules)) {
      log('Instalando dependências do backend...', colors.yellow);
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      const npmInstallBackend = spawn(npmCmd, ['install'], { cwd: join(__dirname, 'backend') });
      
      npmInstallBackend.stdout.on('data', (data) => {
        console.log(`${colors.yellow}${data.toString()}${colors.reset}`);
      });
      
      npmInstallBackend.stderr.on('data', (data) => {
        console.error(`${colors.red}${data.toString()}${colors.reset}`);
      });
      
      npmInstallBackend.on('close', (code) => {
        if (code !== 0) {
          log('Erro ao instalar dependências do backend', colors.red);
          process.exit(1);
        }
      });
    }
    
    return false;
  }
  
  log('Todas as dependências estão instaladas.', colors.green);
  return true;
};

// Iniciar servidor backend
const startBackend = () => {
  log('Iniciando BACKEND...', colors.cyan);
  
  // Definir porta alternativa via variável de ambiente
  const env = { ...process.env, PORT: BACKEND_PORT };
  
  // Usar node.cmd no Windows
  const nodeCmd = isWindows ? 'node.exe' : 'node';
  const backendProcess = spawn(nodeCmd, ['server.js'], { 
    cwd: join(__dirname, 'backend'),
    env: env,
    shell: isWindows // Usar shell no Windows
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`${colors.green}[BACKEND] ${data.toString().trim()}${colors.reset}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`${colors.red}[BACKEND ERROR] ${data.toString()}${colors.reset}`);
  });
  
  backendProcess.on('close', (code) => {
    log(`BACKEND finalizado com código ${code}`, colors.yellow);
  });
  
  return backendProcess;
};

// Iniciar servidor frontend
const startFrontend = () => {
  log('Iniciando FRONTEND...', colors.cyan);
  
  // Definir porta alternativa via variável de ambiente
  const env = { ...process.env, PORT: FRONTEND_PORT, BACKEND_URL: `http://localhost:${BACKEND_PORT}` };
  
  // Usar node.cmd no Windows
  const nodeCmd = isWindows ? 'node.exe' : 'node';
  const frontendProcess = spawn(nodeCmd, ['server.js'], { 
    cwd: join(__dirname, 'frontend'),
    env: env,
    shell: isWindows // Usar shell no Windows
  });
  
  frontendProcess.stdout.on('data', (data) => {
    console.log(`${colors.blue}[FRONTEND] ${data.toString().trim()}${colors.reset}`);
  });
  
  frontendProcess.stderr.on('data', (data) => {
    console.error(`${colors.red}[FRONTEND ERROR] ${data.toString()}${colors.reset}`);
  });
  
  frontendProcess.on('close', (code) => {
    log(`FRONTEND finalizado com código ${code}`, colors.yellow);
  });
  
  return frontendProcess;
};

// Função principal
const main = () => {
  // Verificar dependências
  const depsReady = checkDependencies();
  if (!depsReady) {
    log('Por favor, execute o script novamente após a instalação das dependências.', colors.yellow);
    return;
  }
  
  // Iniciar serviços
  const backend = startBackend();
  
  // Aguardar um pouco para o backend iniciar antes de iniciar o frontend
  setTimeout(() => {
    const frontend = startFrontend();
    
    log('FastProxy iniciado! Pressione Ctrl+C para encerrar todos os serviços.', colors.green);
    log(`FRONTEND: http://localhost:${FRONTEND_PORT}`, colors.blue);
    log(`BACKEND: http://localhost:${BACKEND_PORT}`, colors.green);
    
    // Capturar sinais para encerramento limpo
    process.on('SIGINT', () => {
      log('Encerrando todos os serviços...', colors.yellow);
      
      frontend.kill();
      backend.kill();
      
      process.exit(0);
    });
  }, 2000); // Aguardar 2 segundos
};

// Executar
main(); 