@echo off
title Create Silent Cmder Container Shortcut
cd /d "%~dp0"

echo Creating desktop and folder shortcut with Cmder icon (Silent / No Console Screen)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%~dp0Cmder Container.lnk'); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\""%~dp0launch_hidden.vbs\""'; " ^
  "$s.WorkingDirectory = '%~dp0'; " ^
  "$s.IconLocation = '%~dp0assets\cmder.ico,0'; " ^
  "$s.Description = 'Launch Cmder Multi-Tab Container (Silent)'; " ^
  "$s.WindowStyle = 7; " ^
  "$s.Save(); " ^
  "$d = [Environment]::GetFolderPath('Desktop'); " ^
  "Copy-Item '%~dp0Cmder Container.lnk' (Join-Path $d 'Cmder Container.lnk') -Force; " ^
  "Write-Host 'Shortcut created successfully with Cmder icon! Launches silently with ZERO console window.'"

pause
