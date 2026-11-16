import { state, sendWs } from './state.js';
import { createTerminalInstance } from './terminal.js';
import { handleAppShortcut } from './shortcuts.js';
import { applyGridLayout } from './grid.js';
import { autoSaveSession } from './session.js';

const tabsListEl = document.getElementById('tabsList');
const terminalViewportEl = document.getElementById('terminalViewport');
const statusActivePath = document.getElementById('statusActivePath');

/**
 * Creates a new tab with an isolated terminal instance.
 * If cwd is omitted, automatically inherits the active tab's current folder!
 */
export function createTab(cwd = '', title = '') {
  state.tabCounter++;
  const tabId = `tab_${Date.now()}_${state.tabCounter}`;
  const tabIndex = state.tabs.size + 1;

  // Inherit active tab's cwd when opening a new tab normally
  const activeTab = state.tabs.get(state.activeTabId);
  const targetCwd = cwd || (activeTab && activeTab.cwd ? activeTab.cwd : state.defaultCwd);

  const folderName = targetCwd ? targetCwd.split(/[\\/]/).filter(Boolean).pop() : 'Root';
  const tabTitle = title || folderName || `Tab ${tabIndex}`;

  // Terminal DOM Container Pane
  const paneEl = document.createElement('div');
  paneEl.className = 'terminal-pane';
  paneEl.id = `pane_${tabId}`;
  terminalViewportEl.appendChild(paneEl);

  // Initialize xterm with custom shortcut interception
  const { term, fitAddon } = createTerminalInstance(paneEl, tabId, (ev) => {
    if (ev.type === 'keydown') {
      const handled = handleAppShortcut(ev, {
        createTab,
        closeTab,
        switchTab,
        navigateTab,
        toggleGrid: () => {},
        activeTabId: state.activeTabId,
        tabs: state.tabs
      });
      if (handled === false) return false;
    }
    return true;
  });

  // Tab Header Button Element
  const tabEl = document.createElement('div');
  tabEl.className = 'tab-item';
  tabEl.id = `tab_btn_${tabId}`;
  tabEl.innerHTML = `
    <span class="tab-badge">${tabIndex}</span>
    <span class="tab-title" title="Double click to rename">${tabTitle}</span>
    <span class="tab-close" title="Close tab">×</span>
  `;

  // Click to switch tab
  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) return;
    switchTab(tabId);
  });

  // Close tab button
  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });

  // Double click title to rename
  setupTabRename(tabEl, tabId, tabTitle);

  tabsListEl.appendChild(tabEl);

  // Store in State
  const tabData = {
    id: tabId,
    title: tabTitle,
    cwd: targetCwd,
    customName: Boolean(title),
    term,
    fitAddon,
    element: paneEl,
    tabEl
  };

  state.tabs.set(tabId, tabData);

  // Request backend to spawn PTY session
  sendWs({
    type: 'create',
    tabId,
    cwd: targetCwd,
    cols: term.cols || 80,
    rows: term.rows || 24
  });

  updateTabBadges();
  switchTab(tabId);
  if (state.isGridMode) applyGridLayout();
  autoSaveSession();

  return tabId;
}

/**
 * Creates a dedicated full-capability Web Browser Tab.
 * Allows embedding documentation, DevDocs, Localhost web apps, and developer portals.
 * Integrates directly into Single Tab view and Split Grid (Alt+G)!
 */
