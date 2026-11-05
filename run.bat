@echo off
title Cmder Multi-Tab Container Launcher
cd /d "%~dp0"

echo ========================================================
echo   Launching Cmder Multi-Tab Container...
echo ========================================================

:: Stop any stale server process on port 5321 to ensure the latest features are loaded
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5321') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting background server silently...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
timeout /t 1 /nobreak >nul

:: Find browser for standalone App Mode (Edge, Chrome, or default)
set BROWSER_CMD=
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_CMD=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_CMD=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_CMD=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_CMD=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if defined BROWSER_CMD (
    echo Opening in native Desktop App Mode...
    start "" "%BROWSER_CMD%" --app=http://localhost:5321 --window-size=1280,820
) else (
    echo Opening in default browser...
    start http://localhost:5321
)

exit /b
