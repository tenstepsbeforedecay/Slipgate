@echo off
REM ============================================================
REM  Slipgate - rebuild TgWsProxy_windows.exe from Python source
REM ============================================================

setlocal
set "ROOT=%~dp0..\.."
cd /d "%ROOT%"

set "PROXY_DIR=..\tg-ws-proxy-1.6.5"
set "VENV_PY=..\unified_proxy\venv\Scripts\python.exe"
set "ENTRY=scripts\build-tgws\_pyi_entry.py"
set "OUT=resources\tgws"

if not exist "%VENV_PY%" (
    echo [ERROR] Python venv not found: %VENV_PY%
    echo Create one and pip install pyinstaller cryptography
    pause
    exit /b 1
)

if not exist "%PROXY_DIR%\proxy\tg_ws_proxy.py" (
    echo [ERROR] tg-ws-proxy source missing: %PROXY_DIR%
    pause
    exit /b 1
)

if exist ".pyi-build" rmdir /s /q ".pyi-build"
if exist "%OUT%\TgWsProxy_windows.exe" del /q "%OUT%\TgWsProxy_windows.exe"
if not exist "%OUT%" mkdir "%OUT%"

"%VENV_PY%" -m PyInstaller --onefile --console --name "TgWsProxy_windows" ^
    --distpath "%OUT%" --workpath ".pyi-build" --specpath ".pyi-build" ^
    --paths "%PROXY_DIR%" ^
    --collect-submodules proxy ^
    --collect-submodules cryptography ^
    --hidden-import proxy ^
    --hidden-import proxy.tg_ws_proxy ^
    --hidden-import proxy.bridge ^
    --hidden-import proxy.config ^
    --hidden-import proxy.balancer ^
    --hidden-import proxy.fake_tls ^
    --hidden-import proxy.raw_websocket ^
    --hidden-import proxy.stats ^
    --hidden-import proxy.utils ^
    "%ENTRY%"

if errorlevel 1 (
    echo [ERROR] PyInstaller build failed
    pause
    exit /b 1
)

echo.
echo [OK] Built: %OUT%\TgWsProxy_windows.exe
endlocal
