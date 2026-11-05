@echo off
:: Cmder Container Shell Initializer
:: Calls official Cmder init.bat, then guarantees container bin and scripts are on PATH

if defined CMDER_ROOT (
    if exist "%CMDER_ROOT%\vendor\init.bat" (
        call "%CMDER_ROOT%\vendor\init.bat"
    )
)

:: Prepend container's bin/ (run_c, pass_c, val_c) and user_scripts/ to PATH
set "PATH=%~dp0..\bin;%~dp0..\user_scripts;%PATH%"

:: Ensure Git Credential Manager and Git interact via the terminal instead of
:: spawning suppressed Win32/WPF modal dialogs in the pseudo-terminal
set "GCM_MODAL_PROMPT=0"
set "GCM_GUI_PROMPT=0"
set "GIT_TERMINAL_PROMPT=1"
