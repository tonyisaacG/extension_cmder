# 📋 Product Requirements Document (PRD) — Cmder Multi-Tab Container

**Document Version:** 2.0.0  
**Author:** Senior Principal Engineer & Product Owner  
**Target Audience:** Engineering, Product Management, DevOps, System Administrators  
**Status:** Approved & Implemented  

---

## 1. Executive Summary & Vision

The **Cmder Multi-Tab Container** is an enterprise-grade, developer-first terminal workspace platform for Windows. It bridges the gap between the power of Windows console tools (Cmder, Clink, ConEmu, Git Bash) and the flexibility of modern web-based developer environments. 

Rather than running isolated, transient console windows that lose context upon closing, Cmder Container provides a persistent, multi-tabbed, split-grid terminal operating environment. It features zero-loss session persistence, an integrated script and batch execution store (`run_c`), an instantaneous secrets/credentials vault (`pass_c` / `val_c`), and multi-terminal command broadcasting.

### Vision Statement
> *"To provide software engineers and DevOps professionals on Windows with a unified, resilient, zero-friction command center that eliminates repetitive setup, protects against state loss, and streamlines multi-service orchestration."*

---

## 2. Problem Statement & User Personas

### 2.1 The Core Problem
Windows developers managing microservices, cloud deployments, and multi-repo architectures face several daily friction points:
1. **Window Sprawl & Context Switching:** Developers end up with 10+ open command windows scattered across taskbars with no semantic organization or split views.
2. **State Loss on Reboot:** Closing windows or restarting Windows loses active directory paths, named services, and shell history.
3. **Repeated Credential Lookup:** Developers frequently connect to remote servers or APIs, requiring them to repeatedly open password managers, search for keys, copy them, and paste them into shells.
4. **Scattered Scripts & Automation:** Reusable deployment or SSH scripts live in arbitrary folders without a unified discoverability or execution mechanism.
5. **Lack of Simultaneous Orchestration:** Running commands across multiple projects (e.g., `git pull`, `npm test`, `docker compose down`) requires clicking into every single terminal window individually.

### 2.2 User Personas
* **Persona A: Full-Stack Engineer ("Alex"):** Runs frontend, backend API, database, and Redis simultaneously. Needs isolated tabs that inherit paths cleanly and survive browser restarts.
* **Persona B: DevOps / Cloud Engineer ("Jordan"):** Manages multiple remote servers via SSH, Kubernetes clusters, and deployment environments. Needs quick credential lookup and parallel command execution across multiple environments.
* **Persona C: Systems Administrator ("Sam"):** Executes predefined batch scripts and maintenance routines across systems. Demands fast terminal shortcut keys that do not conflict with operating system or browser shortcuts.

---

## 3. Product Features & Functional Requirements (FR)

| Feature ID | Feature Name | Description | Key Shortcuts / Triggers |
| :--- | :--- | :--- | :--- |
| **FR-01** | Multi-Tab Management & CWD Inheritance | Create, close, switch, and rename terminal tabs. New tabs inherit active tab's directory. | `Alt+T`, `Alt+W`, `Alt+←/→`, `Alt+1..9` |
| **FR-02** | Project Folder Browser | Native Windows folder browser dialog to open tabs in designated paths. | Header `📁` Button, `/api/browse-folder` |
| **FR-03** | Scripts & Batch Store (`run_c`) | Centralized repository for automation batches with predictive search & CLI execution. | `Alt+S`, CLI `run_c <name>` |
| **FR-04** | Secrets & Notes Vault (`pass_c` / `val_c`) | Abbreviation-driven credentials vault with 1-click terminal paste & clipboard sync. | `Alt+V`, `Alt+P`, CLI `pass_c <key>` |
| **FR-05** | Multi-Tab Command Broadcasting | Broadcast single CLI command simultaneously across all or selected tabs. | `Alt+B`, Header `⚡ Broadcast` |
| **FR-06** | Dynamic CSS Grid Layouts | Switch between focused single-tab and split multi-pane views (2x2, 3x3). | `Alt+G`, Header `⊞ Grid` |
| **FR-07** | Dual-Layer Session Persistence | Real-time debounced auto-save of open tabs, paths, and layouts across restarts. | Auto (Debounced 400ms) |
| **FR-08** | Heartbeat & Socket Auto-Reattach | 20s ping/pong keep-alive preventing idle freezes and reconnecting active shells. | Automated WebSocket Engine |
| **FR-09** | Cmder & Clink Shell Integration | Native detection of Cmder environment, custom prompt (`λ`), aliases, and tab completion. | `bin/run_c.lua`, `vendor/init.bat` |
| **FR-10** | Native Desktop Window & Shortcut | Launch as a borderless, dedicated desktop app using Chrome/Edge application mode. | `custome_cmder.bat`, `create_shortcut.bat` |
| **FR-11** | Session Snapshots & Buffer Re-execution | Capture full scrollback buffer, command history & output; restore to continue live. | `Alt+M`, `Alt+K`, Header `📸 Snapshots` |
| **FR-12** | Git & Credential Manager Interactive Engine | Visible GitHub account selection & credentials prompt directly in terminal without hidden modal suppression. | Terminal PTY Environment (`GCM_GUI_PROMPT=0`) |

