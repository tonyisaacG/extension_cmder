# ⚙️ 02. Backend Deep Dive

## 1. Why Standard `child_process.spawn` Fails for Terminals

A common mistake developers make when building web terminals is using Node's standard `child_process.spawn`:

```js
// ❌ WRONG: Breaks for interactive programs
const { spawn } = require('child_process');
const child = spawn('cmd.exe', [], { stdio: 'pipe' });
```

### Why does this fail?
1. **No TTY / Pseudo-console:** Standard pipes are not teletypes (`isatty()` returns false). Programs like Git, Vim, PowerShell, Clink, or interactive prompts refuse to format ANSI colors or handle arrow navigation over a plain pipe.
2. **Buffer Flushing:** Programs buffer output when stdout is a pipe instead of a console, leading to delayed or frozen prompts.
3. **Window Size Negotiation:** Pipes cannot report terminal columns and rows (`cols` and `rows`), so text wrapping and curses-style screen repaints break completely.

### The Solution: `node-pty`
`node-pty` uses Windows' native **ConPTY** (or **winpty**) subsystem to create a true virtual teletype device:

```js
// ✅ CORRECT: Spawns real virtual console
const pty = require('node-pty');
const ptyProcess = pty.spawn('cmd.exe', ['/k', cmderInitBat], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  cwd: targetCwd,
  env: process.env,
  useConpty: false // Ensures high stability on all Windows builds
});
```

---

## 2. PTY Lifecycle in `server/ptyManager.js`

The `PtyManager` class maintains a registry of active sessions:

```js
class PtyManager {
  constructor(cmderInfo) {
    this.cmderInfo = cmderInfo;
    this.terminals = new Map(); // Map<tabId, { pty, cwd }>
  }
  ...
}
```

### Key Operations:
* **Spawning (`createTerminal`):**
  Spawns `cmd.exe /k "vendor\init.bat"`. It registers `ptyProcess.onData` to stream characters directly to the WebSocket client and `ptyProcess.onExit` to inform the frontend when a process terminates.
* **Input Injection (`write`):**
  Takes raw keystrokes (including special keys like `\r`, `\x03` for Ctrl+C, arrow sequences `\x1b[A`) and writes them directly into the pty's standard input stream.
* **Resize Synchronization (`resize`):**
  When the browser window resizes, `pty.resize(cols, rows)` updates the OS shell's dimensions so programs like `git diff` format properly.
* **Broadcast Execution (`broadcast`):**
  Iterates through all active PTY instances and injects `command + '\r'`. Each shell executes the command simultaneously in parallel.
* **Termination (`close`):**
  Kills the process using `pty.kill()` and unregisters the session.

---

## 3. WebSocket Protocol Specification

The app uses a lightweight JSON-framed WebSocket protocol over `ws://localhost:5321`:

### Client -> Server Frames:
| Action | Payload Schema | Purpose |
| :--- | :--- | :--- |
| **`create`** | `{ "type": "create", "tabId": string, "cwd": string, "cols": number, "rows": number }` | Request backend to spawn shell in `cwd` |
| **`data`** | `{ "type": "data", "tabId": string, "data": string }` | Send user keystrokes / input to tab |
| **`resize`** | `{ "type": "resize", "tabId": string, "cols": number, "rows": number }` | Notify backend of viewport dimension changes |
| **`broadcast`** | `{ "type": "broadcast", "command": string, "tabIds"?: string[] }` | Run command across all (or selected) tabs |
| **`close`** | `{ "type": "close", "tabId": string }` | Kill the shell process for this tab |

### Server -> Client Frames:
| Action | Payload Schema | Purpose |
| :--- | :--- | :--- |
| **`created`** | `{ "type": "created", "tabId": string, "cwd": string }` | Confirms session spawn with resolved path |
| **`data`** | `{ "type": "data", "tabId": string, "data": string }` | Streams terminal output from shell to UI |
| **`exit`** | `{ "type": "exit", "tabId": string, "exitCode": number }` | Notifies client that process closed |

---

## 4. REST Endpoints in `server/routes.js`

* `GET /api/info` — Returns `{ cmderDetected, cmderRoot, defaultCwd }`.
* `GET /api/browse-folder` — Launches a native Windows folder browser dialog via PowerShell `System.Windows.Forms.FolderBrowserDialog`.
* `GET & POST /api/last-session` — Reads and writes `last_session.json` to persist open tabs.
* `GET & POST /api/workspaces` — Reads and writes named workspace configurations into `workspaces.json`.
* `GET /xterm/*` — Serves vendor CSS and JS directly from `node_modules/@xterm/`.
