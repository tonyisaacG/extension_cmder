const fs = require('fs');
const pty = require('node-pty');

/**
 * Manages active pseudo-terminal (node-pty) processes
 */
class PtyManager {
  constructor(cmderInfo) {
    this.cmderInfo = cmderInfo;
    this.terminals = new Map(); // tabId -> { pty, cwd }
  }

  createTerminal(tabId, cwd, cols, rows, onData, onExit) {
    const targetCwd = (cwd && fs.existsSync(cwd)) ? cwd : process.cwd();
    const shell = 'cmd.exe';
    const args = this.cmderInfo ? ['/k', this.cmderInfo.initBat] : [];

    const env = Object.assign({}, process.env, {
      CMDER_ROOT: this.cmderInfo ? this.cmderInfo.root : '',
      PROMPT: '$P$G'
    });

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: targetCwd,
      env: env,
      useConpty: false
    });

    this.terminals.set(tabId, { pty: ptyProcess, cwd: targetCwd });

    ptyProcess.onData((data) => {
      onData(data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.terminals.delete(tabId);
      onExit(exitCode);
    });

    return targetCwd;
  }

  write(tabId, data) {
    const term = this.terminals.get(tabId);
    if (term) {
      term.pty.write(data);
    }
  }

  resize(tabId, cols, rows) {
    const term = this.terminals.get(tabId);
    if (term && cols > 0 && rows > 0) {
      try {
        term.pty.resize(cols, rows);
      } catch (_) {}
    }
  }

  broadcast(command, targetTabIds) {
    const targets = Array.isArray(targetTabIds) && targetTabIds.length > 0
      ? targetTabIds
      : Array.from(this.terminals.keys());

    targets.forEach(id => {
      const term = this.terminals.get(id);
      if (term) {
        term.pty.write(command + '\r');
      }
    });
  }

  close(tabId) {
    const term = this.terminals.get(tabId);
    if (term) {
      try {
        term.pty.kill();
      } catch (_) {}
      this.terminals.delete(tabId);
    }
  }
}

module.exports = { PtyManager };
