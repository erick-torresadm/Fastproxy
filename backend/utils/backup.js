/**
 * Script para backup do site FastProxy
 * Uso: node utils/backup.js [backup|restore] [caminho_opcional]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const DEFAULT_BACKUP_PATH = '../backups';
const FRONTEND_DIR = '../frontend';
const BACKEND_DIR = '.';

// Criar diretório de backup se não existir
if (!fs.existsSync(DEFAULT_BACKUP_PATH)) {
    fs.mkdirSync(DEFAULT_BACKUP_PATH, { recursive: true });
    console.log(`Diretório de backup criado em ${DEFAULT_BACKUP_PATH}`);
}

/**
 * Cria um backup dos arquivos importantes
 * @param {string} backupPath - Caminho para o backup
 */
function createBackup(backupPath = DEFAULT_BACKUP_PATH) {
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
    const backupDir = path.join(backupPath, `backup_${timestamp}`);
    
    // Criar diretórios para este backup
    fs.mkdirSync(path.join(backupDir, 'frontend', 'public'), { recursive: true });
    fs.mkdirSync(path.join(backupDir, 'backend'), { recursive: true });
    
    // Backup de arquivos da raiz
    const rootFiles = [
        '../README.md',
        '../DEPLOY.md',
        '../docker-compose.yml',
        '../.dockerignore',
        '../package.json',
        '../start-app.js'
    ];
    
    // Backup de pastas/arquivos do frontend
    const frontendFiles = [
        'public/index.html',
        'public/styles.css',
        'public/script.js',
        'public/maintenance.html',
        'public/checkout.html',
        'public/sucesso.html',
        'public/admin-login.html',
        'package.json',
        'server.js',
        'Dockerfile'
    ];
    
    // Backup de pastas/arquivos do backend
    const backendFiles = [
        'server.js',
        'package.json',
        'Dockerfile',
        'config/index.js',
        'utils/logger.js',
        'utils/auth-service.js',
        'utils/jwt-service.js',
        'middleware/http-logger.js',
        'middleware/auth.js',
        'middleware/validators.js',
        'languages/pt-br.json',
        'languages/en.json',
        'languages/es.json'
    ];
    
    // Copiar arquivos da raiz
    let filesBackedUp = 0;
    rootFiles.forEach(file => {
        const sourcePath = path.resolve(__dirname, file);
        if (fs.existsSync(sourcePath)) {
            const dest = path.join(backupDir, path.basename(file));
            fs.copyFileSync(sourcePath, dest);
            console.log(`✓ Arquivo ${file} copiado para ${dest}`);
            filesBackedUp++;
        } else {
            console.log(`⚠️ Arquivo ${file} não encontrado, pulando...`);
        }
    });
    
    // Copiar arquivos do frontend
    frontendFiles.forEach(file => {
        const sourcePath = path.resolve(__dirname, path.join(FRONTEND_DIR, file));
        if (fs.existsSync(sourcePath)) {
            const dest = path.join(backupDir, 'frontend', file);
            // Criar diretório de destino se necessário
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(sourcePath, dest);
            console.log(`✓ Arquivo frontend/${file} copiado`);
            filesBackedUp++;
        } else {
            console.log(`⚠️ Arquivo frontend/${file} não encontrado, pulando...`);
        }
    });
    
    // Copiar arquivos do backend
    backendFiles.forEach(file => {
        const sourcePath = path.resolve(__dirname, path.join(BACKEND_DIR, file));
        if (fs.existsSync(sourcePath)) {
            const dest = path.join(backupDir, 'backend', file);
            // Criar diretório de destino se necessário
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(sourcePath, dest);
            console.log(`✓ Arquivo backend/${file} copiado`);
            filesBackedUp++;
        } else {
            console.log(`⚠️ Arquivo backend/${file} não encontrado, pulando...`);
        }
    });
    
    console.log(`\nBackup concluído! ${filesBackedUp} arquivos salvos em ${backupDir}`);
    
    // Criar um arquivo zip do backup
    try {
        const zipFilePath = `${backupDir}.zip`;
        if (process.platform === 'win32') {
            // Comando para Windows usando PowerShell
            execSync(`powershell Compress-Archive -Path "${backupDir}/*" -DestinationPath "${zipFilePath}"`);
        } else {
            // Comando para Linux/Mac
            execSync(`zip -r "${zipFilePath}" "${backupDir}"`);
        }
        console.log(`Arquivo ZIP criado em ${zipFilePath}`);
    } catch (error) {
        console.log('⚠️ Não foi possível criar o arquivo ZIP. Você pode compactar o diretório manualmente.');
    }
}

/**
 * Restaura um backup
 * @param {string} backupPath - Caminho do backup a ser restaurado
 */
