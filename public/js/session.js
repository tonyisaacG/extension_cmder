import { state } from './state.js';

let saveTimeout = null;

/**
 * Auto-saves current tabs, folders, custom names, and layout to disk and localStorage
 */
export function autoSaveSession() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const tabList = [];
    let activeIndex = 0;
    let idx = 0;
    state.tabs.forEach((t, id) => {
      tabList.push({ title: t.title, cwd: t.cwd, customName: !!t.customName });
      if (id === state.activeTabId) activeIndex = idx;
      idx++;
    });

    const sessionData = {
      tabs: tabList,
      activeIndex: activeIndex,
      isGridMode: state.isGridMode
    };

    // Save to localStorage
    try {
      localStorage.setItem('cmder_cached_session', JSON.stringify(sessionData));
    } catch (_) {}

    // Save to server
    try {
      await fetch('/api/last-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
    } catch (_) {}
  }, 400);
}

/**
 * Restores cached tabs from last session
 */
export async function restoreLastSession(createTabFn, switchTabFn, toggleGridFn) {
  let sessionData = null;

  // 1. Try server
  try {
    const res = await fetch('/api/last-session');
    const data = await res.json();
    if (data && Array.isArray(data.tabs) && data.tabs.length > 0) {
      sessionData = data;
    }
  } catch (_) {}

  // 2. Try localStorage fallback
  if (!sessionData) {
    try {
      const local = localStorage.getItem('cmder_cached_session');
      if (local) sessionData = JSON.parse(local);
    } catch (_) {}
  }

  // Restore tabs if found
  if (sessionData && Array.isArray(sessionData.tabs) && sessionData.tabs.length > 0) {
    const createdIds = [];
    for (const t of sessionData.tabs) {
      const tid = createTabFn(t.cwd, t.title);
      if (t.customName) {
        const tabObj = state.tabs.get(tid);
        if (tabObj) tabObj.customName = true;
      }
      createdIds.push(tid);
    }

    const targetIdx = sessionData.activeIndex || 0;
    if (createdIds[targetIdx] && switchTabFn) {
      switchTabFn(createdIds[targetIdx]);
    }

    if (sessionData.isGridMode && toggleGridFn) {
      toggleGridFn();
    }
  } else {
    // Fresh start: create 1 default tab
    createTabFn(state.defaultCwd, 'Project 1');
  }
}

/**
 * Workspace management
 */
export async function saveCurrentWorkspace(loadWorkspacesListFn) {
  const name = prompt('Enter a name for this workspace (e.g. MyProjects):');
  if (!name) return;

  const tabList = [];
  state.tabs.forEach((t) => {
    tabList.push({ title: t.title, cwd: t.cwd });
  });

  try {
    const res = await fetch('/api/workspaces');
    const existing = await res.json();
    existing[name] = tabList;

    await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing)
    });

    alert(`Workspace "${name}" saved successfully!`);
    if (loadWorkspacesListFn) loadWorkspacesListFn();
  } catch (e) {
    alert('Failed to save workspace: ' + e.message);
  }
}

export async function loadWorkspacesList(applyWorkspaceFn) {
  const savedWorkspacesList = document.getElementById('savedWorkspacesList');
  const workspacesMenu = document.getElementById('workspacesMenu');
  if (!savedWorkspacesList) return;

  try {
    const res = await fetch('/api/workspaces');
    const data = await res.json();
    savedWorkspacesList.innerHTML = '';

    const keys = Object.keys(data);
    if (keys.length === 0) {
      savedWorkspacesList.innerHTML = '<span class="empty-hint">No saved workspaces</span>';
      return;
    }

    keys.forEach((k) => {
      const item = document.createElement('div');
      item.className = 'saved-item';
      item.innerHTML = `
        <span>📂 <b>${k}</b> (${data[k].length} tabs)</span>
        <button style="background:none;border:none;color:#e74c3c;cursor:pointer" title="Delete">✕</button>
      `;

      item.querySelector('span').addEventListener('click', () => {
        if (applyWorkspaceFn) applyWorkspaceFn(data[k]);
        if (workspacesMenu && workspacesMenu.parentElement) {
          workspacesMenu.parentElement.classList.remove('open');
        }
      });

      item.querySelector('button').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete workspace "${k}"?`)) {
          delete data[k];
          await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          loadWorkspacesList(applyWorkspaceFn);
        }
      });

      savedWorkspacesList.appendChild(item);
    });
  } catch (e) {
    console.error('Failed to load workspaces:', e);
  }
}
