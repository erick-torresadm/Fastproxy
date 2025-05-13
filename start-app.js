/**
 * Script para iniciar a aplicação completa do FastProxy
 * (frontend e backend simultaneamente)
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Diretório de logs criado em ${logsDir}`);
}

// Log com timestamp
function log(message) {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    console.log(`[${timestamp}] ${message}`);
}

// Verificar se as dependências estão instaladas
function checkDependencies() {
    log('Verificando dependências...');
    
    // Verificar dependências do backend
    try {
        if (!fs.existsSync(path.join(__dirname, 'backend', 'node_modules'))) {
            log('Instalando dependências do backend...');
            execSync('npm install', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
        }
    } catch (error) {
        log(`Erro ao instalar dependências do backend: ${error.message}`);
        process.exit(1);
    }
    
    // Verificar dependências do frontend
    try {
        if (!fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'))) {
            log('Instalando dependências do frontend...');
            execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
        }
    } catch (error) {
        log(`Erro ao instalar dependências do frontend: ${error.message}`);
        process.exit(1);
    }
    
    log('Todas as dependências estão instaladas.');
}

// Função para iniciar um processo com log colorido
function startProcess(name, command, args, cwd, color) {
    const colorCodes = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        reset: '\x1b[0m'
    };

    log(`Iniciando ${name}...`);
    
    const proc = spawn(command, args, { 
        cwd: cwd,
        shell: true,
        stdio: 'pipe'
    });

    proc.stdout.on('data', (data) => {
        process.stdout.write(`${colorCodes[color]}[${name}] ${data}${colorCodes.reset}`);
    });

    proc.stderr.on('data', (data) => {
        process.stderr.write(`${colorCodes.red}[${name} ERROR] ${data}${colorCodes.reset}`);
    });

    proc.on('close', (code) => {
        log(`${name} finalizado com código ${code}`);
    });

    return proc;
}

// Verificar dependências antes de iniciar
checkDependencies();

// Iniciar backend
const backendProcess = startProcess(
    'BACKEND', 
    'node',
    ['server.js'],
    path.join(__dirname, 'backend'),
    'cyan'
);

// Iniciar frontend
const frontendProcess = startProcess(
    'FRONTEND',
    'node',
    ['server.js'],
    path.join(__dirname, 'frontend'),
    'green'
);

// Tratamento para encerramento gracioso
process.on('SIGINT', () => {
    log('Encerrando processos...');
    backendProcess.kill();
    frontendProcess.kill();
    setTimeout(() => {
        log('Aplicação encerrada.');
        process.exit(0);
    }, 1000);
});

log('FastProxy iniciado! Pressione Ctrl+C para encerrar todos os serviços.');
log('FRONTEND: http://localhost:3000');
log('BACKEND: http://localhost:8080'); 