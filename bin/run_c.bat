@echo off
setlocal enabledelayedexpansion

set "SCRIPTS_DIR=%~dp0..\user_scripts"
set "SCRIPTS_JSON=%~dp0..\scripts.json"

if "%~1"=="" goto show_help
if /i "%~1"=="help" goto show_help
if /i "%~1"=="list" goto show_help

set "SCRIPT_NAME=%~1"
set "TARGET_BAT=%SCRIPTS_DIR%\%SCRIPT_NAME%.bat"
set "TARGET_CMD=%SCRIPTS_DIR%\%SCRIPT_NAME%.cmd"

if exist "%TARGET_BAT%" (
    shift
    call "%TARGET_BAT%" %*
    goto end
)

if exist "%TARGET_CMD%" (
    shift
    call "%TARGET_CMD%" %*
    goto end
)

echo.
echo [Cmder Container] Script '%SCRIPT_NAME%' not found in saved scripts store!
echo.
goto show_help

:show_help
echo ====================================================================
echo   [Cmder Container] Script ^& Batch Store (run_c)
echo ====================================================================
echo Usage: run_c ^<script_name^> [optional_arguments]
echo.
echo Available Saved Scripts:

set "FOUND=0"
if exist "%SCRIPTS_DIR%" (
    for %%F in ("%SCRIPTS_DIR%\*.bat" "%SCRIPTS_DIR%\*.cmd") do (
        if exist "%%F" (
            set "FOUND=1"
            echo   * run_c %%~nF
        )
    )
)

if "!FOUND!"=="0" (
    echo   (No scripts saved yet. Use the 'Scripts' button in the app header to add one!)
)

echo.
echo Tip: Press Alt+S in the app or click 'Scripts' in the header to manage scripts.
echo ====================================================================

:end
endlocal
