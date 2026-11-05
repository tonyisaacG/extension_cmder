# 📊 Master Feature, Bug & Requirements Tracker

**Document Version:** 1.0.0  
**Author:** Senior Principal Engineer & Product Owner  
**Repository:** `extension_cmder`  
**Purpose:** Single Source of Truth (SSOT) tracking all product features, functional specifications, resolved defects, and architectural requirements.

---

## 1. Executive Status Board

| Metric | Count | Status |
| :--- | :--- | :--- |
| **Total Features Implemented** | 11 Core Features | 🟢 100% Complete & Active |
| **Bugs Identified & Resolved** | 6 Defects Resolved | 🟢 0 Open / 6 Resolved |
| **Persistence Stores** | 5 Local JSON Stores | `last_session.json`, `workspaces.json`, `scripts.json`, `vault.json`, `snapshots.json` |
| **CLI Utilities** | 3 System Commands | `run_c`, `pass_c`, `val_c` |
| **Architecture Type** | PTY Broker Pattern | ConPTY + WebSocket + Zero-Build ES6 Modules |

---

## 2. Feature & Functionality Catalog

### [FEAT-01] Multi-Tab Terminal Management & CWD Inheritance
* **Description:** Open unlimited isolated Cmder shell tabs. Each tab maintains an independent `node-pty` process.
* **CWD Inheritance:** Clicking `+` or pressing `Alt + T` automatically inherits the active tab's current working directory (`cwd`).
* **UI Trigger:** Header `+` button, `Alt + T` / `Alt + N`.
* **Responsible Modules:** [`public/js/tabManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/tabManager.js), [`server/ptyManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/ptyManager.js).
* **Status:** 🟢 Complete.

### [FEAT-02] Native Project Folder Browser
* **Description:** Opens a native Windows `FolderBrowserDialog` to select any folder on the system and launches a fresh tab inside it.
* **UI Trigger:** Header `📁` button.
* **Backend Endpoint:** `GET /api/browse-folder` (executes PowerShell folder dialog).
* **Responsible Modules:** [`server/routes.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/routes.js), [`public/js/tabManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/tabManager.js).
* **Status:** 🟢 Complete.

### [FEAT-03] Custom Scripts & Batch Store (`run_c`)
* **Description:** Centralized repository for reusable commands, server sessions, and automation scripts.
* **Storage Model:** Dual sync between `scripts.json` and raw batch files in `user_scripts/*.bat`.
* **CLI Trigger:** Type `run_c` in any tab to list scripts; type `run_c <name> [args]` to execute.
* **UI Trigger:** `Alt + S` or header `📜 Scripts`. Features real-time search, suggestion auto-match (Enter to run), and inline script CRUD editor.
* **Clink Integration:** `bin/run_c.lua` installed into Cmder for Tab-autocomplete.
* **Responsible Modules:** [`public/js/scriptsManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/scriptsManager.js), [`bin/run_c.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/bin/run_c.bat), [`server/routes.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/routes.js).
* **Status:** 🟢 Complete.

### [FEAT-04] Secrets & Notes Vault (`pass_c` / `val_c`)
* **Description:** Abbreviation-driven credentials lookup for instant in-terminal pasting without switching windows.
* **Storage Model:** Local encrypted/masked JSON store in `vault.json`.
* **CLI Trigger:** `pass_c <key>` copies credential directly to Windows clipboard via `clip.exe`. `pass_c` lists saved keys.
* **UI Trigger:** `Alt + V` or `Alt + P` or header `🔐 Vault`. Typing an abbreviation and pressing `Enter` immediately pastes into the active shell.
* **Responsible Modules:** [`public/js/vaultManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/vaultManager.js), [`bin/vault_cli.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/bin/vault_cli.js), [`bin/pass_c.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/bin/pass_c.bat).
* **Status:** 🟢 Complete.

### [FEAT-05] Session Snapshots & Buffer Memory
* **Description:** Freeze terminal scrollback, stdout results, and command history; restore them later to continue live execution, and update snapshots with new output.
* **Capabilities:**
  * Capture active tab or all workspace tabs into a persistent snapshot (`snapshots.json`).
  * Restore snapshots: writes historical logs back into `xterm.js` and attaches to a live Cmder session in that `cwd`.
  * **Iterative Session Update:** When returning to a restored session (e.g. Day 2), running new server commands and clicking **"🔄 Update Snapshot"** updates the existing snapshot with the latest outputs, preserving the ID and tracking `updatedAt`.
  * **Markdown Export (`.md`):** Generates clean, GitHub-flavored Markdown files with metadata tables and fenced `bash` code blocks for external documentation, ticketing, and PRs.
  * **Image Export (`.png`):** Generates crisp 2x retina window cards with traffic lights, title bar, and console syntax highlighting directly using HTML5 Canvas.
  * 1-Click Copy Log: copies complete multi-page console output to clipboard.
  * Clear Terminal (`Alt + K`): wipes screen and scrollback buffer.
  * Reset Shell: kills and respawns a fresh shell process in the same tab.