---

## 4. Detailed Feature Specifications

### 4.1 FR-01: Multi-Tab Terminal Engine
* **Requirement:** Users can create an unlimited number of isolated console tabs.
* **Working Directory Inheritance:** When creating a new tab via `Alt + T` or the `+` button, the new tab MUST automatically initialize with the working directory (`cwd`) of the currently active tab.
* **Tab Renaming:** Double-clicking any tab header allows inline renaming (e.g., renaming "cmd" to "Frontend Server").
* **Keyboard Navigation:** Users can traverse tabs sequentially using `Alt + Left` / `Alt + Right` or jump directly using `Alt + 1` through `Alt + 9`.

### 4.2 FR-02: Native Project Folder Browser
* **Requirement:** A dedicated folder picker button (`📁`) allows developers to browse their local filesystem.
* **Mechanism:** Invokes a native Windows folder dialog via PowerShell `System.Windows.Forms.FolderBrowserDialog`.
* **Behavior:** Selecting a folder immediately creates a new tab configured with that folder as its root working directory.

### 4.3 FR-03: Custom Scripts & Batch Store (`run_c`)
* **Requirement:** A centralized repository for reusable commands, SSH sessions, credentials, and deployment batches.
* **UI Interface (`Alt + S`):**
  * Real-time search with fuzzy matching.
  * Suggestion engine: Typing in the search bar matches existing scripts. Pressing `Enter` runs the top-ranked match immediately.
  * Inline Script Editor: Full CRUD support (Create, Read, Update, Delete) with fields for Name, Category, Description, and Batch Content.
  * Execution Actions: 1-click execution in the currently active tab or in a fresh tab.
* **CLI Interface (`bin/run_c.bat`):**
  * Callable from any directory in any tab.
  * `run_c` with no arguments lists all available scripts with descriptions.
  * `run_c <script_name>` executes the script, passing any additional CLI arguments directly into the batch process.
* **Clink Tab-Completion:**
  * Typing `run_c ` followed by `Tab` auto-completes script names dynamically.

### 4.4 FR-04: Secrets & Notes Vault (`pass_c` / `val_c`)
* **Requirement:** Fast, safe credential and snippet store designed to eliminate context switching when entering passwords or tokens in terminals.
* **UI Interface (`Alt + V` / `Alt + P`):**
  * Instant Quick-Palette modal.
  * Search by key abbreviation (e.g., `db`, `ssh_prod`, `109`).
  * **Direct Tab Paste:** Pressing `Enter` on a matched item pastes the value directly into the active terminal prompt without requiring manual copy-pasting.
  * **1-Click Copy:** Dedicated copy button with toast confirmation.
  * **Sensitive Masking:** Toggleable password masking (`••••••`) with eye icon (👁) to prevent shoulder surfing.
  * Item Types: Support for Passwords, API Tokens, Quick Notes, and Command Snippets.
* **CLI Interface (`bin/pass_c.bat` / `bin/val_c.bat`):**
  * Injected into the shell's PATH.
  * `pass_c <key>` copies the secret directly into the Windows system clipboard using `clip.exe`.
  * `pass_c show <key>` prints the secret directly in the console.
  * `pass_c` lists all stored keys and metadata.
  * Clink auto-completion: `pass_c ` + `Tab` completes keys.

### 4.5 FR-05: Multi-Tab Command Broadcasting
* **Requirement:** Enable simultaneous execution of administrative or maintenance commands across multiple terminals.
* **UI Interface (`Alt + B`):**
  * Floating command bar overlay with command input field.
  * Target selection: Checkbox selector allows choosing "All Tabs" or specific target tab subsets.
  * Execution: Writes command + carriage return (`\r`) to all targeted PTY processes concurrently.

### 4.6 FR-06: Dynamic CSS Grid Layouts
* **Requirement:** Support side-by-side terminal monitoring without leaving the application.
* **Modes:**
  * Single View: Active tab takes 100% of viewport width and height.
  * Grid View: Dynamic CSS Grid engine automatically splits viewport based on open tab count (e.g., 2 tabs = 1x2 split; 4 tabs = 2x2 grid; 9 tabs = 3x3 matrix).
