# Cmder Container (Simple Multi-Tab Manager) - Plan

## 1. Project Goal
Build a **simple, lightweight, non-overengineered desktop app** that acts as a container for **Cmder**:
- **Multiple Isolated Tabs:** Open 10+ tabs at once without lag.
- **Path Preservation:** Each tab stays in its own project directory so you never lose your folder path.
- **Easy Navigation:** Clickable tab bar, quick shortcuts (`Ctrl+T`, `Ctrl+W`, `Ctrl+1`..`9`).
- **Inter-Tab Connectivity:** A simple "Broadcast / Run in All Tabs" button to run commands across selected tabs simultaneously.

---

## 2. Keep It Simple: Clean Architecture (Zero Bloat)
We will **avoid complex frameworks** (no heavy React/Vue setup, no complicated build pipelines).

```
extension_cmder/
├── package.json          # Minimal dependencies: electron, node-pty, xterm
├── main.js               # Background process: spawns Cmder shell per tab
├── preload.js            # Safe bridge between UI and terminal processes
└── src/
    ├── index.html        # Clean, modern single-screen UI (Tab bar + Terminal view)
    ├── style.css         # Dark theme styled like Cmder (simple vanilla CSS)
    └── app.js            # Tab switching, adding tabs, broadcast logic
```

### Why this is the simplest solution:
1. **Direct Cmder Integration:** Each tab simply runs:
   ```cmd
   cmd.exe /k "C:\path\to\cmder\vendor\init.bat"
   ```
   with the specific project working directory (`cwd`) you choose.
2. **True Process Isolation:** Each tab has its own independent shell process (`node-pty`). Doing something in Tab 1 never freezes or disrupts Tab 2.
3. **No Build Steps Needed:** Uses standard Vanilla JavaScript + HTML/CSS with Electron. Run `npm start` and it works immediately.

---

## 3. Core Features to Build

### Feature 1: Simple Tab Bar
* `+ New Tab` button with an optional **"Select Project Folder"** dialog.
* Quick shortcuts:
  * `Ctrl + T`: Open new tab (defaults to current folder or home).
  * `Ctrl + W`: Close active tab.
  * `Ctrl + 1` to `Ctrl + 9`: Instant jump to tab #1 through #9.
* Tab rename on double click (e.g. name tabs: `Frontend`, `Backend`, `DB`, `Docker`).

### Feature 2: Project Path Memory
* Each tab shows its active folder name right on the tab header.
* Ability to save the current open tabs as a **"Workspace"** (saved into a small `workspaces.json`), so next time you open the app, all 10 project tabs re-open in their exact folders with one click.

### Feature 3: Simple Inter-Tab Connection
* **Broadcast Bar (Toggle with `Ctrl + B`):**
  * An input bar at the top: Type a command (e.g., `git pull` or `npm test`) and choose:
    * **Run on all tabs** OR
    * **Run on selected tabs**
* All targeted tabs execute the command at the same time.

### Feature 4: Cmder Icon & 1-Click Launcher (Easy Running)
* **Official Cmder Icon:** Use `cmder.ico` for the window, taskbar, and app header.
* **1-Click Launch (`run.bat`):** Double-click `run.bat` on Windows to immediately start the app—no need to remember terminal commands!
* **Auto-Detection:** Automatically detects your existing Cmder at `E:\Programs\cmder` (and standard fallbacks like `%CMDER_ROOT%`, `C:\cmder`).

---

## 4. Implementation Steps (3 Simple Steps)

### Step 1: Initialize Project & Setup Terminal Bridge
* Create `package.json` with `electron`, `node-pty`, and `@xterm/xterm`.
* Configure `main.js` to detect `Cmder` installation path.
* Wire up `node-pty` to spawn isolated Cmder instances.

### Step 2: Build the UI (Tab Bar + Terminal View)
* Build a clean UI with:
  * Top bar: Tab list, `+` button, and "Broadcast" toggle.
  * Center: Active terminal viewport using `xterm.js`.
* Implement tab switching (hiding inactive terminals, showing active one instantly without restarting processes).

### Step 3: Add Path Memory & Broadcast Feature
* Add folder picker to open a tab directly in any project folder.
* Add session saving to automatically remember tabs between restarts.
* Add broadcast bar to send text input to multiple tabs at once.