* **UI Trigger:** `Alt + M` or header `📸 Snapshots` (plus 1-click `📝 MD` / `🖼️ PNG` card buttons).
* **Responsible Modules:** [`public/js/snapshotManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/snapshotManager.js), [`server/routes.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/routes.js), [`server.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server.js).
* **Status:** 🟢 Complete.

### [FEAT-06] Inter-Tab Command Broadcasting
* **Description:** Execute a single command simultaneously across all open tabs or a selected subset of tabs.
* **UI Trigger:** `Alt + B` or header `⚡ Broadcast`.
* **Responsible Modules:** [`public/js/broadcast.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/broadcast.js), [`server/ptyManager.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/ptyManager.js).
* **Status:** 🟢 Complete.

### [FEAT-07] Dynamic CSS Grid Multi-Pane Engine
* **Description:** Split the viewport into responsive matrices (1x1, 1x2, 2x2, 2x3, 3x3) to monitor multiple running processes side-by-side.
* **UI Trigger:** `Alt + G` or header `⊞ Grid`.
* **Responsible Modules:** [`public/js/grid.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/grid.js).
* **Status:** 🟢 Complete.

### [FEAT-08] Continuous Zero-Loss Auto-Persistence
* **Description:** Real-time debounced dual-layer auto-caching (`localStorage` + `last_session.json`). Restores all tabs, custom names, and paths on restart.
* **Responsible Modules:** [`public/js/session.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/session.js).
* **Status:** 🟢 Complete.

### [FEAT-09] WebSocket Bidirectional Heartbeat & Process Re-attach
* **Description:** 20-second ping/pong heartbeat preventing idle TCP drops. Client auto-reconnects and rebinds running PTY sessions (`attach` protocol) without losing active state.
* **Responsible Modules:** [`server.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server.js), [`public/js/main.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/main.js).
* **Status:** 🟢 Complete.

### [FEAT-10] Cmder & Clink Shell Integration
* **Description:** Auto-detects Cmder installation and launches `cmd.exe /k vendor\init.bat` with Clink prompt (`λ`), aliases, and custom autocompletions.
* **Responsible Modules:** [`server/cmderDetector.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/cmderDetector.js), [`bin/run_c.lua`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/bin/run_c.lua).
* **Status:** 🟢 Complete.

