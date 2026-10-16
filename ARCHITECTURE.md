# 🏛️ Cmder Multi-Tab Container — System Architecture & Engineering Guide

This document explains the technical architecture, design decisions, data flow, and thought process behind building this application. It is written as a reference guide for software engineers.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Frontend ["Frontend (Browser / Desktop Window)"]
        UI["UI Layer (index.html + style.css)"]
        Main["main.js (Coordinator)"]
        TabMgr["tabManager.js (Tab Lifecycle)"]
        XTerm["terminal.js (xterm.js + FitAddon)"]
        Shortcuts["shortcuts.js (Alt+Key Dispatcher)"]
        Session["session.js (Auto-Cache & State)"]
        Broadcast["broadcast.js (Multi-Tab Exec)"]
        Grid["grid.js (Dynamic Layouts)"]
        
        UI --> Main
        Main --> TabMgr
        Main --> Shortcuts
        Main --> Session
        TabMgr --> XTerm
        Main --> Broadcast
        Main --> Grid
    end

    subgraph Transport ["Full-Duplex Communication"]
        WS["WebSocket Channel (ws://localhost:5321)"]
        HTTP["HTTP API (/api/info, /api/last-session)"]
    end

    subgraph Backend ["Backend Runtime (Node.js)"]
        Server["server.js (HTTP + WS Entry)"]
        Routes["routes.js (Static & REST Endpoints)"]
        PtyMgr["ptyManager.js (PTY Process Registry)"]
        Detector["cmderDetector.js (Path Discovery)"]

        Server --> Routes
        Server --> PtyMgr
        Server --> Detector
    end

    subgraph OS ["Operating System Shells"]
        PTY1["node-pty (Process 1: cmd.exe + init.bat)"]
        PTY2["node-pty (Process 2: cmd.exe + init.bat)"]
        PTY10["node-pty (Process N: cmd.exe + init.bat)"]
    end

    Main <-->|WS Keystrokes & Resizes| WS
    Session <-->|HTTP REST State| HTTP
    WS <--> Server
    HTTP <--> Routes
    PtyMgr -->|Spawn / Write / Kill| PTY1
    PtyMgr -->|Spawn / Write / Kill| PTY2
    PtyMgr -->|Spawn / Write / Kill| PTY10
```

---

## 2. End-to-End Data Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Frontend (xterm.js)
    participant WS as WebSocket Channel
    participant Backend as Node.js (ptyManager)
    participant Shell as Cmder (cmd.exe + init.bat)

    Note over User,Shell: Step 1: Creating a Tab
    User->>Browser: Presses Alt + T or clicks '+'
    Browser->>Browser: Creates DOM Tab & xterm.js instance
    Browser->>WS: Sends { type: "create", tabId, cwd }
    WS->>Backend: ptyManager.createTerminal(tabId, cwd)
    Backend->>Shell: Spawns cmd.exe /k vendor\init.bat (in cwd)
    Shell-->>Backend: Prompt emitted: "λ"
    Backend-->>WS: Sends { type: "data", tabId, data: "λ" }
    WS-->>Browser: term.write("λ")
    Browser-->>User: Renders green Cmder prompt on screen

    Note over User,Shell: Step 2: Typing Keystrokes
    User->>Browser: Types "git status [Enter]"
    Browser->>WS: Sends { type: "data", tabId, data: "git status\r" }
    WS->>Backend: pty.write("git status\r")
    Backend->>Shell: Executes in child process
    Shell-->>Backend: Output stream (ANSI colored text)
    Backend-->>WS: Sends { type: "data", tabId, data: "..." }
    WS-->>Browser: term.write("...")
    Browser-->>User: Terminal displays colored git output

    Note over User,Shell: Step 3: Broadcast (Inter-Tab Execution)
    User->>Browser: Presses Alt + B -> Enters "git pull"
    Browser->>WS: Sends { type: "broadcast", command: "git pull" }
    WS->>Backend: ptyManager.broadcast("git pull")
    par Broadcast to Tab 1
        Backend->>Shell: Writes "git pull\r" to Tab 1
    and Broadcast to Tab 2
        Backend->>Shell: Writes "git pull\r" to Tab 2
    and Broadcast to Tab 10
        Backend->>Shell: Writes "git pull\r" to Tab 10
    end
```

---

## 3. Technology Stack & Design Decisions (Why We Chose Each)

