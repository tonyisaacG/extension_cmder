/**
 * Cmder Multi-Tab Container — Application Entry Point
 */
import { state, sendWs } from './state.js';
import { createTab, switchTab, closeTab, navigateTab, openInFolder, updateTabDisplay, updateStatusBar } from './tabManager.js';
import { toggleBroadcast, executeBroadcast } from './broadcast.js';
import { toggleGridLayout } from './grid.js';
import { toggleHelpModal } from './helpModal.js';
import { handleAppShortcut } from './shortcuts.js';
import { autoSaveSession, restoreLastSession, saveCurrentWorkspace, loadWorkspacesList } from './session.js';
import { initScriptsManager, toggleScriptsModal } from './scriptsManager.js';
import { initVaultManager, toggleVaultModal } from './vaultManager.js';
import { initSnapshotManager } from './snapshotManager.js';

// DOM Controls
const btnAddTab = document.getElementById('btnAddTab');
const btnOpenFolderTab = document.getElementById('btnOpenFolderTab');
const btnOpenScripts = document.getElementById('btnOpenScripts');
const btnOpenVault = document.getElementById('btnOpenVault');
const btnToggleBroadcast = document.getElementById('btnToggleBroadcast');
const btnToggleGrid = document.getElementById('btnToggleGrid');
const btnOpenHelp = document.getElementById('btnOpenHelp');
const btnCloseHelp = document.getElementById('btnCloseHelp');
const btnGotIt = document.getElementById('btnGotIt');
const btnSendBroadcast = document.getElementById('btnSendBroadcast');
const btnCloseBroadcast = document.getElementById('btnCloseBroadcast');
const broadcastInput = document.getElementById('broadcastInput');
const btnWorkspaces = document.getElementById('btnWorkspaces');
const workspacesMenu = document.getElementById('workspacesMenu');
const btnSaveWorkspace = document.getElementById('btnSaveWorkspace');
const statusCmder = document.getElementById('statusCmder');
const statusConn = document.getElementById('statusConn');

let pingIntervalId = null;
let isInitialConnect = true;

// 1. Initialize WebSocket Connection with Resilient Heartbeat & Re-attach
function initWebSocket() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.ws = new WebSocket(`${protocol}//${window.location.host}`);

  state.ws.onopen = () => {
    console.log('Connected to backend PTY server');
    if (statusConn) {
      statusConn.textContent = 'Online';
      statusConn.classList.remove('disconnected');
    }

    // Keepalive ping every 15 seconds to prevent idle socket drop or freeze
    pingIntervalId = setInterval(() => {
      sendWs({ type: 'ping' });
    }, 15000);

    if (isInitialConnect) {
      isInitialConnect = false;
      fetchAppInfo();
    } else {
      // Reconnected! Re-attach all existing open tabs so they don't freeze
      if (state.tabs.size > 0) {
        console.log(`Re-attaching ${state.tabs.size} tabs to server PTYs...`);
        const tabList = Array.from(state.tabs.values()).map(t => ({
          tabId: t.id,
          cwd: t.cwd,
          cols: t.term ? t.term.cols : 80,
          rows: t.term ? t.term.rows : 24
        }));
        sendWs({ type: 'attach', tabs: tabList });
      }
    }
  };

  state.ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'ping') {
        sendWs({ type: 'pong' });
        return;
      }

      if (msg.type === 'pong') {
        return;
      }

      if (msg.type === 'data') {
        const tab = state.tabs.get(msg.tabId);
        if (tab && tab.term) {
          tab.term.write(msg.data);
        }
      }

      if (msg.type === 'created' || msg.type === 'attached') {
        const tab = state.tabs.get(msg.tabId);
        if (tab) {
          if (msg.cwd) tab.cwd = msg.cwd;
          updateTabDisplay(tab);
          if (tab.id === state.activeTabId) {
            updateStatusBar();
          }
        }
      }

      if (msg.type === 'exit') {
        closeTab(msg.tabId, true);
      }
    } catch (e) {
      console.error('WS Message parsing error:', e);
    }
  };

  state.ws.onclose = () => {
    console.warn('Backend disconnected. Reconnecting in 1.5s...');
    if (statusConn) {
      statusConn.textContent = 'Reconnecting...';
      statusConn.classList.add('disconnected');
    }
    if (pingIntervalId) {
      clearInterval(pingIntervalId);
      pingIntervalId = null;
    }
    setTimeout(initWebSocket, 1500);
  };
}