### [FEAT-11] Standalone Desktop App Mode & Shortcut Generator
* **Description:** Launches in native frameless Chromium app mode (`--app`) with official Cmder icon and generates desktop `.lnk` shortcut.
* **Responsible Modules:** [`custome_cmder.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/custome_cmder.bat), [`create_shortcut.bat`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/create_shortcut.bat).
* **Status:** 🟢 Complete.

---

## 3. Bug Registry & Resolution Log

| Bug ID | Title & Symptoms | Root Cause | Implemented Resolution | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **Terminal Freezing After Idle/Sleep**<br>Screen becomes unresponsive after leaving tabs open or waking from PC sleep. | Silent TCP drops by OS power saving without TCP RST; frontend was reconnecting without re-binding existing running PTY processes. | 1. 20s ping/pong keep-alive heartbeat.<br>2. Seamless `attach` protocol re-binding active running PTY instances on reconnect.<br>3. Status pill indicator (Online / Reconnecting). | 🟢 Verified & Fixed |
| **BUG-02** | **Duplicate Text Copy & Paste Flooding**<br>Selected text copied twice; pasting triggered double input. | Both `selectionchange` and native browser textarea events fired concurrently with `xterm.js` internal handlers. | 1. Throttled selection capture on mouseup.<br>2. Explicit `preventDefault()` and `stopPropagation()` with `_handledByApp` flag.<br>3. Non-destructive Ctrl+C / Ctrl+V isolation. | 🟢 Verified & Fixed |
| **BUG-03** | **Ctrl Shortcuts Collision & Pager Failure**<br>`Ctrl+Q`, `Ctrl+C`, `Ctrl+R`, `Ctrl+W` collided with extension or failed in pagers (like stopping git branches). | Extension was intercepting `Ctrl+...` shortcuts (`Ctrl+T`, `Ctrl+W`, `Ctrl+B`, `Ctrl+G`), and browser was intercepting keys before xterm could process them. | 1. **Strict separation:** Extension uses strictly `Alt + Key`.<br>2. Extension ignores all `Ctrl + Key` combinations.<br>3. All `Ctrl + [A-Z]` keystrokes inside terminal are converted to raw ASCII control bytes (`\x01`–`\x1a`) and forwarded directly to Cmder.<br>4. Browser default shortcuts (reload, close tab, print) are blocked when terminal is focused. | 🟢 Verified & Fixed |
| **BUG-04** | **Header & Footer UI Clutter**<br>Header toolbar was overcrowded (8 grey border boxes crowding out tabs), statusbar had an 11-shortcut wall, and split grid borders were garish neon green. | Ad-hoc button growth without segmented grouping; exhaustive shortcut list displayed in footer instead of modal; uncalibrated accent border opacity. | 1. Grouped header tools into 3 clean segmented pill groups (`[Grid/Broadcast]`, `[Scripts/Vault/Snapshots/Workspaces]`, `[Clear/Guide]`), freeing 200px+ for tabs.<br>2. Replaced 11-shortcut footer wall with an elegant `<kbd>Alt+H</kbd> Shortcuts & Guide` trigger.<br>3. Refined active grid pane focus ring with soft `rgba(46, 204, 113, 0.65)` glow. | 🟢 Verified & Fixed |
| **BUG-05** | **Black Console Screen Open on Launch**<br>Black command prompt window remained open in the background when opening the extension. | Batch file was spawned via cmd.exe without window hiding, and `start /b node server.js` remained attached to the console. | 1. Created `launch_hidden.vbs` running `wscript.exe` with `SW_HIDE (0)`.<br>2. Decoupled Node.js server startup via hidden PowerShell execution.<br>3. Updated `create_shortcut.bat` and refreshed desktop shortcut `Cmder Container.lnk` to target `wscript.exe` with zero visible console window. | 🟢 Verified & Fixed |
| **BUG-06** | **GitHub Account Selection / Credential Dialog Not Showing**<br>Running `git push` or `git pull` with GitHub accounts hangs without showing the modal dialog to select an account or sign in. | 1. Because the backend was decoupled with `SW_HIDE (0)` and `winpty` forces `wShowWindow = SW_HIDE`, Windows Win32 API forces initial GUI windows of child processes to be invisible.<br>2. Git Credential Manager defaults to Avalonia/WPF modal dialogs (`credential.modalPrompt = true`), which get swallowed as invisible windows in the PTY.<br>3. When multiple accounts exist, GCM waits indefinitely on the hidden dialog. | 1. Injected `GCM_MODAL_PROMPT=0` and `GCM_GUI_PROMPT=0` in `server/ptyManager.js` and `server/cmder_init.bat`, forcing GCM to cleanly render interactive text-based account selector menus directly inside the terminal tab.<br>2. Enabled `GIT_TERMINAL_PROMPT=1` so fallback username/password prompts render in-terminal.<br>3. Configured repository credential binding (`credential.https://github.com.username`) for seamless non-interactive auth. | 🟢 Verified & Fixed |

---

## 4. Architectural Keyboard Responsibility Boundary

```
+-------------------------------------------------------------------------+
|                         KEYBOARD EVENT BOUNDARY                         |
+------------------------------------+------------------------------------+
|    ALT + KEY (Extension Engine)    |     CTRL + KEY (Cmder Native)      |
+------------------------------------+------------------------------------+
| Alt + T / N : New Tab in CWD       | Ctrl + Q : ASCII 17 (Stop pager)   |
| Alt + W     : Close Active Tab     | Ctrl + C : ASCII 03 (SIGINT break) |
| Alt + S     : Scripts Store        | Ctrl + R : ASCII 18 (History rev)  |
| Alt + V / P : Secrets Vault        | Ctrl + W : ASCII 23 (Delete word)  |
| Alt + M     : Session Snapshots    | Ctrl + A : ASCII 01 (Line start)   |
| Alt + K     : Clear Screen/Buffer  | Ctrl + E : ASCII 05 (Line end)     |
| Alt + B     : Broadcast Bar        | Ctrl + L : ASCII 12 (Clear screen) |
| Alt + G     : Grid View Toggle     | Ctrl + U : ASCII 21 (Delete line)  |
| Alt + 1..9  : Direct Jump to Tab   | Ctrl + V : Safe Clipboard Paste    |
| Alt + Left  : Move Tab Backward    | Ctrl + D : ASCII 04 (EOF / Exit)   |
| Alt + Right : Move Tab Forward     | Ctrl + Z : ASCII 26 (Suspend/EOF)  |
| Alt + H / F1: Guide & Cheat Sheet  | Ctrl + Shift + I : DevTools        |
+------------------------------------+------------------------------------+
```

---

## 5. Storage Files & Data Integrity

1. **`last_session.json`:** Tracks active open tabs, titles, directory paths, and grid view status for cold-start restore.
2. **`workspaces.json`:** Named collections of tabs saved manually by the developer.
3. **`scripts.json` & `user_scripts/*.bat`:** Automation batch store metadata and executable batch scripts.
4. **`vault.json`:** Password, token, snippet, and note records with masking flags.
5. **`snapshots.json`:** Serialized session snapshots containing historical scrollback, stdout output, timestamps, and project directories.