* **Resize Resiliency:** Automatically recalculates `xterm.js` dimensions (`fitAddon.fit()`) and sends updated `cols` and `rows` to all backend PTY processes.

### 4.7 FR-07: Dual-Layer Session Persistence
* **Requirement:** Ensure complete recovery of developer workspace state after browser reloads or host machine reboots.
* **Strategy:**
  * **Layer 1 (Client):** Synchronous `localStorage` cache for sub-second hydration on page reload.
  * **Layer 2 (Server Disk):** Asynchronous debounced write to `last_session.json` via `/api/last-session` ensuring survivability across different browsers or cleared cookies.
* **State Tracked:** Tab IDs, custom titles, working directories (`cwd`), active tab index, and grid view status.

### 4.8 FR-08: Heartbeat & Socket Auto-Reattach
* **Requirement:** Eliminate terminal freeze when a session remains idle or when the computer wakes from sleep.
* **Mechanism:**
  * Bidirectional 20-second ping/pong heartbeat interval between client and server.
  * Automatic reconnection logic with exponential backoff on connection drop.
  * `attach` message protocol: On reconnection, client rebinds existing running terminal sessions without killing or recreating OS processes.

### 4.9 FR-11: Session Snapshots, Buffer Serialization & Re-execution
* **Requirement:** Enable developers to take instant snapshots of command runs, outputs, and results, then restore and continue working from that exact state later.
* **Scrollback Buffer Extraction:** Serializes complete terminal buffer lines (stdout, ANSI colored results, errors) directly from `xterm.js`.
* **Continuable Restoration:** Restoring a snapshot creates a new tab with historical logs printed, attached to a live Cmder PTY in the same `cwd`.
* **Iterative Overwrites (`updatedAt`):** Allows updating an existing snapshot with subsequent command executions (e.g., Day 2 server tasks) without creating duplicate cards.
* **Markdown Document Export (`.md`):** Formats session history into clean GitHub-flavored Markdown with metadata and fenced `bash` code blocks.
* **Retina Image Export (`.png`):** Generates high-res 2x retina window cards using pure client-side HTML5 Canvas.
* **1-Click Log Export:** Copies entire historical session output to system clipboard.
* **Quick Session Hygiene:**
  * Clear Terminal (`Alt + K`): Wipes screen display and scrollback.
  * Reset Shell: Kills and respawns a clean shell process in the same working directory without destroying the tab.

### 4.10 FR-12: Git & Credential Manager Terminal Interactive Engine
* **Requirement:** Ensure seamless Git operations (`git push`, `git pull`, `git clone`, `git fetch`) without silent terminal hangs or missing authentication dialogs.
* **Mechanism:**
  * Injects `GCM_MODAL_PROMPT=0` and `GCM_GUI_PROMPT=0` into `ptyManager.js` and `cmder_init.bat`.
  * Redirects Git Credential Manager (GCM) from hidden Win32/WPF modal popups (which are suppressed by `SW_HIDE` in background/winpty processes) into clean, visible terminal choice menus.
  * Injects `GIT_TERMINAL_PROMPT=1` ensuring standard Git authentication queries fallback cleanly to the active terminal tab.
  * Supports repository-level username binding (`git config credential.https://github.com.username <username>`) for zero-prompt instant authentication.

---

## 5. Non-Functional Requirements (NFR)

* **NFR-01: Performance & Frame Rate:** Terminal rendering must sustain 60 FPS under continuous stdout streaming. Keystroke latency must be under 15ms.
* **NFR-02: Zero-Build Architecture:** Frontend must run directly as native ES6 modules without requiring Node compile steps (Webpack, Vite, Rollup).
* **NFR-03: Keyboard Ergonomics:** Default application shortcuts MUST use `Alt` modifier keys to guarantee zero collision with native Chrome/Edge browser navigation shortcuts (`Ctrl+T`, `Ctrl+W`, `Ctrl+N`).
* **NFR-04: Resilience & Fault Tolerance:** If an underlying shell process terminates (e.g. user types `exit`), the frontend tab must handle it gracefully with visual notification without crashing the container.
* **NFR-05: Local Security:** Secrets stored in `vault.json` are kept strictly on the local machine and never transmitted externally.

---

## 6. Success Metrics & KPIs

1. **Setup Time Reduction:** Time required to restore a multi-service development environment drops from ~5 minutes to < 3 seconds.
2. **Context Switching Elimination:** > 80% reduction in time spent hunting for server passwords and SSH keys via the `pass_c` CLI and Vault Quick-Palette.
3. **Session Continuity:** 100% session recovery rate across intentional reboots and unexpected browser tab refreshes.
