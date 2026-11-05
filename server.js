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
const SCRIPTS_FILE = path.join(__dirname, 'scripts.json');
const SCRIPTS_DIR = path.join(__dirname, 'user_scripts');
const VAULT_FILE = path.join(__dirname, 'vault.json');
const SNAPSHOTS_FILE = path.join(__dirname, 'snapshots.json');

// 1. Detect Cmder Environment
const cmderInfo = findCmder();
console.log('Cmder Detection:', cmderInfo ? `Found at ${cmderInfo.root}` : 'Not found, using cmd.exe');

// 2. Initialize PTY Manager with root directory for bin and scripts
const ptyManager = new PtyManager(cmderInfo, __dirname);

// 3. Create HTTP Server
const server = http.createServer((req, res) => {
  handleHttpRequest(req, res, {
    cmderInfo,
    rootDir: __dirname,
    workspacesFile: WORKSPACES_FILE,
    lastSessionFile: LAST_SESSION_FILE,
    scriptsFile: SCRIPTS_FILE,
    scriptsDir: SCRIPTS_DIR,
    vaultFile: VAULT_FILE,
    snapshotsFile: SNAPSHOTS_FILE,
    port: PORT
  });
});

// 4. WebSocket Server for Terminal Streaming with Heartbeat & Re-attach
const wss = new WebSocketServer({ server });

// Heartbeat ping interval every 20 seconds to prevent idle freeze and timeouts
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating dead client socket');
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
      ws.send(JSON.stringify({ type: 'ping' }));
    } catch (_) {}
  });
}, 20000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'ping':
          ws.isAlive = true;
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'pong':
          ws.isAlive = true;
          break;

        case 'attach': {
          // Re-attach existing browser tabs after WebSocket reconnect
          ws.isAlive = true;
          if (Array.isArray(msg.tabs)) {
            msg.tabs.forEach((t) => {
              const sendData = (data) => {
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'data', tabId: t.tabId, data }));
                }
              };
              const sendExit = (exitCode) => {
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'exit', tabId: t.tabId, exitCode }));
                }
              };

              const attached = ptyManager.attachTerminal(t.tabId, sendData, sendExit);
              if (attached) {
                ws.send(JSON.stringify({ type: 'attached', tabId: t.tabId }));
              } else {
                // If PTY process was lost, recreate it seamlessly in same cwd
                const actualCwd = ptyManager.createTerminal(
                  t.tabId,
                  t.cwd,
                  t.cols || 80,
                  t.rows || 24,
                  sendData,
                  sendExit
                );
                ws.send(JSON.stringify({ type: 'created', tabId: t.tabId, cwd: actualCwd }));
              }
            });
          }
          break;
        }

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

        case 'reset': {
          const tabId = msg.tabId;
          const cwd = msg.cwd;
          const cols = msg.cols || 80;
          const rows = msg.rows || 24;
          ptyManager.close(tabId);
          const actualCwd = ptyManager.createTerminal(
            tabId,
            cwd,
            cols,
            rows,
            (data) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'data', tabId, data }));
              }
            },
            (exitCode) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'exit', tabId, exitCode }));
              }
            }
          );
          ws.send(JSON.stringify({ type: 'created', tabId, cwd: actualCwd }));
          break;
        }

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