| Technology | What it is | Why we chose it (Engineering Rationale) |
| :--- | :--- | :--- |
| **Node.js** | Backend runtime | Lightweight, event-driven, handles thousands of concurrent I/O streams with low memory footprint. |
| **`node-pty`** | Pseudoterminal fork for Node | Native terminals in Windows require a real pseudo-console (`ConPTY` or `winpty`). Standard `child_process.spawn` cannot handle interactive programs like `vi`, `top`, or escape sequences. `node-pty` provides true PTY emulation. |
| **`xterm.js`** | Terminal UI engine | Industry standard (powers VS Code). Renders ANSI escape codes, colors, cursor movements, and UTF-8 characters at 60 FPS using canvas/DOM. |
| **Vanilla ES6 Modules** | Frontend structure | **Zero build steps.** No Webpack, Vite, or Babel required. Browsers natively import ES modules (`import`/`export`). Clean, instantaneous startup with zero bundle overhead. |
| **Vanilla CSS Grid** | Layout engine | Allows switching between single-window tab view and 2x2, 2x3, or 3x3 split screens with a single CSS class change. |
| **WebSockets (`ws`)** | Real-time transport | Terminal input/output is a continuous bidirectional character stream. WebSockets offer sub-millisecond latency without HTTP polling overhead. |
| **Stand-alone App Mode (`--app=`)** | Window launcher | Instead of packaging a 200MB Electron binary that takes minutes to compile, Windows Edge/Chrome has a built-in `--app=URL` mode. It launches a borderless, native desktop window with no browser address bar and instant startup. |

---

## 4. Software Engineering Insights: How We Solved Core Problems

### Problem 1: The Overengineering Trap
* **The temptation:** Use Electron + React + Redux + TypeScript + Webpack + Tailwind.
* **The problem with that:** 500MB `node_modules`, native build tools required (Python, MSVC C++ compiler which wasn't on the machine), slow build pipelines.
* **Our solution:** Clean **Vanilla ES6 modular architecture** with Node.js and standard CSS. Fast, zero compiler dependencies, instant to run.

### Problem 2: Browser Shortcut Collisions (`Ctrl+T` vs `Alt+T`)
* **The challenge:** Browsers like Chrome hard-code `Ctrl+T` to open a browser tab and `Ctrl+W` to close the browser. JavaScript `event.preventDefault()` cannot override them in standard tabs.
* **The architectural solution:** We implemented a unified **`Alt + Key` shortcut matrix** (`Alt+T`, `Alt+W`, `Alt+Arrows`, `Alt+1..9`). Browsers never intercept `Alt` keys for tabs, giving 100% reliable shortcut behavior anywhere.

### Problem 3: Multi-Project Path Preservation (Zero-Loss Caching)
* **The challenge:** Terminal processes die when closed; developers lose track of their working directories across 10 different repos.
* **The architectural solution:** A two-tier persistence layer:
  1. **In-Memory State (`state.js`):** Tracks each tab's active directory (`cwd`) and title.
  2. **Debounced Persistence (`session.js`):** Real-time auto-saves to both browser `localStorage` and `last_session.json` on disk. When reopening the container, it reads the file and spawns the exact tabs right back into their folders.

### Problem 4: True Process Isolation
* **The challenge:** If one tab runs a long command (e.g. `npm install`), other tabs must not lag or freeze.
* **The architectural solution:** Each tab has an independent operating system process spawned by `node-pty`. Node's asynchronous event loop streams each PTY's stdout independently over WebSockets.

---

## 5. Real-World Use Cases

1. **Microservices / Full-Stack Development:**
   * Tab 1: Frontend (`/client` - `npm run dev`)
   * Tab 2: Backend API (`/server` - `go run main.go`)
   * Tab 3: Docker Containers (`docker compose up`)
   * Tab 4: Database Shell (`redis-cli` or `psql`)
   * *Switch between all of them in 1 millisecond using `Alt+1..4`.*

2. **Multi-Repository Git Operations (Broadcast Mode):**
   * Working across 5 microservices that all need updating.
   * Press `Alt + B` -> type `git pull origin main` -> Enter.
   * All 5 tabs pull and update at the same time.

3. **Comparison & Debugging (Grid Mode):**
   * Press `Alt + G` to split into a 2x2 grid.
   * Watch client logs on the left and server logs on the right side-by-side.
