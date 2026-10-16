# 📚 Cmder Multi-Tab Container — Documentation Suite

Welcome to the technical documentation for the **Cmder Multi-Tab Container**. This documentation was written as an educational and technical reference for software engineers.

---

## 📑 Table of Contents

1. [**Architecture Overview**](./01_ARCHITECTURE_OVERVIEW.md)
   * High-level architectural pattern (Client-Server / PTY Broker).
   * Component breakdown (Frontend modules, Backend modules, Transport layer).
   * Mermaid diagrams explaining end-to-end data flow.

2. [**Backend Deep Dive**](./02_BACKEND_DEEP_DIVE.md)
   * What is a Pseudoterminal (PTY) and why standard `child_process.spawn` fails for terminals.
   * How `ptyManager.js` spawns Cmder shells using `vendor\init.bat`.
   * Real-time WebSocket streaming protocol (JSON frame specification).
   * REST endpoints & folder picker integration.

3. [**Frontend Component Architecture**](./03_FRONTEND_ENGINEERING.md)
   * Why we chose Vanilla ES6 Modules (No Webpack / No build steps).
   * Centralized reactive state management (`state.js`).
   * Integrating `xterm.js` and `FitAddon` inside dynamic DOM containers.
   * Multi-layout CSS Grid engine (Single vs 2x2 vs 3x3 views).

4. [**Event Bubbling, Keyboard Interception & Debouncing**](./04_EVENT_BUBBLING_AND_KEYBOARD.md)
   * The bug: Why `Ctrl+T` and `Ctrl+Arrow` duplicated and skipped tabs.
   * DOM Event Bubbling & `xterm.attachCustomKeyEventHandler` vs `document.addEventListener`.
   * Solving the problem with `_handledByApp`, `stopPropagation`, and time throttling.
   * Why we use `Alt + Key` to bypass browser-reserved shortcuts.
   * Clipboard engineering: Auto-copy on select & non-destructive `Ctrl+C`.

5. [**Persistence & State Recovery**](./05_PERSISTENCE_AND_STATE.md)
   * Debounced real-time session caching.
   * Dual-layer persistence (`localStorage` + `last_session.json`).
   * Schema design for session snapshots and workspace profiles.
   * Cold-start hydration and tab restoration algorithm.
