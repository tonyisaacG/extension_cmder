/**
 * Cmder Multi-Tab Container — Application Entry Point
 */
import { state } from './state.js';
import { createTab, switchTab, closeTab, navigateTab, openInFolder, updateTabDisplay, updateStatusBar } from './tabManager.js';
import { toggleBroadcast, executeBroadcast } from './broadcast.js';
import { toggleGridLayout } from './grid.js';
import { toggleHelpModal } from './helpModal.js';
import { handleAppShortcut } from './shortcuts.js';
import { autoSaveSession, restoreLastSession, saveCurrentWorkspace, loadWorkspacesList } from './session.js';

// DOM Controls
const btnAddTab = document.getElementById('btnAddTab');
const btnOpenFolderTab = document.getElementById('btnOpenFolderTab');
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

// 1. Initialize WebSocket Connection
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.ws = new WebSocket(`${protocol}//${window.location.host}`);

  state.ws.onopen = () => {
    console.log('Connected to backend PTY server');
    fetchAppInfo();
  };

  state.ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'data') {
        const tab = state.tabs.get(msg.tabId);
        if (tab && tab.term) {
          tab.term.write(msg.data);
        }
      }

      if (msg.type === 'created') {
        const tab = state.tabs.get(msg.tabId);
        if (tab) {
          tab.cwd = msg.cwd;
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
    console.warn('Backend disconnected. Reconnecting in 2s...');
    setTimeout(initWebSocket, 2000);
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

// Bootstrap App
initWebSocket();
