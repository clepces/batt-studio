@echo off
title BATT ERP - Servidor de Telemetria Visual (Vite)
cls
echo =====================================================================
echo    BUCA AGENTIC TRANSLATION TOOL (BATT) - SERVIDOR DE TELEMETRIA
echo =====================================================================
echo.
echo [SISTEMA] Iniciando servidor de desarrollo local de alto rendimiento con Vite...
echo [SISTEMA] Esto resolvera de forma definitiva las restricciones de CORS.
echo [INFO]    Si experimentas problemas de memoria en tu entorno local (esbuild),
echo           puedes ejecutar: "npm run dev:fallback" para usar el servidor estatico.
echo.

:: Ejecuta el servidor dev de Vite
call npm run dev

echo.
echo =====================================================================
echo    SERVIDOR FINALIZADO O DETENIDO POR SEGURIDAD
echo =====================================================================
pause