// 2. Fetch Server Info & Restore Last Session
async function fetchAppInfo() {
  try {
    const res = await fetch('/api/info');
    const data = await res.json();
    state.defaultCwd = data.defaultCwd || '';

    if (data.cmderDetected) {
      statusCmder.textContent = `Cmder Active (${data.cmderRoot})`;
    } else {
      statusCmder.textContent = 'cmd.exe (Cmder not found)';
      statusCmder.style.color = '#f39c12';
    }

    // Automatically restore previous session
    await restoreLastSession(createTab, switchTab, () => toggleGridLayout(switchTab));
    loadWorkspacesList(applyWorkspace);
  } catch (e) {
    console.error('Fetch info error:', e);
    if (state.tabs.size === 0) createTab('', 'Tab 1');
  }
}

function applyWorkspace(tabsToOpen) {
  if (!Array.isArray(tabsToOpen)) return;
  const oldIds = Array.from(state.tabs.keys());
  oldIds.forEach(id => closeTab(id));
  tabsToOpen.forEach((t) => {
    createTab(t.cwd, t.title);
  });
}

// 3. Bind UI Event Listeners
btnAddTab.addEventListener('click', () => createTab());
btnOpenFolderTab.addEventListener('click', openInFolder);
if (btnOpenScripts) btnOpenScripts.addEventListener('click', () => toggleScriptsModal());
if (btnOpenVault) btnOpenVault.addEventListener('click', () => toggleVaultModal());
btnToggleBroadcast.addEventListener('click', toggleBroadcast);
btnToggleGrid.addEventListener('click', () => toggleGridLayout(switchTab));
btnOpenHelp.addEventListener('click', () => toggleHelpModal());
btnCloseHelp.addEventListener('click', () => toggleHelpModal(false));
btnGotIt.addEventListener('click', () => toggleHelpModal(false));
btnCloseBroadcast.addEventListener('click', toggleBroadcast);
btnSendBroadcast.addEventListener('click', executeBroadcast);

broadcastInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') executeBroadcast();
  if (e.key === 'Escape') toggleBroadcast();
});

// Workspaces dropdown
btnWorkspaces.addEventListener('click', (e) => {
  e.stopPropagation();
  workspacesMenu.parentElement.classList.toggle('open');
});

document.addEventListener('click', () => {
  if (workspacesMenu && workspacesMenu.parentElement) {
    workspacesMenu.parentElement.classList.remove('open');
  }
});

btnSaveWorkspace.addEventListener('click', (e) => {
  e.stopPropagation();
  if (workspacesMenu && workspacesMenu.parentElement) {
    workspacesMenu.parentElement.classList.remove('open');
  }
  saveCurrentWorkspace(() => loadWorkspacesList(applyWorkspace));
});

// 4. Global Keyboard Shortcuts Listener
document.addEventListener('keydown', (e) => {
  handleAppShortcut(e, {
    createTab,
    closeTab,
    switchTab,
    navigateTab,
    toggleGrid: () => toggleGridLayout(switchTab),
    activeTabId: state.activeTabId,
    tabs: state.tabs
  });
});

// 5. Window Resize & Exit Handlers
window.addEventListener('resize', () => {
  state.tabs.forEach((tab) => {
    try {
      tab.fitAddon.fit();
    } catch (_) {}
  });
});

window.addEventListener('beforeunload', autoSaveSession);

// Auto-focus active terminal on window focus or viewport click
const terminalViewportEl = document.getElementById('terminalViewport');
if (terminalViewportEl) {
  terminalViewportEl.addEventListener('click', () => {
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  });
}

window.addEventListener('focus', () => {
  const activeTab = state.tabs.get(state.activeTabId);
  if (activeTab && activeTab.term) {
    activeTab.term.focus();
  }
});

// Initialize Components & Bootstrap App
initScriptsManager();
initVaultManager();
initSnapshotManager(createTab, switchTab);
initWebSocket();
