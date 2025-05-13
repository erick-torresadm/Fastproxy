@echo off
echo Iniciando FastProxy...
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERRO: Node.js não encontrado.
    echo Por favor, instale o Node.js e tente novamente.
    echo.
    echo Visite: https://nodejs.org/
    goto :EOF
)

REM Configurar as portas para evitar conflitos
set FRONTEND_PORT=3000
set BACKEND_PORT=8081

echo Iniciando servidores...
echo FRONTEND: http://localhost:%FRONTEND_PORT%
echo BACKEND: http://localhost:%BACKEND_PORT%
echo.
echo Pressione Ctrl+C seguido de S para encerrar os serviços.

REM Iniciar a aplicação usando o script principal
node start-app.js

REM Em caso de erro, manter a janela aberta
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocorreu um erro ao iniciar a aplicação.
    echo Verifique os logs acima para mais detalhes.
    pause
) 