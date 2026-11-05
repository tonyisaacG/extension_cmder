@echo off
setlocal

if "%~1"=="" (
    node "%~dp0vault_cli.js" list
    goto end
)

if /i "%~1"=="help" (
    node "%~dp0vault_cli.js" list
    goto end
)

if /i "%~1"=="list" (
    node "%~dp0vault_cli.js" list
    goto end
)

if /i "%~1"=="show" (
    node "%~dp0vault_cli.js" show "%~2"
    goto end
)

node "%~dp0vault_cli.js" get "%~1"

:end
endlocal
