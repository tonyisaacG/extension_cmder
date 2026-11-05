# 🗺️ Cmder Multi-Tab Container — Product & Engineering Roadmap

**Document Status:** Fully Implemented (Phases 1–5 Complete)  
**Primary Reference:** [`docs/README.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/README.md) & [`docs/FEATURE_AND_BUG_TRACKER.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/FEATURE_AND_BUG_TRACKER.md)

---

## 1. Project Vision & Architecture Principles

Build a **blazing fast, lightweight, resilient terminal container** for Windows that eliminates repetitive setup, protects against terminal state loss, and streamlines developer workflow:
1. **Zero Bloat / Zero Build Step:** Native ES6 modules on the frontend and standard Node.js on the backend. No Webpack, Vite, or Babel compile overhead.
2. **True Teletype Fidelity:** Native Windows ConPTY integration via `node-pty`. Shells run `cmd.exe /k "vendor\init.bat"` with full Clink, ANSI color, and git support.
3. **Resilience & State Recovery:** Dual-layer persistence (`localStorage` + `last_session.json` + `snapshots.json`) guaranteeing sub-second restoration.
4. **Ergonomic Keyboard Boundary:** Strict separation where **Extension Container** actions use `Alt + Key` and **Cmder Native** actions use `Ctrl + Key`.

---

## 2. Phased Implementation Roadmap

### Phase 1: Core Terminal Container & Broker Layer (Completed)
- [x] Node.js server with native HTTP and `ws` (WebSocket).
- [x] `ptyManager.js`: process registry spawning, writing, and resizing `node-pty` shells.
- [x] Auto-detection of Cmder installation path (`cmderDetector.js`).
- [x] Frontend ES6 modularization (`tabManager.js`, `terminal.js`, `state.js`).
- [x] CWD inheritance on tab creation and native Windows folder browser (`System.Windows.Forms.FolderBrowserDialog`).

### Phase 2: Navigation, Grid & Broadcast (Completed)
- [x] Inter-tab command broadcasting with selective tab targeting (`broadcast.js`).
- [x] Dynamic CSS Grid multi-pane layout engine supporting 1x1, 1x2, 2x2, 2x3, 3x3 views (`grid.js`).
- [x] Named workspace saving and loading (`workspaces.json`).
- [x] Double-click tab renaming and tab counter badges.

### Phase 3: Reliability & Event Hardening (Completed)
- [x] **Bug Fix (Idle Freeze):** 20-second ping/pong heartbeat keep-alive; client `attach` protocol re-binding active running shells across sleep/network drops.
- [x] **Bug Fix (Duplicate Copy/Paste):** Throttled selection change on mouseup; explicit `preventDefault()` and `stopPropagation()` preventing native textarea duplication.
- [x] **Bug Fix (Ctrl Shortcut Collisions):** Separated modifier keys (`Alt` for container, `Ctrl` for Cmder); forwarded all `Ctrl + [A-Z]` keystrokes directly to Cmder as raw control bytes (`\x01`–`\x1a`).

### Phase 4: Automation & Productivity Stores (Completed)
- [x] **Scripts & Custom Batch Store (`run_c`):** Dual sync (`scripts.json` + `user_scripts/*.bat`), global PATH execution, Clink autocomplete (`run_c.lua`), and predictive UI modal (`Alt + S`).
- [x] **Secrets & Notes Vault (`pass_c` / `val_c`):** Abbreviation-driven credentials store, zero-click in-terminal paste (`Alt + V`), CLI clipboard integration via `clip.exe`, and password masking.

### Phase 5: Session Snapshots, Buffer Serialization & Re-execution (Completed)
- [x] Terminal scrollback and stdout buffer extraction directly from `xterm.js` canvas engine.
- [x] REST API (`/api/snapshots`) and disk persistence in `snapshots.json` with iterative updating support (`updatedAt`).
- [x] **"Snapshot Active Tab"** and **"Snapshot All Tabs"** with title and description metadata.
- [x] **"Restore & Continue"**: Re-renders historical output, auto-links tab to parent snapshot ID, and connects to a live Cmder PTY session in that working directory.
- [x] **"Iterative Snapshot Update"**: Continue long remote server commands the next day and update the existing snapshot buffer with 1 click without losing historical logs or creating duplicate cards.
- [x] **"Export to Markdown (`.md`)"**: 1-Click download of session output formatted with Markdown headers, metadata, and fenced code blocks for external documentation and reports.
- [x] **"Export to Image (`.png`)"**: Pure client-side HTML5 Canvas high-resolution (2x retina) window card screenshot export.
- [x] 1-Click complete session log clipboard export.
- [x] Quick Session Hygiene: Clear Screen (`Alt + K`) and Reset Shell Process.

### Phase 6: Git Credential Management & Multi-Account Environment (Completed)
- [x] **Bug Fix (Invisible GCM Modal in PTY):** Prevented Git Credential Manager from spawning invisible WPF/Win32 modal dialogs suppressed by Windows `SW_HIDE` and WinPTY.
- [x] **Interactive In-Terminal Selection:** Injected `GCM_MODAL_PROMPT=0` and `GCM_GUI_PROMPT=0` into `ptyManager.js` and `cmder_init.bat`, forcing interactive account selection menus to render directly inside the active terminal tab.
- [x] **Terminal Fallback Prompting:** Injected `GIT_TERMINAL_PROMPT=1` for standard Git credential queries.
- [x] **Host Username Binding:** Bound repository credentials (`credential.https://github.com.username`) for seamless non-interactive Git operations.

---

## 3. Maintenance & Extension Guidelines

* **Adding New Extension Shortcuts:** Always use `Alt + Key` in [`public/js/shortcuts.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/public/js/shortcuts.js) to avoid colliding with Cmder shell control characters.
* **Adding New REST Endpoints:** Register routes inside [`server/routes.js`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/server/routes.js) and persist metadata in corresponding `.json` files.
* **Adding New CLI Commands:** Place `.bat` wrappers inside `bin/`, register them in `server/ptyManager.js` PATH injection, and create corresponding Clink autocompletions in `bin/run_c.lua`.
