@echo off
title Cmder Multi-Tab Container Launcher
cd /d "%~dp0"

echo ========================================================
echo   Launching Cmder Multi-Tab Container...
echo ========================================================

:: Check if server is already running on port 5321
netstat -ano | findstr :5321 >nul
if %ERRORLEVEL% equ 0 (
    echo Server is already active on port 5321.
) else (
    echo Starting background server...
    start /b node server.js >nul 2>&1
    :: Wait 1 second for server to initialize
    timeout /t 1 /nobreak >nul
)

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

exit
