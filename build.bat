@echo off
REM ============================================================
REM  Slipgate - production build script
REM
REM  Pipeline (each step hard-fails on error so a broken build
REM  can never silently ship):
REM     1. Admin check (signtool + APPDATA wipe need elevation)
REM     2. Tooling check (Node.js + pnpm)
REM     3. Stop running Slipgate / proxy processes
REM     4. Clean dist + out (and optionally APPDATA via --clean)
REM     5. Install dependencies (lockfile-safe)
REM     6. Rebuild icons from SVG (build/icon.ico, resources/*, logo)
REM     7. TypeScript typecheck (HARD fail)
REM     8. electron-vite + electron-builder (Windows installer + 7z)
REM     9. Verify artifacts
REM
REM  Flags:
REM     --clean         wipe %APPDATA%\slipgate before building
REM     --skip-icons    skip the icons:rebuild step
REM
REM  Bat is written in a deliberately flat style: every step lives at
REM  the top level (no goto inside parens-blocks), every error path
REM  ends with pause so the cmd window NEVER closes silently.
REM  All comments are ASCII-only on purpose.
REM ============================================================

cd /d "%~dp0"

set "DO_CLEAN=0"
set "SKIP_ICONS=0"
set "PASSTHROUGH="

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--clean"      set "DO_CLEAN=1"   & shift & goto parse_args
if /I "%~1"=="--skip-icons" set "SKIP_ICONS=1" & shift & goto parse_args
set "PASSTHROUGH=%PASSTHROUGH% %~1"
shift
goto parse_args
:args_done

set "BUILD_START=%TIME%"

echo.
echo ============================================================
echo  Slipgate production build
echo ============================================================

REM === [1/9] Admin check =======================================
echo.
echo === [1/9] Checking administrator privileges ===
fltmc >nul 2>&1
if errorlevel 1 goto need_admin
echo OK: running as administrator

REM === [2/9] Tooling check =====================================
echo.
echo === [2/9] Checking Node.js and pnpm ===
where node >nul 2>nul
if errorlevel 1 goto err_node
node -v

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm not found, enabling via corepack...
    call corepack enable >nul 2>nul
)
where pnpm >nul 2>nul
if errorlevel 1 goto err_pnpm
call pnpm -v

REM === [3/9] Stop running processes ============================
echo.
echo === [3/9] Stopping any running Slipgate / proxy processes ===
taskkill /F /IM Slipgate.exe         /T >nul 2>nul
taskkill /F /IM TgWsProxy_windows.exe /T >nul 2>nul
taskkill /F /IM winws.exe            /T >nul 2>nul
taskkill /F /IM elevate.exe          /T >nul 2>nul
ping -n 2 127.0.0.1 >nul
echo OK

REM === [4/9] Clean previous artifacts ==========================
echo.
echo === [4/9] Cleaning previous build output ===
if not exist "dist" goto skip_dist_remove
echo Removing dist...
rmdir /s /q "dist" >nul 2>nul
if not exist "dist" goto skip_dist_remove
echo Some files in dist are still locked. Retrying after a short wait...
ping -n 4 127.0.0.1 >nul
rmdir /s /q "dist" >nul 2>nul
if exist "dist" goto err_dist
:skip_dist_remove
if exist "out" rmdir /s /q "out" >nul 2>nul
echo OK: dist and out cleared

if not "%DO_CLEAN%"=="1" goto skip_userdata_wipe
echo.
echo Wiping production userData and autostart entries (--clean) ...
if exist "%APPDATA%\slipgate" rmdir /s /q "%APPDATA%\slipgate" >nul 2>nul
if exist "%APPDATA%\Slipgate" rmdir /s /q "%APPDATA%\Slipgate" >nul 2>nul
REM Leftovers from Flowseal's tray-GUI build of TgWsProxy. We now ship
REM a headless CLI mirror via tenstepsbeforedecay/slipgate-tgws-cli, but
REM if a user previously got the upstream tray exe through auto-update
REM their %APPDATA%\TgWsProxy ends up holding a config.json with a
REM stale secret/host (different from Slipgate's), which surfaces as
REM weird Telegram bugs (e.g. drag-and-drop file uploads failing while
REM text messages work). Wiping it on --clean guarantees a fresh test.
if exist "%APPDATA%\TgWsProxy" rmdir /s /q "%APPDATA%\TgWsProxy" >nul 2>nul
schtasks /delete /tn "Slipgate Auto Start" /f >nul 2>nul
schtasks /delete /tn "SlipgateAutoStart"   /f >nul 2>nul
echo OK: clean state restored
:skip_userdata_wipe

REM === [5/9] Install dependencies ==============================
echo.
echo === [5/9] Installing dependencies ===
call pnpm install --frozen-lockfile
if not errorlevel 1 goto install_done
echo.
echo WARN: pnpm-lock.yaml is out of sync. Regenerating it now.
echo       Use 'pnpm add' / 'pnpm remove' next time to keep it in sync.
call pnpm install --no-frozen-lockfile
if errorlevel 1 goto err_install
:install_done
echo OK: dependencies ready

REM === [6/9] Rebuild icons =====================================
if "%SKIP_ICONS%"=="1" goto icons_skipped
echo.
echo === [6/9] Rebuilding icons from SVG ===
if not exist "..\design\icon.svg" goto err_icons_missing
call pnpm run icons:rebuild
if errorlevel 1 goto err_icons
echo OK: icons regenerated
goto icons_done
:icons_skipped
echo.
echo === [6/9] Rebuilding icons === [SKIPPED via --skip-icons]
:icons_done

REM === [7/9] Typecheck (hard fail) =============================
echo.
echo === [7/9] Running TypeScript typecheck ===
call pnpm typecheck
if errorlevel 1 goto err_typecheck
echo OK: typecheck passed

REM === [8/9] Build Windows distribution ========================
echo.
echo === [8/9] Building Windows distribution ===
set "NODE_ENV=production"
set "ELECTRON_RUN_AS_NODE="
call pnpm build:win %PASSTHROUGH%
if errorlevel 1 goto err_build
echo OK: electron-builder finished

REM === [9/9] Verify artifacts ==================================
echo.
echo === [9/9] Verifying artifacts ===
set "ARTIFACTS_OK=1"
if not exist "dist\win-unpacked\Slipgate.exe"   ( echo MISSING: dist\win-unpacked\Slipgate.exe   & set "ARTIFACTS_OK=0" )
if not exist "dist\Slipgate_x64.exe"            ( echo MISSING: dist\Slipgate_x64.exe            & set "ARTIFACTS_OK=0" )
if not exist "dist\Slipgate_x64-portable.7z"    ( echo MISSING: dist\Slipgate_x64-portable.7z    & set "ARTIFACTS_OK=0" )
if "%ARTIFACTS_OK%"=="0" goto err_artifacts
echo OK: installer, portable archive, and unpacked tree present

REM ---- Summary ------------------------------------------------
echo.
echo ============================================================
echo  Build finished successfully
echo ------------------------------------------------------------
echo  Started : %BUILD_START%
echo  Ended   : %TIME%
echo  Output  : %CD%\dist
echo ============================================================
if exist "dist" start "" "%CD%\dist"
echo.
pause
exit /b 0


REM ===================== ERROR HANDLERS ========================
:need_admin
echo.
echo ============================================================
echo  ADMINISTRATOR PRIVILEGES REQUIRED
echo ============================================================
echo  Right-click build.bat in File Explorer and choose
echo  "Run as administrator". Click "Yes" on the UAC prompt.
echo ============================================================
echo.
pause
exit /b 1

:err_node
echo.
echo ERROR: Node.js was not found in PATH. Install from https://nodejs.org/
echo.
pause
exit /b 1

:err_pnpm
echo.
echo ERROR: Failed to enable pnpm. Install manually:  npm i -g pnpm
echo.
pause
exit /b 1

:err_dist
echo.
echo ERROR: Could not delete dist. Close any Explorer windows
echo        showing dist\win-unpacked and try again.
echo.
pause
exit /b 1

:err_install
echo.
echo ERROR: pnpm install failed. See log above.
echo.
pause
exit /b 1

:err_icons_missing
echo.
echo ERROR: ..\design\icon.svg not found.
echo        Either restore the SVG sources next to the project folder,
echo        or rerun with --skip-icons to keep the existing PNG/ICO.
echo.
pause
exit /b 1

:err_icons
echo.
echo ERROR: icons:rebuild failed. The build was aborted before
echo        producing a Slipgate.exe with stale or wrong icons.
echo.
pause
exit /b 1

:err_typecheck
echo.
echo ============================================================
echo  TYPECHECK FAILED
echo ============================================================
echo  Production build was aborted because TypeScript reported
echo  errors. Fix them, then re-run build.bat.
echo  (To bypass intentionally, run:  pnpm build:win  directly.)
echo ============================================================
echo.
pause
exit /b 1

:err_build
echo.
echo ERROR: electron-builder failed. See the log above for details.
echo.
pause
exit /b 1

:err_artifacts
echo.
echo ERROR: One or more expected artifacts are missing from dist\.
echo        electron-builder reported success, but the output is
echo        incomplete. Re-run with a clean dist (delete dist\ manually).
echo.
pause
exit /b 1
