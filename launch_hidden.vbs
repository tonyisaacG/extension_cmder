Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir
' Window style 0 = SW_HIDE (completely hides the console screen)
WshShell.Run "cmd.exe /c """ & scriptDir & "\custome_cmder.bat"" --silent", 0, False
Set WshShell = Nothing
Set fso = Nothing