export function createBrowserTab(initialUrl = 'https://devdocs.io', title = 'Browser') {
  state.tabCounter++;
  const tabId = `tab_browser_${Date.now()}_${state.tabCounter}`;
  const tabIndex = state.tabs.size + 1;
  const tabTitle = title || 'Browser';

  // Create pane element
  const paneEl = document.createElement('div');
  paneEl.className = 'terminal-pane browser-tab-pane';
  paneEl.id = `pane_${tabId}`;

  // Build browser controls & iframe
  paneEl.innerHTML = `
    <div class="browser-tab-header">
      <div class="browser-tab-nav-row">
        <button class="browser-tab-btn" data-action="back" title="Back">◀</button>
        <button class="browser-tab-btn" data-action="forward" title="Forward">▶</button>
        <button class="browser-tab-btn" data-action="reload" title="Reload">🔄</button>
        <div class="browser-tab-input-wrapper">
          <input type="text" class="browser-tab-url-input" value="${initialUrl}" placeholder="Enter any URL or search (e.g. google.com, devdocs.io, localhost:3000)..." spellcheck="false" autocomplete="off">
        </div>
        <button class="browser-tab-go-btn" data-action="go">Go</button>
        <button class="browser-tab-popout-btn" data-action="popout" title="Open in External Browser ↗">↗</button>
      </div>
    </div>
    <div class="browser-tab-content">
      <iframe class="browser-tab-iframe" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals" src="/api/proxy?url=${encodeURIComponent(initialUrl)}"></iframe>
    </div>
  `;

  terminalViewportEl.appendChild(paneEl);

  // Tab Item in Header
  const tabEl = document.createElement('div');
  tabEl.className = 'tab-item tab-item-browser';
  tabEl.id = `tab_btn_${tabId}`;
  tabEl.innerHTML = `
    <span class="tab-badge">${tabIndex}</span>
    <span class="tab-title" title="Double click to rename">🌐 ${tabTitle}</span>
    <span class="tab-close" title="Close tab">×</span>
  `;

  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) return;
    switchTab(tabId);
  });

  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });

  setupTabRename(tabEl, tabId, `🌐 ${tabTitle}`);
  tabsListEl.appendChild(tabEl);

  // Wire up navigation controls within this browser pane
  const iframeEl = paneEl.querySelector('.browser-tab-iframe');
  const urlInput = paneEl.querySelector('.browser-tab-url-input');
  const navHistory = [initialUrl];
  let historyIdx = 0;

  const navigateTo = (rawTarget, addToHistory = true) => {
    if (!rawTarget) return;
    let target = rawTarget.trim();
    if (!/^https?:\/\//i.test(target)) {
      if (target.includes(' ') || !target.includes('.')) {
        target = `https://duckduckgo.com/?q=${encodeURIComponent(target)}`;
      } else {
        target = `https://${target}`;
      }
    }

    urlInput.value = target;
    const isLocal = target.includes('localhost') || target.includes('127.0.0.1');
    iframeEl.src = isLocal ? target : `/api/proxy?url=${encodeURIComponent(target)}`;

    if (addToHistory) {
      navHistory.splice(historyIdx + 1);
      navHistory.push(target);
      historyIdx = navHistory.length - 1;
    }
  };

  paneEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'go') {
      navigateTo(urlInput.value, true);
    } else if (action === 'back') {
      if (historyIdx > 0) {
        historyIdx--;
        navigateTo(navHistory[historyIdx], false);
      }
    } else if (action === 'forward') {
      if (historyIdx < navHistory.length - 1) {
        historyIdx++;
        navigateTo(navHistory[historyIdx], false);
      }
    } else if (action === 'reload') {
      navigateTo(urlInput.value, false);
    } else if (action === 'popout') {
      const a = document.createElement('a');
      a.href = urlInput.value || 'https://devdocs.io';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateTo(urlInput.value, true);
    }
  });

  // Store tab data
  const tabData = {
    id: tabId,
    type: 'browser',
    title: tabTitle,
    url: initialUrl,
    element: paneEl,
    tabEl
  };

  state.tabs.set(tabId, tabData);
  updateTabBadges();
  switchTab(tabId);
  if (state.isGridMode) applyGridLayout();
  autoSaveSession();

  return tabId;
}

/**
 * Switch active visible tab
 */
