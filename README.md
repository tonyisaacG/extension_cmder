# 🚀 Cmder Multi-Tab Container

A fast, lightweight, and resilient multi-tab terminal container and orchestration environment for **Cmder** on Windows.  
Designed for software engineers and DevOps professionals managing microservices, cloud deployments, and multi-repo architectures without losing project paths or terminal context.

📖 **Complete Technical & Product Documentation:** Available in the [**`docs/`**](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/README.md) suite.  
📊 **Feature & Bug Tracker:** See [**`docs/FEATURE_AND_BUG_TRACKER.md`**](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/FEATURE_AND_BUG_TRACKER.md).

---

## ⚡ Key Features

* **Continuous Zero-Loss Tab Caching:** Automatically saves all open tabs, custom titles, working directories, active tab index, and grid mode in real time. Reopening the app immediately restores your workspace.
* **Isolated Multi-Tab Shells:** Spawn unlimited independent terminal instances. Each tab runs its own isolated Windows `cmd.exe /k vendor\init.bat` process with Cmder prompt (`λ`), Clink enhancements, and git branch detection.
* **Smart Working Directory Inheritance:** Clicking `+` or pressing `Alt + T` inherits the active tab's current folder (`cwd`). Use `📁` to launch a tab directly in any chosen directory via native Windows folder picker.
* **Session Snapshots & Buffer Memory (`Alt + M`):**
  * Freeze the complete terminal buffer, command history, and output results of active tabs into persistent snapshots (`snapshots.json`).
  * 1-Click **"Restore & Continue"** reopens historical terminal output in a live Cmder session so you can resume work from where you left off.
  * **"Iterative Snapshot Updates"**: Run new commands on remote servers and click **"🔄 Update Snapshot"** to overwrite the existing record with latest outputs without creating duplicate cards.
  * **"Export to Markdown (`.md`)"**: 1-Click download of session output formatted with Markdown headers, metadata, and fenced bash blocks.
  * **"Export to Image (`.png`)"**: 2x retina window screenshot card export directly using HTML5 Canvas.
  * 1-Click **"Copy Log"** copies multi-page console output to the system clipboard for bug reports or audits.
  * Quick **Clear Screen (`Alt + K`)** and **Reset Shell Process**.
* **Modern Decluttered UI:**
  * Segmented, flat header tool groups (`[Grid/Broadcast]`, `[Scripts/Vault/Snapshots/Workspaces]`, `[Clear/Guide]`) that free up 200px+ space for tabs.
  * Minimalist statusbar with an interactive `<kbd>Alt+H</kbd> Shortcuts & Guide` trigger.
* **Saved Scripts & Batch Store (`Alt + S` / `run_c`):**
  * Store reusable deployment batches, SSH sessions, and multi-step scripts in `user_scripts/*.bat` and `scripts.json`.
  * Type `run_c` in any terminal to list scripts; type `run_c <name> [args]` to execute.
  * Native Cmder Clink tab-completion (`run_c ` + `Tab`).
* **Secrets & Notes Vault (`Alt + V` / `pass_c`):**
  * Store sensitive credentials, tokens, IP notes, and command snippets.
  * Fast Quick-Palette (`Alt + V`): type abbreviation and press Enter to paste directly into the active shell without switching windows.
  * CLI command `pass_c <key>` copies secrets directly to Windows clipboard via `clip.exe`.
* **Multi-Tab Command Broadcast (`Alt + B`):** Execute a command simultaneously across all or selected tabs (e.g., `git pull`, `npm test`, `docker compose restart`).
* **Dynamic Split & Grid Layouts (`Alt + G`):** Switch seamlessly between single-focus view and responsive multi-pane CSS Grid views (1x2, 2x2, 3x3).
* **Git Credential & Multi-Account Engine:** Transparent terminal-based Git authentication (`git push` / `pull`) with in-terminal account selection, eliminating hung invisible modal windows.
* **WebSocket Heartbeat & Re-attach:** 20-second ping/pong keep-alive prevents idle freezes. Auto-reconnects and rebinds running shell handles without restarting processes.

---

## 🚀 How to Run

### Option 1 (1-Click Desktop Launcher):
Double-click **[`custome_cmder.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/custome_cmder.bat)** or run **[`create_shortcut.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/create_shortcut.bat)** to create a desktop shortcut with the official Cmder icon. Launches in borderless, standalone Chromium app mode (`--app`).

### Option 2 (Command Line):
```bash
npm start
```
Then open `http://localhost:5321` in your browser.

---

## ⌨️ Keyboard Shortcuts

> 💡 **Architectural Split:**  
> To guarantee zero collisions, all **Extension Container** actions use **`Alt + Key`**, leaving all **`Ctrl + Key`** combinations (like `Ctrl+Q` to stop pagers, `Ctrl+R` for history, `Ctrl+C` for SIGINT, `Ctrl+W` to delete word) passed **directly to Cmder**!

