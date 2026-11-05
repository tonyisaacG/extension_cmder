# 📚 Cmder Multi-Tab Container — Product & Technical Documentation Suite

Welcome to the comprehensive product and engineering documentation for the **Cmder Multi-Tab Container**. This suite serves as both an **Executive Product Requirements Document (PRD)** for Product Owners and a **Deep Technical Reference** for Senior Software Engineers and Architects.

---

## 📑 Suite Navigation

### 🎯 Part I: Product Strategy & Requirements
* [**00. Product Requirements Document (PRD)**](./00_PRODUCT_REQUIREMENTS_DOCUMENT.md)
  * Executive Summary, Product Vision & Core Problem Statement.
  * User Personas (Full-stack developer, DevOps engineer, Sysadmin).
  * Comprehensive Feature Catalog (FR-01 through FR-11).
  * Non-Functional Requirements (NFRs) & Business Success Metrics (KPIs).

* [**📊 Master Feature, Bug & Requirements Tracker**](./FEATURE_AND_BUG_TRACKER.md)
  * Complete Single Source of Truth (SSOT) tracking all 11 features and implementation files.
  * Bug registry & resolution log with root cause analysis.
  * Strict keyboard shortcut responsibility boundary (Cmder Ctrl vs Extension Alt).
  * Data persistence schema and storage files reference.

---

### 🏛️ Part II: Core Architecture & Systems Engineering
* [**01. Architecture Overview**](./01_ARCHITECTURE_OVERVIEW.md)
  * High-level architectural pattern (The PTY Broker Pattern).
  * Client Layer, Transport Layer, Broker Layer, and Windows OS Shells.
  * End-to-end data flow sequence diagram.

* [**02. Backend Deep Dive**](./02_BACKEND_DEEP_DIVE.md)
  * Why standard Node `child_process.spawn` fails for interactive terminals.
  * Native Windows ConPTY / winpty integration with `node-pty`.
  * The `PtyManager` lifecycle (spawn, write, resize, broadcast, close).
  * WebSocket JSON frame protocol specification.

* [**03. Frontend Engineering**](./03_FRONTEND_ENGINEERING.md)
  * Zero-Build Vanilla ES6 module architecture.
  * Centralized reactive state management (`public/js/state.js`).
  * `xterm.js` canvas engine and `FitAddon` dynamic container lifecycle.

---

### ⚡ Part III: Feature Deep Dives & Operational Specs
* [**04. Event Bubbling, Keyboard Interception & Debouncing**](./04_EVENT_BUBBLING_AND_KEYBOARD.md)
  * Fixing tab duplication and key event bubbling issues.
  * DOM Event Bubbling vs `xterm.attachCustomKeyEventHandler`.
  * Why `Alt + Key` bypasses browser-reserved shortcuts.
  * Clipboard anti-flood and non-destructive `Ctrl+C` / `Ctrl+V` engineering.

* [**05. Persistence & State Recovery**](./05_PERSISTENCE_AND_STATE.md)
  * Continuous zero-loss session persistence architecture.
  * Dual-layer storage strategy (`localStorage` + `last_session.json`).
  * Session snapshot schema and cold-start hydration algorithm.

* [**06. Custom Scripts & Batch Store (`run_c`)**](./06_SCRIPTS_AND_BATCH_STORE.md)
  * Dual-sync file model: `scripts.json` metadata + `user_scripts/*.bat`.
  * REST API endpoints (`GET`, `POST`, `DELETE /api/scripts`).
  * Global PATH CLI executor (`bin/run_c.bat`) with argument forwarding.
  * Cmder Clink Lua tab-completion integration (`bin/run_c.lua`).
  * In-app predictive search modal (`Alt + S`).

* [**07. Secrets & Notes Vault (`pass_c` / `val_c`)**](./07_SECRETS_AND_VAULT_ENGINE.md)
  * Fast abbreviation-driven credential lookup engine.
  * Zero-click in-terminal paste (`Alt + V` -> Abbreviation -> Enter).
  * Windows system clipboard synchronization via `clip.exe`.
  * Clink auto-completion for secret keys.
  * Security masking model (`••••••`) and local file storage (`vault.json`).

* [**08. Workspaces, Broadcast & Grid Layout Engines**](./08_WORKSPACES_AND_BROADCAST_ENGINE.md)
  * Full-duplex WebSocket command broadcast across multiple terminals (`Alt + B`).
  * Dynamic CSS Grid matrix calculation (1x1, 2x2, 2x3, 3x3 layouts via `Alt + G`).
  * Named workspace profiles (`workspaces.json`) and REST endpoints.

* [**09. Reliability, Heartbeat & Desktop App Integration**](./09_RELIABILITY_HEARTBEAT_AND_DESKTOP_INTEGRATION.md)
  * Automated 20-second ping/pong heartbeat solving idle freeze and laptop sleep drops.
  * Reconnection and process re-attach protocol (`type: "attach"`).
  * Desktop standalone app mode launcher (`custome_cmder.bat`) with Chrome/Edge `--app`.
  * Desktop shortcut generator (`create_shortcut.bat`) with WScript.Shell COM object.

* [**10. Session Snapshots, Buffer Serialization & Re-execution**](./10_SESSION_SNAPSHOTS_AND_MEMORY.md)
  * Terminal buffer & scrollback serialization directly from xterm.js canvas engine.
  * Continuable restoration: reopens terminal output with live Cmder PTY session.
  * Iterative session updates (`updatedAt`): update existing snapshots with subsequent runs without duplicates.
  * 1-Click export to Markdown (`.md`) and high-resolution Canvas Image (`.png`).
  * 1-Click complete session log clipboard export.
  * Quick session hygiene: Clear screen (`Alt + K`) and shell process reset.

* [**11. Git Credentials, Multi-Account Authentication & PTY Environment**](./11_GIT_CREDENTIALS_AND_PTY_ENVIRONMENT.md)
  * Problem statement: Git push/pull hanging due to invisible Win32/WPF modal dialogs.
  * Root cause analysis: `SW_HIDE` process inheritance and winpty console buffer isolation.
  * Solution: Injecting `GCM_MODAL_PROMPT=0` and `GCM_GUI_PROMPT=0` forcing clean in-terminal account selection.
  * Terminal fallback: `GIT_TERMINAL_PROMPT=1` and repository username binding.

---

## 🛠️ Technology Stack Summary

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Runtime** | Node.js (v18+), native HTTP server, `ws` (WebSocket) |
| **Terminal Subsystem** | `node-pty` (ConPTY / winpty), Windows `cmd.exe`, Cmder `init.bat` |
| **Frontend Framework** | Zero-Build Vanilla ES6 Modules, HTML5, CSS3 Grid / Flexbox |
| **Terminal Canvas** | `@xterm/xterm` (v5+), `@xterm/addon-fit` |
| **Shell Extensions** | Lua 5.1 (Clink engine for Cmder prompt and tab completion) |
| **OS Automation** | PowerShell, Windows Script Host (WSH COM), Windows `clip.exe` |
