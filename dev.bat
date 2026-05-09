@echo off
REM ============================================================
REM  Slipgate - dev launcher
REM  Starts electron-vite in dev mode (main + preload + renderer HMR).
REM ============================================================

chcp 65001 >nul
cd /d "%~dp0"

REM Some installed Electron apps leak ELECTRON_RUN_AS_NODE=1 into the user's
REM environment, which forces electron.exe to run as plain Node (no APIs).
REM Clear it for this shell so `pnpm dev` always boots a real Electron.
set "ELECTRON_RUN_AS_NODE="
set "NODE_ENV=development"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm not found, enabling via corepack...
    call corepack enable
)

if not exist "node_modules\" (
    echo [INFO] Installing dependencies ^(one-time^)...
    call pnpm install
    if errorlevel 1 exit /b 1
)

REM ----------------------------------------------------------------
REM Wipe stale compiled main/preload so Electron cannot pick up the
REM previous build before electron-vite finishes the dev recompile.
REM Renderer is served by Vite dev server, no rebuild needed there.
REM ----------------------------------------------------------------
if exist "out\main"    rmdir /s /q "out\main"    >nul 2>nul
if exist "out\preload" rmdir /s /q "out\preload" >nul 2>nul

REM Drop Vite's transform cache to force a clean rebuild after refactors.
if exist "node_modules\.vite"          rmdir /s /q "node_modules\.vite"          >nul 2>nul
if exist "node_modules\.vite-electron" rmdir /s /q "node_modules\.vite-electron" >nul 2>nul

echo.
echo ============================================================
echo  Starting Slipgate dev server
echo  Renderer: http://localhost:5173/
echo  Data dir: %%APPDATA%%\slipgate-dev  (isolated from production builds)
echo  Press Ctrl+C or close this window to stop.
echo ============================================================
echo.

call pnpm dev
