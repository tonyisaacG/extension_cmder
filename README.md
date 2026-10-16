# Cmder Multi-Tab Container

A fast, lightweight, and isolated multi-tab container for **Cmder**. 
Designed to let you manage 10+ tabs across different project directories without losing your active paths.

📖 **Engineering Documentation:** Detailed architectural deep dives and diagrams are available in the [**`docs/`**](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/README.md) directory.

---

## 🚀 How to Run (1-Click)

### Option 1 (Easiest - Double Click):
Double-click **[`run.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/run.bat)**.
* Starts the background server.
* Opens the app in native frameless desktop app mode with the Cmder icon.

### Option 2 (Command Line):
```bash
npm start
```
Then visit `http://localhost:5321`.

---

## ⚡ Features

* **Automatic Tab Caching & Session Restore:**
  * You don't have to worry about losing your tabs when you close the app or restart your computer.
  * When you reopen the app, **all your previous tabs, custom names, and project directories are automatically restored** exactly as you left them!
* **Multiple Tabs (10+ Tabs):** Open and switch between as many tabs as you need. Each tab runs its own isolated Cmder process.
* **Never Lose Project Paths:** Each tab stays in its own project directory (`cwd`). Use the `📁` button to open a tab directly in any project folder.
* **Easy Switching & Renaming:**
  * Click any tab or press `Ctrl + 1` through `Ctrl + 9` to jump directly to it.
  * Double-click any tab title to rename it (e.g. `Frontend`, `Backend`, `Docker`).
* **Inter-Tab Broadcast Mode (`Ctrl + B`):**
  * Type a command once (e.g. `git pull` or `git status`) and execute it simultaneously across all open tabs.
* **Split / Grid View (`Ctrl + G`):**
  * Toggle between single full-screen tab and multi-tab side-by-side grid view.
* **Workspace Persistence (`💾 Workspaces`):**
  * Save your current set of tabs (with their project paths) as a named workspace so you can reload all 10 project tabs with one click next time.
* **Cmder Branding:** Uses the official Cmder icon and color theme.

---

## ⌨️ Keyboard Shortcuts (Browser Friendly)

> 💡 **Browser Conflict Note:** Browsers like Chrome and Edge reserve `Ctrl + T` and `Ctrl + W` for themselves.  
> Therefore, we support **`Alt + Key`** shortcuts which **never conflict** with Chrome/Edge tabs!

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Alt + T` *(or Ctrl+T)* | Open new tab | Creates new isolated tab (No conflict with Chrome!) |
| `Alt + W` *(or Ctrl+W)* | Close active tab | Closes active tab safely (Does not close your browser) |
| `Alt + ←` / `→` | Move between tabs | Navigate left / right across tabs with arrow keys |
| `Ctrl + Tab` | Cycle tabs | Cycle forward through tabs |
| `Alt + 1` .. `Alt + 9` | Instant jump to Tab 1-9 | Switches active tab without browser conflicts |
| `Alt + B` *(or Ctrl+B)* | Toggle Broadcast bar | Send command to all tabs at once |
| `Alt + G` *(or Ctrl+G)* | Toggle Grid view | See multiple terminals side-by-side |
| `Alt + H` *(or F1)* | Open Guide Modal | Full cheat sheet and how-to guide |
---

## 📁 Component-Based Project Structure

The project has been refactored into **modular, single-responsibility components** so the code is easy to read, modify, and understand:

```
extension_cmder/
├── assets/
│   └── cmder.ico                 # Official Cmder icon
│
├── server/                       # Backend Components
│   ├── cmderDetector.js          # Auto-detects Cmder installation & init.bat
│   ├── ptyManager.js             # Spawns & manages isolated node-pty shells
│   └── routes.js                 # HTTP endpoints (/api/info, /api/browse-folder, static files)
│
├── public/                       # Frontend Components (ES6 Modules)
│   ├── js/
│   │   ├── config.js / theme.js  # Cmder dark color palette
│   │   ├── state.js              # Centralized reactive state & WebSocket client
│   │   ├── terminal.js           # xterm.js instance initialization & FitAddon
│   │   ├── tabManager.js         # Tab lifecycle (create, close, switch, rename, badges)
│   │   ├── broadcast.js          # Inter-tab broadcast command bar
│   │   ├── grid.js               # Side-by-side grid & split-screen layouts
│   │   ├── session.js            # Real-time tab auto-caching & workspace save/load
│   │   ├── helpModal.js          # Guide & cheat sheet popup
│   │   ├── shortcuts.js          # Centralized keyboard shortcuts (Alt+Key)
│   │   └── main.js               # Clean entry point connecting all modules
│   ├── index.html                # App layout and structure
│   └── style.css                 # Clean CSS styling
│
├── server.js                     # Concise ~80 line server entry point
├── run.bat                       # 1-click launcher for Windows
├── last_session.json             # Auto-saved tab paths and session state
└── workspaces.json               # Named workspace profiles
```
