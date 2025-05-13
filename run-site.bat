@echo off
title FastProxy - Sistema de Vendas de Proxies

echo ====================================================
echo     FastProxy - Inicializando Sistema de Vendas
echo ====================================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js e tente novamente.
    echo Voce pode baixar em: https://nodejs.org/
    pause
    exit /b 1
)

REM Configuração de portas
set BACKEND_PORT=8081
set FRONTEND_PORT=3000

REM Iniciar backend
echo [INFO] Iniciando servidor backend na porta %BACKEND_PORT%...
cd backend
start cmd /c "title FastProxy Backend && node simple-server.js"
cd ..

REM Aguardar o backend iniciar
echo [INFO] Aguardando o backend iniciar...
timeout /t 3 > nul

REM Iniciar frontend
echo [INFO] Iniciando servidor frontend na porta %FRONTEND_PORT%...
cd frontend
start cmd /c "title FastProxy Frontend && node server.js"
cd ..

echo.
echo ====================================================
echo     Servidor em execução!
echo ====================================================
echo.
echo Para acessar o site, abra seu navegador e acesse:
echo http://localhost:%FRONTEND_PORT%
echo.
echo Para interromper os servidores, feche as janelas ou
echo pressione Ctrl+C em cada terminal.
echo.
echo [IMPORTANTE] Os dois terminais precisam estar
echo rodando para que o site funcione corretamente.
echo ====================================================

pause 