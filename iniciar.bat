@echo off
echo Iniciando FastProxy...
cd %~dp0
echo Diretorio atual: %CD%
echo.
echo Verificando dependencias necessarias...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERRO: Node.js nao esta instalado ou nao esta no PATH.
    echo Por favor, instale o Node.js e tente novamente.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js encontrado: 
node --version

echo.
echo Iniciando a aplicacao...
node start-app.js

echo.
if %ERRORLEVEL% neq 0 (
    echo Ocorreu um erro ao iniciar a aplicacao.
    pause
) else (
    echo Aplicacao encerrada.
    pause
) 