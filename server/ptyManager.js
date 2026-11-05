const fs = require('fs');
const path = require('path');
const pty = require('node-pty');

/**
 * Manages active pseudo-terminal (node-pty) processes
 */
class PtyManager {
  constructor(cmderInfo, rootDir) {
    this.cmderInfo = cmderInfo;
    this.rootDir = rootDir || path.resolve(__dirname, '..');
    this.terminals = new Map(); // tabId -> { pty, cwd, onData, onExit }
    this.setupClinkCompletions();
  }

  /**
   * Installs run_c Tab-autocomplete for Cmder's Clink engine
   */
  setupClinkCompletions() {
    if (this.cmderInfo && this.cmderInfo.root) {
      try {
        const cmderConfigDir = path.join(this.cmderInfo.root, 'config');
        const targetLua = path.join(cmderConfigDir, 'run_c.lua');
        const sourceLua = path.join(this.rootDir, 'bin', 'run_c.lua');
        if (fs.existsSync(sourceLua) && fs.existsSync(cmderConfigDir)) {
          fs.copyFileSync(sourceLua, targetLua);
          console.log(`Installed Clink autocomplete for run_c to: ${targetLua}`);
        }
      } catch (e) {
        console.warn('Could not install Clink autocomplete script:', e.message);
      }
    }
  }

  createTerminal(tabId, cwd, cols, rows, onData, onExit) {
    // If a terminal with this tabId already exists, kill it first
    if (this.terminals.has(tabId)) {
      this.close(tabId);
    }

    const targetCwd = (cwd && fs.existsSync(cwd)) ? cwd : process.cwd();
    const shell = 'cmd.exe';
    const initWrapper = path.join(this.rootDir, 'server', 'cmder_init.bat');
    const args = ['/k', initWrapper];

    // Prepend app's bin/ and user_scripts/ to PATH so run_c is globally available in every tab
    const binDir = path.join(this.rootDir, 'bin');
    const scriptsDir = path.join(this.rootDir, 'user_scripts');
    const existingPath = process.env.PATH || '';
    const newPath = `${binDir};${scriptsDir};${existingPath}`;

    const env = Object.assign({}, process.env, {
      CMDER_ROOT: this.cmderInfo ? this.cmderInfo.root : '',
      CMDER_CONTAINER_DIR: this.rootDir,
      PROMPT: '$P$G',
      PATH: newPath,
      // Force Git Credential Manager & Git to prompt via CLI / Terminal rather than
      // spawning hidden Win32/WPF modal dialogs that get suppressed inside the PTY
      GCM_MODAL_PROMPT: '0',
      GCM_GUI_PROMPT: '0',
      GIT_TERMINAL_PROMPT: '1'
    });

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: targetCwd,
      env: env,
      useConpty: false
    });

    const termRecord = {
      pty: ptyProcess,
      cwd: targetCwd,
      onData,
      onExit
    };

    this.terminals.set(tabId, termRecord);

    ptyProcess.onData((data) => {
      const current = this.terminals.get(tabId);
      if (current && typeof current.onData === 'function') {
        current.onData(data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      const current = this.terminals.get(tabId);
      this.terminals.delete(tabId);
      if (current && typeof current.onExit === 'function') {
        current.onExit(exitCode);
      }
    });

    return targetCwd;
  }

  /**
   * Re-binds streaming callbacks to an existing terminal after a WebSocket reconnect
   */
  attachTerminal(tabId, onData, onExit) {
    const term = this.terminals.get(tabId);
    if (term) {
      term.onData = onData;
      term.onExit = onExit;
      return true;
    }
    return false;
  }

  hasTerminal(tabId) {
    return this.terminals.has(tabId);
  }

  write(tabId, data) {
    const term = this.terminals.get(tabId);
    if (term && term.pty) {
      try {
        term.pty.write(data);
      } catch (err) {
        console.error(`Error writing to PTY [${tabId}]:`, err);
      }
    }
  }

  resize(tabId, cols, rows) {
    const term = this.terminals.get(tabId);
    if (term && term.pty && cols > 0 && rows > 0) {
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
      if (term && term.pty) {
        try {
          term.pty.write(command + '\r');
        } catch (_) {}
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
