# ⚡ 08. Workspaces, Broadcast & Grid Layout Engines

**Document Version:** 1.0.0  
**Module Reference:** `public/js/broadcast.js`, `public/js/grid.js`, `public/js/session.js`, `server/ptyManager.js`, `server/routes.js`  
**Target:** Senior Engineers & Product Owners  

---

## 1. Multi-Tab Command Broadcasting

### 1.1 The Need
In microservice and multi-repository development, engineers frequently need to apply a command across 4–10 open tabs at once:
* Running `git pull` across all dependent submodules.
* Executing `docker compose restart` or clearing npm caches.
* Checking disk usage or server status across different remote SSH sessions.

### 1.2 Architectural Implementation
* **UI Overlay (`public/js/broadcast.js`):**
  * Toggled via `Alt + B` or the header `⚡ Broadcast` button.
  * Provides a floating command input bar.
  * Renders interactive checkboxes for all currently open tabs (with an "All Tabs" master checkbox).
* **WebSocket Command Protocol:**
  When the user submits the command, the client dispatches a broadcast frame:
  ```json
  {
    "type": "broadcast",
    "command": "git status",
    "tabIds": ["tab_1729000000_1", "tab_1729000000_2"]
  }
  ```
* **Backend Execution (`server/ptyManager.js`):**
  The `PtyManager` validates target tabs and concurrently injects the command string followed by a carriage return (`\r`):
  ```js
  broadcast(command, targetTabIds) {
    const targets = targetTabIds && targetTabIds.length > 0 
      ? targetTabIds 
      : Array.from(this.terminals.keys());

    targets.forEach(tabId => {
      this.write(tabId, command + '\r');
    });
  }
  ```

---

## 2. Dynamic CSS Grid Layout Engine

### 2.1 Single Mode vs. Grid Mode
* **Single Mode (Default):**
  Only the active terminal pane is visible (`display: block; width: 100%; height: 100%`). All other panes receive `display: none`.
* **Grid Mode (`Alt + G`):**
  All open terminal panes are displayed simultaneously in a responsive CSS Grid:
  ```css
  .terminal-viewport.grid-mode {
    display: grid;
    gap: 6px;
    padding: 6px;
  }
  ```

### 2.2 Dynamic Matrix Computation (`public/js/grid.js`)
The grid manager calculates the optimal row/column distribution based on the number of open tabs:

| Tab Count | CSS Grid Template Columns | Layout Description |
| :--- | :--- | :--- |
| **1** | `1fr` | Full Viewport |
| **2** | `repeat(2, 1fr)` | 1 Row, 2 Columns (Side-by-side) |
| **3 - 4** | `repeat(2, 1fr)` | 2 Rows, 2 Columns (2x2 Matrix) |
| **5 - 6** | `repeat(3, 1fr)` | 2 Rows, 3 Columns (2x3 Matrix) |
| **7 - 9** | `repeat(3, 1fr)` | 3 Rows, 3 Columns (3x3 Matrix) |

### 2.3 Terminal Canvas Resizing During Grid Transitions
When switching between Single and Grid modes, or when resizing the browser window:
1. The DOM container's dimensions change.
2. `fitAddon.fit()` recalculates the exact character columns and rows.
3. The client emits a resize frame to the backend:
   ```json
   { "type": "resize", "tabId": "tab_1", "cols": 64, "rows": 18 }
   ```
4. `ptyProcess.resize(cols, rows)` updates the OS terminal buffer, preventing line wrapping artifacts.

---

## 3. Named Workspaces Management

### 3.1 Workspace Architecture
Developers often work across distinct projects (e.g., "E-Commerce App" vs. "DevOps Infrastructure"). The Workspaces feature allows saving and loading named collections of tabs.

### 3.2 Storage & Schema (`workspaces.json`)
```json
{
  "E-Commerce Stack": {
    "tabs": [
      { "title": "Frontend", "cwd": "E:\\Projects\\ecom\\client", "customName": true },
      { "title": "API Gateway", "cwd": "E:\\Projects\\ecom\\server", "customName": true },
      { "title": "DB Container", "cwd": "E:\\Projects\\ecom\\docker", "customName": true }
    ],
    "isGridMode": true
  }
}
```

### 3.3 REST Endpoints
* **`GET /api/workspaces`:** Fetches all saved workspace profiles.
* **`POST /api/workspaces`:** Overwrites or adds a workspace profile.
