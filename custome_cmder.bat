@echo off
cd /d "%~dp0"

:: If not launched in silent mode, re-launch via wscript with zero console window
if not "%~1"=="--silent" (
    start wscript.exe "%~dp0launch_hidden.vbs"
    exit /b
)

:: Check if server is already running on port 5321
netstat -ano | findstr :5321 >nul
if %ERRORLEVEL% equ 0 (
    rem Server is already active
) else (
    rem Start Node.js server decoupled and completely hidden
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
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
    start "" "%BROWSER_CMD%" --app=http://localhost:5321 --window-size=1280,820
) else (
    start http://localhost:5321
)

exit /b
