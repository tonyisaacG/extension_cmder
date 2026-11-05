# feature
----
[x] when click on open project folder open new tab and open the project folder in it and when click to open new tab normaly open new tab in the same folder
    - Clicking the 📁 button ("Open project folder") opens a folder picker and creates a new tab directly in that chosen directory.
    - Clicking the `+` button or pressing `Alt + T` / `Ctrl + T` automatically inherits the currently active tab's working directory (`cwd`).

[x] i can save some thing session for server i logic before so i can save it or i can create batch in app so i can call it in cmder so i wnat genaret store i can save these script but i wnat way i can call it is unique for my app like run_c command or batch then run it and i wnat app also can sugest batch and script save on it okay this i think help me when try access service or save session or i can call batch contain credenatila so i can open direct okay 
    - Added Scripts & Batch Store with REST API (`/api/scripts`) and persistence in `scripts.json` and `user_scripts/*.bat`.
    - Created `bin/run_c.bat` injected into Cmder's PATH environment, allowing commands like `run_c <script_name>` or `run_c` (to list available scripts) from any directory in any tab.
    - Added interactive UI Scripts modal (`Alt + S` or header button `📜 Scripts`) with real-time search, suggestion auto-matching (press Enter to run top suggestion), 1-click execution in active tab or new tab, and built-in editor to save credentials, server sessions, and custom routines.

[x] i want add store this store i can save it some password or notes i can open with abbrivate i can copy it and can past anywhere okae and notes i can save it or delete or update and i can search in it and show result and when i click on it i can copy it and when i enter to it it opne in front the content of note and past it on top of my tab  and i can i imagine i can click it or type s+tab so show recomment title for this notes i can select it and it can past on cmder so i can apply this commmand like this ssh root@ip_server after this batch run i can get pass from store also by abbriv i make it easy not need to open thing then try copany then return to past you understand me ,i want aslo as store for save different thing okay 
    - Added Secrets & Notes Vault store with REST API (`/api/vault`) and file persistence in `vault.json`.
    - Created CLI commands `pass_c` and `val_c` in `bin/` with automatic Windows clipboard integration (`clip.exe`). Typing `pass_c <key>` copies the credential/note directly to the clipboard. Typing `pass_c` lists all saved items.
    - Added Clink Tab-completion in `bin/run_c.lua` (installed to `cmder/config/run_c.lua`): typing `pass_c ` or `val_c ` + Tab auto-completes abbreviations.
    - Added interactive Vault Quick-Palette modal (`Alt + V` or `Alt + P` or header button `🔐 Vault`):
        * Instant real-time abbreviation search & filter.
        * Pressing Enter immediately pastes the password/note directly into the active Cmder terminal tab without switching windows.
        * 1-Click Copy to clipboard with toast notification.
        * Password masking (`••••••`) with eye toggle button (👁).
        * Built-in CRUD editor to add, edit, and delete credentials, notes, tokens, and command snippets.

[x] i wanna add feature this feature is i wanna save session for cmder mean i run some command and return result so i want tkae snnap thi for this session and i can save this session snapshot for session i can open this session to compelete again ro clear this session or reset this sessiion okay
    - Added Session Snapshots & Buffer Memory Engine with REST API (`/api/snapshots`) and file persistence in `snapshots.json`.
    - Implemented full terminal scrollback and stdout buffer extraction directly from `xterm.js` canvas engine.
    - Added interactive Snapshots modal (`Alt + M` or header button `📸 Snapshots`):
        * "📸 Snapshot Active Tab": Captures active tab's full command history, terminal output, and current working directory (`cwd`).
        * "📸 Snapshot All Tabs": Captures entire multi-tab workspace with full historical buffers in a single snapshot.
        * "▶️ Restore & Continue": Opens saved snapshot in live terminal tabs with previous historical output re-rendered and attached to a live Cmder PTY session so developers can continue executing commands from where they left off.
        * "🔄 Update Snapshot" (Iterative Updates): When returning to a session (e.g. Day 2) and running new commands on a server, clicking "Update Snapshot" updates the existing snapshot with the latest outputs, preserving the snapshot ID and tracking `updatedAt` without creating messy duplicates.
        * "📝 Save as Markdown (.md)": 1-Click download of session output formatted as a clean, GitHub-flavored `.md` document with metadata and code blocks.
        * "🖼️ Save as Image (.png)": High-resolution (2x retina) window screenshot export using pure client-side HTML5 Canvas.
        * "📋 Copy Log": 1-Click copy of complete terminal output to Windows clipboard.
        * "🧹 Clear Screen & Buffer" (`Alt + K` or button): Instantly clears active terminal display and scrollback.
        * "🔄 Reset Shell Session": Kills and respawns a fresh shell process in the same tab without closing it.

[x] Git Credential Manager & GitHub multi-account interactive support
    - Injected `GCM_MODAL_PROMPT=0` and `GCM_GUI_PROMPT=0` in `server/ptyManager.js` and `server/cmder_init.bat`, preventing GCM from spawning invisible background Win32/WPF modal popups.
    - Added in-terminal interactive account selection menu so users can pick between multiple accounts directly in the tab.
    - Injected `GIT_TERMINAL_PROMPT=1` ensuring fallback Git credential prompts render directly into xterm.js without hanging.
    - Bound `credential.https://github.com.username tonyisaacG` for zero-friction, instant remote pushing/pulling.