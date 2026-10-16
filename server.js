const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

// Modular Server Components
const { findCmder } = require('./server/cmderDetector');
const { PtyManager } = require('./server/ptyManager');
const { handleHttpRequest } = require('./server/routes');

const PORT = 5321;
const WORKSPACES_FILE = path.join(__dirname, 'workspaces.json');
const LAST_SESSION_FILE = path.join(__dirname, 'last_session.json');

// 1. Detect Cmder Environment
const cmderInfo = findCmder();
console.log('Cmder Detection:', cmderInfo ? `Found at ${cmderInfo.root}` : 'Not found, using cmd.exe');

// 2. Initialize PTY Manager
const ptyManager = new PtyManager(cmderInfo);

// 3. Create HTTP Server
const server = http.createServer((req, res) => {
  handleHttpRequest(req, res, {
    cmderInfo,
    rootDir: __dirname,
    workspacesFile: WORKSPACES_FILE,
    lastSessionFile: LAST_SESSION_FILE,
    port: PORT
  });
});

// 4. WebSocket Server for Terminal Streaming
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'create': {
          const actualCwd = ptyManager.createTerminal(
            msg.tabId,
            msg.cwd,
            msg.cols,
            msg.rows,
            (data) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'data', tabId: msg.tabId, data }));
              }
            },
            (exitCode) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'exit', tabId: msg.tabId, exitCode }));
              }
            }
          );
          ws.send(JSON.stringify({ type: 'created', tabId: msg.tabId, cwd: actualCwd }));
          break;
        }

        case 'data':
          ptyManager.write(msg.tabId, msg.data);
          break;

        case 'resize':
          ptyManager.resize(msg.tabId, msg.cols, msg.rows);
          break;

        case 'broadcast':
          ptyManager.broadcast(msg.command, msg.tabIds);
          break;

        case 'close':
          ptyManager.close(msg.tabId);
          break;
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Cmder Container Server running at http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