function restoreBackup(backupPath) {
    if (!backupPath) {
        // Listar backups disponíveis
        const backups = fs.readdirSync(DEFAULT_BACKUP_PATH)
            .filter(file => fs.statSync(path.join(DEFAULT_BACKUP_PATH, file)).isDirectory())
            .sort((a, b) => b.localeCompare(a)); // Ordenar por mais recente
        
        if (backups.length === 0) {
            console.log('Nenhum backup encontrado em ' + DEFAULT_BACKUP_PATH);
            return;
        }
        
        console.log('Backups disponíveis:');
        backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup}`);
        });
        
        console.log('\nPara restaurar, execute: node utils/backup.js restore ../backups/NOME_DO_BACKUP');
        return;
    }
    
    if (!fs.existsSync(backupPath)) {
        console.error(`Erro: O caminho do backup ${backupPath} não existe!`);
        return;
    }
    
    // Verificar se é um diretório
    const isDirectory = fs.statSync(backupPath).isDirectory();
    
    // Se for um arquivo ZIP, extrair primeiro
    if (!isDirectory && backupPath.endsWith('.zip')) {
        const extractDir = backupPath.replace('.zip', '');
        
        try {
            if (process.platform === 'win32') {
                // Comando para Windows usando PowerShell
                execSync(`powershell Expand-Archive -Path "${backupPath}" -DestinationPath "${extractDir}" -Force`);
            } else {
                // Comando para Linux/Mac
                execSync(`unzip -o "${backupPath}" -d "${extractDir}"`);
            }
            console.log(`Arquivo ZIP extraído para ${extractDir}`);
            backupPath = extractDir;
        } catch (error) {
            console.error('⚠️ Não foi possível extrair o arquivo ZIP. Tente extrair manualmente e usar o diretório como backup.');
            return;
        }
    }
    
    console.log(`Restaurando backup de ${backupPath}...`);
    
    // Verificar se o backup tem a estrutura esperada
    if (!fs.existsSync(path.join(backupPath, 'frontend')) || !fs.existsSync(path.join(backupPath, 'backend'))) {
        console.error('⚠️ Este backup não parece ter a estrutura de pastas esperada (frontend/backend).');
        console.log('Por favor, verifique se está usando um backup compatível com esta versão do sistema.');
        return;
    }
    
    // Restaurar arquivos da raiz
    const rootFiles = ['README.md', 'DEPLOY.md', 'docker-compose.yml', '.dockerignore', 'package.json', 'start-app.js'];
    rootFiles.forEach(file => {
        const sourcePath = path.join(backupPath, file);
        const destPath = path.resolve(__dirname, '../', file);
        
        if (fs.existsSync(sourcePath)) {
            // Fazer backup do arquivo atual antes de sobrescrevê-lo
            if (fs.existsSync(destPath)) {
                const tempBackup = `${destPath}.bak`;
                fs.copyFileSync(destPath, tempBackup);
                console.log(`✓ Backup temporário criado para ${file}`);
            }
            
            // Copiar o arquivo do backup
            fs.copyFileSync(sourcePath, destPath);
            console.log(`✓ Arquivo ${file} restaurado na raiz`);
        }
    });
    
    // Restaurar arquivos do frontend
    const frontendBackupDir = path.join(backupPath, 'frontend');
    if (fs.existsSync(frontendBackupDir)) {
        copyDirRecursive(frontendBackupDir, path.resolve(__dirname, FRONTEND_DIR));
        console.log('✓ Diretório frontend restaurado');
    }
    
    // Restaurar arquivos do backend
    const backendBackupDir = path.join(backupPath, 'backend');
    if (fs.existsSync(backendBackupDir)) {
        copyDirRecursive(backendBackupDir, path.resolve(__dirname, BACKEND_DIR));
        console.log('✓ Diretório backend restaurado');
    }
    
    console.log(`\nRestauração concluída a partir do backup ${backupPath}`);
}

/**
 * Copia um diretório recursivamente
 */
function copyDirRecursive(src, dest) {
    // Criar o diretório de destino se não existir
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    // Ler o conteúdo do diretório
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            // Se for um diretório, copiar recursivamente
            copyDirRecursive(srcPath, destPath);
        } else {
            // Se for um arquivo, apenas copiar
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Processamento dos argumentos da linha de comando
const command = process.argv[2]?.toLowerCase();
const customPath = process.argv[3];

if (!command) {
    console.log('Uso: node utils/backup.js [backup|restore] [caminho_opcional]');
    console.log('  backup  - Cria um backup dos arquivos importantes');
    console.log('  restore - Restaura um backup existente');
} else if (command === 'backup') {
    createBackup(customPath || DEFAULT_BACKUP_PATH);
} else if (command === 'restore') {
    restoreBackup(customPath);
} else {
    console.error(`Comando desconhecido: ${command}`);
    console.log('Uso: node utils/backup.js [backup|restore] [caminho_opcional]');
} 