### Extension Container Controls (`Alt + Key`):
| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Alt + T`** *(or `Alt+N`)* | **New Tab** | Opens a new tab inheriting the active tab's current directory |
| **`Alt + W`** | **Close Tab** | Closes active tab safely (does not close browser window) |
| **`Alt + ←` / `→`** | **Navigate Tabs** | Smoothly switch left / right between tabs without skipping |
| **`Alt + 1` .. `9`** | **Jump to Tab** | Instantly switches to Tab #1 through #9 |
| **`Alt + S`** | **Scripts Store** | Opens custom batch & script runner palette |
| **`Alt + V`** *(or `Alt+P`)* | **Secrets Vault** | Opens credentials vault with 1-click in-terminal paste |
| **`Alt + M`** | **Session Snapshots** | Opens session snapshot & buffer memory manager |
| **`Alt + K`** | **Clear Terminal** | Clears terminal screen and scrollback buffer (`cls`) |
| **`Alt + B`** | **Broadcast** | Toggles multi-tab command broadcast bar |
| **`Alt + G`** | **Grid Mode** | Toggles dynamic split-screen CSS Grid view |
| **`Alt + H`** *(or `F1`)* | **Help Guide** | Opens full guide & shortcuts cheat sheet |
| **`Escape`** | **Close Modal** | Closes any open modal or broadcast bar |

### Cmder Shell Controls (`Ctrl + Key`):
* **`Ctrl + Q`**: ASCII `\x11` (stops `git branch` / `less` pager, resumes flow control).
* **`Ctrl + C`**: Copies text if selected; sends `\x03` (SIGINT) to interrupt running processes if nothing selected.
* **`Ctrl + V`**: Pastes clipboard text directly into the shell once.
* **`Ctrl + R`**: Clink reverse-i-search history.
* **`Ctrl + W`**: Clink erase previous word.
* **`Ctrl + A` / `Ctrl + E`**: Jump to line start / end.
* **`Ctrl + L`**: Clear console display (`cls`).
* **`Ctrl + U`**: Erase current input line.

---

## 📁 Repository Structure

```
extension_cmder/
├── assets/
│   └── cmder.ico                 # Official Cmder icon
├── bin/                          # Global PATH CLI Utilities & Clink Hooks
│   ├── run_c.bat                 # Script store invoker (run_c <name>)
│   ├── run_c.lua                 # Clink Tab-autocomplete hook
│   ├── pass_c.bat                # Vault CLI clipboard utility
│   ├── val_c.bat                 # Vault CLI alias
│   └── vault_cli.js              # Vault CLI Node.js runner
├── docs/                         # Comprehensive Documentation Suite
│   ├── README.md                 # Suite table of contents
│   ├── 00_PRODUCT_REQUIREMENTS_DOCUMENT.md
│   ├── 01_ARCHITECTURE_OVERVIEW.md
│   ├── 02_BACKEND_DEEP_DIVE.md
│   ├── 03_FRONTEND_ENGINEERING.md
│   ├── 04_EVENT_BUBBLING_AND_KEYBOARD.md
│   ├── 05_PERSISTENCE_AND_STATE.md
│   ├── 06_SCRIPTS_AND_BATCH_STORE.md
│   ├── 07_SECRETS_AND_VAULT_ENGINE.md
│   ├── 08_WORKSPACES_AND_BROADCAST_ENGINE.md
│   ├── 09_RELIABILITY_HEARTBEAT_AND_DESKTOP_INTEGRATION.md
│   ├── 10_SESSION_SNAPSHOTS_AND_MEMORY.md
│   ├── 11_GIT_CREDENTIALS_AND_PTY_ENVIRONMENT.md
│   └── FEATURE_AND_BUG_TRACKER.md# Master feature & bug registry
├── public/                       # Frontend Zero-Build ES6 Web Application
│   ├── js/
│   │   ├── main.js               # Application bootstrap & coordinator
│   │   ├── tabManager.js         # Tab lifecycle & directory inheritance
│   │   ├── terminal.js           # xterm.js instance & key event routing
│   │   ├── shortcuts.js          # Unified Alt+Key dispatcher
│   │   ├── snapshotManager.js    # Session snapshots & buffer memory
│   │   ├── scriptsManager.js     # Script store & autocomplete modal
│   │   ├── vaultManager.js       # Secrets & credentials quick-palette
│   │   ├── broadcast.js          # Multi-tab broadcast controller
│   │   ├── grid.js               # Dynamic CSS Grid layout manager
│   │   ├── session.js            # Dual-layer auto-save & workspace manager
│   │   ├── theme.js              # Cmder ANSI color palette
│   │   └── helpModal.js          # Guide & cheat sheet controller
│   ├── index.html                # Semantic HTML5 container layout
│   └── style.css                 # Dark theme styling & responsive grid
├── server/                       # Modular Node.js Backend
│   ├── cmderDetector.js          # Cmder root discovery engine
│   ├── ptyManager.js             # ConPTY process manager & registry
│   └── routes.js                 # REST endpoints & static file server
├── user_scripts/                 # User-defined batch scripts (*.bat)
├── snapshots.json                # Persisted terminal session snapshots
├── scripts.json                  # Scripts & batch store metadata
├── vault.json                    # Credentials & secrets vault
├── workspaces.json               # Named workspace configurations
├── last_session.json             # Real-time session state snapshot
├── custome_cmder.bat             # Standalone desktop app launcher
├── create_shortcut.bat           # Desktop shortcut generator
├── server.js                     # HTTP & WebSocket entry point
├── package.json                  # Dependencies (node-pty, ws, @xterm)
├── feature.md                    # Feature roadmap & completed checklist
└── Bugs.md                       # Bug resolution register
```
