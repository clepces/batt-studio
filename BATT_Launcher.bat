@echo off
:: Configurar la consola de Windows para UTF-8 de forma definitiva para evitar caracteres corruptos
chcp 65001 >nul
title BATT Enterprise - Orquestador Unificado de Servicios
cls

echo =====================================================================
echo    BUCA AGENTIC TRANSLATION TOOL (BATT) - SISTEMA DISTRIBUIDO (2026)
echo    PRO LEVEL ORCHESTRATOR - CONTROL DE CALIDAD Y SANIDAD ACTIVA
echo =====================================================================
echo.
echo [SISTEMA] Inicializando servicios locales en paralelo...
echo.

:: 1. Lanzar el servidor puente Node.js (Express) en paralelo de forma silenciosa
echo [SISTEMA] Iniciando Servidor Puente Express (Puerto 3000)...
start "BATT Bridge Server" /b node server.js

:: 2. Lanzar el compilador/servidor web de desarrollo Vite en paralelo
echo [SISTEMA] Iniciando Servidor de Desarrollo Vite (Puerto 5173)...
start "BATT Web Client" /b cmd /c npm run dev

echo.
echo =====================================================================
echo    TODOS LOS SERVICIOS EJECUTÁNDOSE EN PARALELO (EXPRESS + VITE)
echo    El vigilante de archivos de fondo se ejecuta nativamente en Express.
echo    Cierre este terminal o ejecute 'taskkill /f /im node.exe' para detener.
echo =====================================================================
echo.
pause