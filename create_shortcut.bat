@echo off
title Create Cmder Container Shortcut
cd /d "%~dp0"

echo Creating desktop and folder shortcut with Cmder icon...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%~dp0Cmder Container.lnk'); " ^
  "$s.TargetPath = '%~dp0custome_cmder.bat'; " ^
  "$s.WorkingDirectory = '%~dp0'; " ^
  "$s.IconLocation = '%~dp0assets\cmder.ico,0'; " ^
  "$s.Description = 'Launch Cmder Multi-Tab Container'; " ^
  "$s.Save(); " ^
  "$d = [Environment]::GetFolderPath('Desktop'); " ^
  "Copy-Item '%~dp0Cmder Container.lnk' (Join-Path $d 'Cmder Container.lnk') -Force; " ^
  "Write-Host 'Shortcut created successfully with Cmder icon!'"

pause
