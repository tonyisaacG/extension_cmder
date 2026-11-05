# Bugs
----
[x] when let screen to long time then return to write on i can write any thing but freeze i must close and open new one 
    - Fixed: Implemented WebSocket bidirectional heartbeat (ping/pong every 15-20s) to keep connections actively alive across sleep and idle periods.
    - Fixed: Added seamless client re-attach (`attach` message) so existing running terminal processes rebind to the active connection on reconnect without freezing.
    - Added: Online / Reconnecting status indicator in footer pill.

[x] when click to copy thing the text copy twice
    - Fixed: Prevented unthrottled selectionchange event from flooding system clipboard on every cursor drag.
    - Fixed: Intercepted Ctrl+C, Ctrl+V, and contextmenu with explicit event cancellation (preventDefault / stopPropagation) so browser native textarea events no longer double-paste or double-copy text.

[x] Ctrl abbreviations (like Ctrl+Q, Ctrl+R, Ctrl+W, Ctrl+C) not working in Cmder (e.g. stop showing git branches) or colliding with extension
    - Fixed: Strictly separated shortcuts by modifier key:
        * Extension container shortcuts are strictly `Alt + Key` (Alt+T, Alt+W, Alt+S, Alt+V, Alt+B, Alt+G, Alt+1..9, Alt+Arrows).
        * Extension no longer intercepts ANY `Ctrl + Key` combinations.
    - Fixed: Forwarded all `Ctrl + [A-Z]` keystrokes directly to Cmder as raw ASCII control bytes (e.g., `Ctrl+Q` -> `\x11`, `Ctrl+R` -> `\x12`, `Ctrl+W` -> `\x17`, `Ctrl+C` -> `\x03`).
    - Fixed: Prevented browser default actions (such as reloading on Ctrl+R, closing window on Ctrl+W, printing on Ctrl+P) when terminal is focused.

[x] Header and footer UI design became cluttered (heavy toolbar boxes crowding tabs, 11 shortcut chips in footer, harsh split-screen borders)
    - Fixed: Reorganized header into 3 clean, flat segmented tool groups (`[Grid / Broadcast]`, `[Scripts / Vault / Snapshots / Workspaces]`, `[Clear / Guide]`), recovering 200px+ space for tabs.
    - Fixed: Replaced the 11-shortcut wall in footer with an interactive `<kbd>Alt+H</kbd> Shortcuts & Guide` trigger.
    - Fixed: Calmed active grid pane focus ring with a soft, elegant glow instead of neon lines.

[x] Black console/command prompt screen opens in background when launching extension
    - Fixed: Created `launch_hidden.vbs` utilizing Windows Script Host (`wscript.exe`) with `SW_HIDE (0)` execution mode, ensuring 0% console window is allocated.
    - Fixed: Updated `custome_cmder.bat` and `run.bat` to decouple Node.js process using hidden PowerShell background execution.
    - Fixed: Updated `create_shortcut.bat` and refreshed desktop shortcut `Cmder Container.lnk` to target `wscript.exe` directly, launching the app completely silently with ZERO black console window.

[x] GitHub account selection / authentication dialog not showing when running git push or git pull
    - Fixed: Identified that background decoupling (`SW_HIDE (0)`) and WinPTY console scraping forced child Win32/WPF modal dialogs (spawned by Git Credential Manager) to be initialized invisibly by Windows, causing Git to hang silently.
    - Fixed: Injected `GCM_MODAL_PROMPT=0` and `GCM_GUI_PROMPT=0` into `server/ptyManager.js` and `server/cmder_init.bat`, forcing Git Credential Manager to display its interactive account selector directly inside the active terminal tab.
    - Fixed: Injected `GIT_TERMINAL_PROMPT=1` so fallback Git username/password prompts render directly into xterm.js.
    - Added: Automatic account binding (`git config credential.https://github.com.username tonyisaacG`) eliminating manual selection prompts for this repository.