export function switchTab(tabId) {
  if (!state.tabs.has(tabId)) return;
  state.activeTabId = tabId;

  state.tabs.forEach((tab, id) => {
    if (id === tabId) {
      tab.tabEl.classList.add('active');
      tab.element.classList.add('active');
      setTimeout(() => {
        try {
          tab.fitAddon.fit();
          tab.term.focus();
          sendWs({
            type: 'resize',
            tabId,
            cols: tab.term.cols,
            rows: tab.term.rows
          });
        } catch (_) {}
      }, 50);
    } else {
      tab.tabEl.classList.remove('active');
      if (!state.isGridMode) {
        tab.element.classList.remove('active');
      }
    }
  });

  updateStatusBar();
  autoSaveSession();
}

/**
 * Navigate left / right between tabs
 */
export function navigateTab(direction) {
  const tabKeys = Array.from(state.tabs.keys());
  if (tabKeys.length <= 1) return;
  const currentIndex = tabKeys.indexOf(state.activeTabId);
  const nextIndex = (currentIndex + direction + tabKeys.length) % tabKeys.length;
  switchTab(tabKeys[nextIndex]);
}

/**
 * Close a tab
 */
export function closeTab(tabId, fromExit = false) {
  const tab = state.tabs.get(tabId);
  if (!tab) return;

  if (!fromExit && tab.type !== 'browser') {
    sendWs({ type: 'close', tabId });
  }

  try { tab.term.dispose(); } catch (_) {}
  tab.element.remove();
  tab.tabEl.remove();
  state.tabs.delete(tabId);

  // Switch to another tab or open fresh tab if all closed
  if (state.activeTabId === tabId) {
    const remainingKeys = Array.from(state.tabs.keys());
    if (remainingKeys.length > 0) {
      switchTab(remainingKeys[remainingKeys.length - 1]);
    } else {
      createTab(state.defaultCwd, 'Main');
    }
  }

  updateTabBadges();
  if (state.isGridMode) applyGridLayout();
  autoSaveSession();
}

/**
 * Setup inline rename on double-click
 */
function setupTabRename(tabEl, tabId, initialText) {
  const titleSpan = tabEl.querySelector('.tab-title');
  titleSpan.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const currentText = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.width = '90px';
    input.style.fontSize = '12px';
    input.style.background = '#111';
    input.style.color = '#2ecc71';
    input.style.border = '1px solid #2ecc71';
    input.style.borderRadius = '2px';

    const finish = () => {
      const newTitle = input.value.trim() || currentText;
      const tabObj = state.tabs.get(tabId);
      if (tabObj) {
        tabObj.title = newTitle;
        tabObj.customName = true;
      }
      titleSpan.textContent = newTitle;
      if (input.parentNode) input.replaceWith(titleSpan);
      autoSaveSession();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') finish();
      if (ev.key === 'Escape') {
        if (input.parentNode) input.replaceWith(titleSpan);
      }
    });

    titleSpan.replaceWith(input);
    input.focus();
    input.select();
  });
}

export function updateTabBadges() {
  let index = 1;
  state.tabs.forEach((tab) => {
    const badge = tab.tabEl.querySelector('.tab-badge');
    if (badge) badge.textContent = index <= 9 ? index : '+';
    index++;
  });
}

export function updateTabDisplay(tab) {
  const folder = tab.cwd ? tab.cwd.split(/[\\/]/).filter(Boolean).pop() : 'Root';
  const titleSpan = tab.tabEl.querySelector('.tab-title');
  if (titleSpan && !tab.customName) {
    titleSpan.textContent = tab.title || folder;
    titleSpan.title = `${tab.title} (${tab.cwd})`;
  }
}

export function updateStatusBar() {
  const tab = state.tabs.get(state.activeTabId);
  if (tab && statusActivePath) {
    statusActivePath.textContent = `📁 ${tab.cwd || 'Terminal'}`;
  }
}

/**
 * Open folder picker dialog and create a NEW tab in the selected project folder
 */
export async function openInFolder() {
  try {
    const res = await fetch('/api/browse-folder');
    const data = await res.json();
    if (data.folder) {
      createTab(data.folder);
    }
  } catch (e) {
    const manual = prompt('Enter project folder path:');
    if (manual) createTab(manual);
  }
}
