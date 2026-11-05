import { state, sendWs } from './state.js';
import { showCopyToast } from './terminal.js';

let snapshotsList = [];
let restoreCallback = null;
let switchTabCallback = null;

export function isSnapshotsModalOpen() {
  const modal = document.getElementById('snapshotsModal');
  return modal && !modal.classList.contains('hidden');
}

export function toggleSnapshotsModal(forceState) {
  const modal = document.getElementById('snapshotsModal');
  if (!modal) return;
  const shouldOpen = forceState !== undefined ? forceState : modal.classList.contains('hidden');

  if (shouldOpen) {
    modal.classList.remove('hidden');
    loadSnapshots();
    const searchInput = document.getElementById('snapshotsSearchInput');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 50);
    }
  } else {
    modal.classList.add('hidden');
    const formCard = document.getElementById('snapshotFormCard');
    if (formCard) formCard.classList.add('hidden');
  }
}

/**
 * Extracts all visible and scrollback text lines from xterm.js buffer
 */
export function extractTerminalBuffer(term) {
  if (!term || !term.buffer || !term.buffer.active) return '';
  const buffer = term.buffer.active;
  const lines = [];
  const maxLines = buffer.length;
  for (let i = 0; i < maxLines; i++) {
    const line = buffer.getLine(i);
    if (line) {
      lines.push(line.translateToString(true));
    }
  }
  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines.join('\n');
}

/**
 * Loads snapshots from backend REST API
 */
export async function loadSnapshots() {
  try {
    const res = await fetch('/api/snapshots');
    if (res.ok) {
      snapshotsList = await res.json();
      renderSnapshotsList(snapshotsList);
    }
  } catch (err) {
    console.error('Failed to load snapshots:', err);
  }
}

/**
 * Saves or updates a snapshot to backend
 */
export async function saveSnapshot(payload) {
  try {
    const res = await fetch('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      showCopyToast('✓ Session snapshot saved!');
      loadSnapshots();
      return data.snapshot;
    }
  } catch (err) {
    console.error('Failed to save snapshot:', err);
  }
  return null;
}

/**
 * Deletes a snapshot by ID
 */
export async function deleteSnapshot(id) {
  if (!confirm('Are you sure you want to delete this session snapshot?')) return;
  try {
    const res = await fetch(`/api/snapshots?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showCopyToast('✓ Snapshot deleted');
      loadSnapshots();
    }
  } catch (err) {
    console.error('Failed to delete snapshot:', err);
  }
}

/**
 * Updates an existing snapshot with the active tab's latest output and commands
 */
export async function updateSnapshotFromActiveTab(targetSnapId) {
  const activeTab = state.tabs.get(state.activeTabId);
  if (!activeTab || !activeTab.term) {
    alert('No active terminal tab to capture!');
    return;
  }

  const snapId = targetSnapId || activeTab.originSnapshotId;
  if (!snapId) {
    alert('Active tab is not linked to any snapshot. Please choose a snapshot from the list or save as new.');
    return;
  }

  const existingSnap = snapshotsList.find(s => s.id === snapId);
  const snapTitle = existingSnap ? existingSnap.title : 'Snapshot';

  const bufferText = extractTerminalBuffer(activeTab.term);

  const payload = {
    id: snapId,
    title: existingSnap ? existingSnap.title : activeTab.title,
    description: existingSnap ? existingSnap.description : `Updated session in ${activeTab.cwd}`,
    tabs: [
      {
        tabTitle: activeTab.title,
        cwd: activeTab.cwd,
        buffer: bufferText,
        customName: activeTab.customName
      }
    ]
  };

  const saved = await saveSnapshot(payload);
  if (saved) {
    showCopyToast(`✓ Updated snapshot: [${snapTitle}]`);
    // Ensure active tab remembers its snapshot link
    activeTab.originSnapshotId = snapId;
    activeTab.originSnapshotTitle = snapTitle;
  }
}

/**
 * Takes snapshot of current active tab
 */
export async function snapshotActiveTab(customTitle = '', customDesc = '') {
  const activeTab = state.tabs.get(state.activeTabId);
  if (!activeTab || !activeTab.term) {
    alert('No active terminal tab to snapshot!');
    return;
  }

  const bufferText = extractTerminalBuffer(activeTab.term);
  const title = customTitle.trim() || `${activeTab.title} Session (${new Date().toLocaleTimeString()})`;

  const snapshot = {
    title,
    description: customDesc.trim() || `Snapshot of ${activeTab.title} in ${activeTab.cwd}`,
    createdAt: new Date().toISOString(),
    tabs: [
      {
        tabTitle: activeTab.title,
        cwd: activeTab.cwd,
        buffer: bufferText,
        customName: activeTab.customName
      }
    ]
  };

  const saved = await saveSnapshot(snapshot);
  if (saved && activeTab) {
    // Link active tab to this newly created snapshot
    activeTab.originSnapshotId = saved.id;
    activeTab.originSnapshotTitle = saved.title;
  }
}

/**
 * Takes snapshot of ALL open tabs
 */
export async function snapshotAllTabs(customTitle = '', customDesc = '') {
  if (state.tabs.size === 0) {
    alert('No open terminal tabs to snapshot!');
    return;
  }

  const tabSnapshots = [];
  state.tabs.forEach((tab) => {
    if (tab && tab.term) {
      tabSnapshots.push({
        tabTitle: tab.title,
        cwd: tab.cwd,
        buffer: extractTerminalBuffer(tab.term),
        customName: tab.customName
      });
    }
  });

  const title = customTitle.trim() || `Workspace Snapshot (${tabSnapshots.length} tabs - ${new Date().toLocaleTimeString()})`;

  const snapshot = {
    title,
    description: customDesc.trim() || `Full snapshot of ${tabSnapshots.length} tabs`,
    createdAt: new Date().toISOString(),
    tabs: tabSnapshots
  };

  await saveSnapshot(snapshot);
}

/**
 * Restores a snapshot into live terminal tabs and tracks origin link
 */
export function restoreSnapshot(snap) {
  if (!snap || !Array.isArray(snap.tabs) || snap.tabs.length === 0) {
    alert('Snapshot contains no tab data to restore.');
    return;
  }

  if (typeof restoreCallback !== 'function') {
    console.error('No restore callback registered');
    return;
  }

  toggleSnapshotsModal(false);

  snap.tabs.forEach((t, idx) => {
    const newTabId = restoreCallback(t.cwd, t.tabTitle || `Restored ${idx + 1}`);

    setTimeout(() => {
      const tabObj = state.tabs.get(newTabId) || Array.from(state.tabs.values()).pop();
      if (tabObj && tabObj.term) {
        // Link tab to snapshot so user can easily update it later
        tabObj.originSnapshotId = snap.id;
        tabObj.originSnapshotTitle = snap.title;

        if (t.buffer && t.buffer.length > 0) {
          tabObj.term.write(t.buffer.replace(/\r?\n/g, '\r\n') + '\r\n');
        }
        tabObj.term.write(
          `\r\n\x1b[38;5;114m── 📸 Restored Snapshot: [${snap.title}] ──\x1b[0m\r\n` +
          `\x1b[90m(Captured: ${new Date(snap.createdAt).toLocaleString()} | Press Alt+M to update)\x1b[0m\r\n\r\n`
        );
      }
    }, 250);
  });

  showCopyToast(`✓ Restored ${snap.tabs.length} tabs from snapshot!`);
}

/**
 * Clears terminal display and scrollback buffer for current active tab
 */
export function clearActiveSession() {
  const activeTab = state.tabs.get(state.activeTabId);
  if (!activeTab || !activeTab.term) return;

  activeTab.term.clear();
  sendWs({
    type: 'data',
    tabId: activeTab.id,
    data: 'cls\r'
  });
  showCopyToast('✓ Terminal screen & buffer cleared');
}

/**
 * Resets the shell process for current active tab without closing the tab
 */
export function resetActiveSession() {
  const activeTab = state.tabs.get(state.activeTabId);
  if (!activeTab || !activeTab.term) return;

  activeTab.term.clear();
  activeTab.term.write('\r\n\x1b[33m[Resetting Cmder Shell Process...]\x1b[0m\r\n');

  sendWs({
    type: 'reset',
    tabId: activeTab.id,
    cwd: activeTab.cwd,
    cols: activeTab.term.cols || 80,
    rows: activeTab.term.rows || 24
  });

  showCopyToast('✓ Shell process reset!');
}

/**
 * Copies full terminal log of snapshot to system clipboard
 */
export function copySnapshotLog(snap) {
  if (!snap || !Array.isArray(snap.tabs)) return;
  const combined = snap.tabs.map(t => `--- TAB: ${t.tabTitle} (${t.cwd}) ---\n${t.buffer}\n`).join('\n\n');
  navigator.clipboard.writeText(combined).then(() => {
    showCopyToast('✓ Copied complete session log to clipboard!');
  }).catch(() => {});
}

/**
 * Exports a snapshot as a downloadable Markdown (.md) document
 */
export function exportSnapshotAsMarkdown(snap) {
  if (!snap) return;
  const timeStr = new Date(snap.createdAt).toLocaleString();
  const isUpdated = snap.updatedAt && snap.updatedAt !== snap.createdAt;
  const updateStr = isUpdated ? new Date(snap.updatedAt).toLocaleString() : null;
  const tabCount = snap.tabs ? snap.tabs.length : 1;
  const firstCwd = (snap.tabs && snap.tabs[0]) ? snap.tabs[0].cwd : 'N/A';

  let md = `# 📸 Terminal Session Snapshot: ${snap.title}\n\n`;
  md += `> **Captured:** ${timeStr}  \n`;
  if (updateStr) {
    md += `> **Last Updated:** ${updateStr}  \n`;
  }
  md += `> **Working Directory:** \`${firstCwd}\`  \n`;
  md += `> **Tabs Included:** ${tabCount}  \n`;
  if (snap.description) {
    md += `> **Description:** ${snap.description}  \n`;
  }
  md += `\n---\n\n`;

  if (Array.isArray(snap.tabs)) {
    snap.tabs.forEach((tab, idx) => {
      md += `## 💻 Tab ${idx + 1}: ${tab.tabTitle || 'Terminal'}\n`;
      md += `- **CWD:** \`${tab.cwd}\`\n\n`;
      md += `\`\`\`bash\n`;
      const cleanBuffer = (tab.buffer || '').replace(/\r/g, '').trimEnd();
      md += (cleanBuffer || '# (Empty terminal buffer)') + `\n`;
      md += `\`\`\`\n\n`;
    });
  }

  const safeTitle = (snap.title || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `snapshot_${safeTitle}_${dateStamp}.md`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showCopyToast(`✓ Downloaded ${filename}!`);
}

/**
 * Renders and exports a snapshot as a crisp, retina PNG image using HTML5 Canvas
 */
export function exportSnapshotAsImage(snap) {
  if (!snap) return;

  const rawBuffer = (snap.tabs && snap.tabs[0] && snap.tabs[0].buffer) ? snap.tabs[0].buffer : '';
  const clean = rawBuffer.replace(/\r/g, '').trimEnd();
  let lines = clean ? clean.split('\n') : ['(No terminal output recorded)'];
  
  if (lines.length > 50) {
    lines = lines.slice(-50);
  }

  const dpr = 2; // Retina 2x scale
  const width = 940;
  const headerH = 46;
  const subHeaderH = 28;
  const padY = 16;
  const padX = 22;
  const lineH = 20;
  const contentH = Math.max(100, lines.length * lineH + padY * 2);
  const totalH = headerH + subHeaderH + contentH;

  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = totalH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, width, totalH);

  // Window Header Bar
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, headerH - 1, width, 1);

  // Traffic lights
  const dots = [
    { x: 22, color: '#ff5f56' },
    { x: 40, color: '#ffbd2e' },
    { x: 58, color: '#27c93f' }
  ];
  dots.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, headerH / 2, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.fill();
  });

  // Window Title
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#d0d0d0';
  ctx.textAlign = 'center';
  ctx.fillText('Cmder Container — ' + (snap.title || 'Session Snapshot'), width / 2, 28);

  // Date on right
  ctx.textAlign = 'right';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#777777';
  ctx.fillText(new Date(snap.createdAt).toLocaleDateString(), width - 20, 28);

  // Subheader Bar
  ctx.fillStyle = '#181818';
  ctx.fillRect(0, headerH, width, subHeaderH);
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, headerH + subHeaderH - 1, width, 1);

  const firstCwd = (snap.tabs && snap.tabs[0]) ? snap.tabs[0].cwd : 'Terminal';
  ctx.textAlign = 'left';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillStyle = '#888888';
  ctx.fillText('📁 ' + firstCwd, 20, headerH + 18);

  const tabCount = snap.tabs ? snap.tabs.length : 1;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#2ecc71';
  ctx.fillText(`⚡ ${tabCount} Tab${tabCount > 1 ? 's' : ''}`, width - 20, headerH + 18);

  // Terminal Body Lines
  ctx.textAlign = 'left';
  ctx.font = '13px Consolas, Monaco, "Courier New", monospace';

  lines.forEach((line, idx) => {
    const y = headerH + subHeaderH + padY + (idx * lineH);
    const trimmed = line.trim();

    if (line.includes('λ ') || line.startsWith('>')) {
      ctx.fillStyle = '#2ecc71';
    } else if (/^[A-Za-z]:\\|^\//.test(trimmed)) {
      ctx.fillStyle = '#f39c12';
    } else if (/error|failed|fatal|exception/i.test(line)) {
      ctx.fillStyle = '#e74c3c';
    } else if (/warn|warning/i.test(line)) {
      ctx.fillStyle = '#f1c40f';
    } else if (/✓|success|passed|done|ready/i.test(line)) {
      ctx.fillStyle = '#2ecc71';
    } else if (/^[-=#]{3,}/.test(trimmed)) {
      ctx.fillStyle = '#3498db';
    } else {
      ctx.fillStyle = '#dcdcdc';
    }

    let displayLine = line;
    if (ctx.measureText(displayLine).width > width - padX * 2) {
      while (displayLine.length > 10 && ctx.measureText(displayLine + '...').width > width - padX * 2) {
        displayLine = displayLine.slice(0, -5);
      }
      displayLine += '...';
    }

    ctx.fillText(displayLine, padX, y);
  });

  // Outer border
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, totalH);

  const safeTitle = (snap.title || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `snapshot_${safeTitle}_${dateStamp}.png`;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showCopyToast(`✓ Downloaded ${filename}!`);
  }, 'image/png');
}

/**
 * Directly exports current active terminal buffer as Markdown
 */
export function exportActiveTabAsMarkdown() {
  const activeTab = state.tabs.get(state.activeTabId);
  if (!activeTab || !activeTab.term) {
    showCopyToast('❌ No active terminal to export!');
    return;
  }
  const buffer = extractTerminalBuffer(activeTab.term);
  const tempSnap = {
    title: activeTab.customTitle || 'Live Terminal Session',
    createdAt: new Date().toISOString(),
    tabs: [
      {
        tabTitle: activeTab.customTitle || 'Terminal',
        cwd: activeTab.cwd || 'N/A',
        buffer
      }
    ]
  };
  exportSnapshotAsMarkdown(tempSnap);
}

/**
 * Directly exports current active terminal buffer as PNG image
 */
export function exportActiveTabAsImage() {
  const activeTab = state.tabs.get(state.activeTabId);
  if (!activeTab || !activeTab.term) {
    showCopyToast('❌ No active terminal to export!');
    return;
  }
  const buffer = extractTerminalBuffer(activeTab.term);
  const tempSnap = {
    title: activeTab.customTitle || 'Live Terminal Session',
    createdAt: new Date().toISOString(),
    tabs: [
      {
        tabTitle: activeTab.customTitle || 'Terminal',
        cwd: activeTab.cwd || 'N/A',
        buffer
      }
    ]
  };
  exportSnapshotAsImage(tempSnap);
}

/**
 * Renders snapshots in modal list
 */
function renderSnapshotsList(items) {
  const container = document.getElementById('snapshotsListContainer');
  if (!container) return;

  container.innerHTML = '';

  const activeTab = state.tabs.get(state.activeTabId);

  // If active tab is linked to an existing snapshot, render quick update banner at top
  if (activeTab && activeTab.originSnapshotId) {
    const banner = document.createElement('div');
    banner.className = 'active-snapshot-banner';
    banner.innerHTML = `
      <span class="active-snap-label">🔗 Current Tab is linked to: <b>${escapeHtml(activeTab.originSnapshotTitle || 'Saved Snapshot')}</b></span>
      <button class="btn-primary" id="btnBannerUpdateSnap" title="Overwrite saved snapshot with latest terminal output">🔄 Update Snapshot Now</button>
    `;
    banner.querySelector('#btnBannerUpdateSnap').addEventListener('click', async () => {
      await updateSnapshotFromActiveTab(activeTab.originSnapshotId);
    });
    container.appendChild(banner);
  }

  if (items.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-hint';
    emptyDiv.style.cssText = 'padding: 24px; text-align: center; color: #888;';
    emptyDiv.innerHTML = `
      📸 No session snapshots saved yet.<br><br>
      Click <b>"Snapshot Active"</b> above to save your current terminal output, commands, and results!
    `;
    container.appendChild(emptyDiv);
    return;
  }

  items.forEach((snap) => {
    const card = document.createElement('div');
    card.className = 'snapshot-card';

    const tabCount = snap.tabs ? snap.tabs.length : 1;
    const timeStr = new Date(snap.createdAt).toLocaleString();
    const isUpdated = snap.updatedAt && snap.updatedAt !== snap.createdAt;
    const updateStr = isUpdated ? new Date(snap.updatedAt).toLocaleString() : '';
    const firstCwd = (snap.tabs && snap.tabs[0]) ? snap.tabs[0].cwd : '';

    let bufferPreview = '';
    if (snap.tabs && snap.tabs[0] && snap.tabs[0].buffer) {
      const clean = snap.tabs[0].buffer.replace(/\r/g, '').trim();
      const lastLines = clean.split('\n').slice(-3).join('\n');
      bufferPreview = lastLines || '(Empty terminal buffer)';
    }

    card.innerHTML = `
      <div class="snapshot-card-header">
        <div class="snapshot-card-info">
          <div class="snapshot-card-title-row">
            <span class="snapshot-badge">${tabCount} Tab${tabCount > 1 ? 's' : ''}</span>
            <span class="snapshot-title">${escapeHtml(snap.title)}</span>
          </div>
          <div class="snapshot-meta">
            <span>📅 Created: ${timeStr}</span>
            ${isUpdated ? `<span>🔄 Updated: ${updateStr}</span>` : ''}
            ${firstCwd ? `<span>📁 ${escapeHtml(firstCwd)}</span>` : ''}
          </div>
        </div>
        <div class="snapshot-card-actions">
          <button class="btn-restore" title="Restore and continue this session">▶️ Restore</button>
          <button class="btn-update-snap" title="Update this snapshot with current active tab output">🔄 Update</button>
          <button class="btn-export-md" title="Download snapshot as Markdown (.md) file">📝 MD</button>
          <button class="btn-export-img" title="Download snapshot as PNG image (.png)">🖼️ PNG</button>
          <button class="btn-copy-log" title="Copy full output log to clipboard">📋 Copy</button>
          <button class="btn-delete" title="Delete snapshot">🗑️</button>
        </div>
      </div>
      ${snap.description ? `<div class="snapshot-desc">${escapeHtml(snap.description)}</div>` : ''}
      <div class="snapshot-preview-box">
        <div class="snapshot-preview-label">Buffer Tail Preview:</div>
        <pre class="snapshot-preview-pre">${escapeHtml(bufferPreview)}</pre>
      </div>
    `;

    card.querySelector('.btn-restore').addEventListener('click', () => {
      restoreSnapshot(snap);
    });

    card.querySelector('.btn-update-snap').addEventListener('click', async () => {
      if (confirm(`Update snapshot "${snap.title}" with the current active tab's latest commands and output?`)) {
        await updateSnapshotFromActiveTab(snap.id);
      }
    });

    card.querySelector('.btn-export-md').addEventListener('click', () => {
      exportSnapshotAsMarkdown(snap);
    });

    card.querySelector('.btn-export-img').addEventListener('click', () => {
      exportSnapshotAsImage(snap);
    });

    card.querySelector('.btn-copy-log').addEventListener('click', () => {
      copySnapshotLog(snap);
    });

    card.querySelector('.btn-delete').addEventListener('click', () => {
      deleteSnapshot(snap.id);
    });

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Initializes DOM listeners for snapshots manager
 */
export function initSnapshotManager(createTabFn, switchTabFn) {
  restoreCallback = createTabFn;
  switchTabCallback = switchTabFn;

  const btnOpen = document.getElementById('btnOpenSnapshots');
  const btnClose = document.getElementById('btnCloseSnapshots');
  const btnClear = document.getElementById('btnClearTerminal');
  const searchInput = document.getElementById('snapshotsSearchInput');

  if (btnOpen) btnOpen.addEventListener('click', () => toggleSnapshotsModal());
  if (btnClose) btnClose.addEventListener('click', () => toggleSnapshotsModal(false));
  if (btnClear) btnClear.addEventListener('click', clearActiveSession);

  const btnSnapActive = document.getElementById('btnSnapshotActiveTab');
  const btnSnapAll = document.getElementById('btnSnapshotAllTabs');
  const btnShowForm = document.getElementById('btnShowSnapshotForm');
  const formCard = document.getElementById('snapshotFormCard');
  const btnCancelForm = document.getElementById('btnCancelSnapshotForm');
  const btnSaveForm = document.getElementById('btnSaveSnapshotForm');

  if (btnShowForm && formCard) {
    btnShowForm.addEventListener('click', () => {
      formCard.classList.toggle('hidden');
      if (!formCard.classList.contains('hidden')) {
        document.getElementById('inputSnapshotTitle').focus();
      }
    });
  }

  if (btnCancelForm && formCard) {
    btnCancelForm.addEventListener('click', () => {
      formCard.classList.add('hidden');
    });
  }

  if (btnSnapActive) {
    btnSnapActive.addEventListener('click', async () => {
      await snapshotActiveTab();
      if (formCard) formCard.classList.add('hidden');
    });
  }

  if (btnSnapAll) {
    btnSnapAll.addEventListener('click', async () => {
      await snapshotAllTabs();
      if (formCard) formCard.classList.add('hidden');
    });
  }

  const btnExportMd = document.getElementById('btnExportActiveMd');
  if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
      exportActiveTabAsMarkdown();
    });
  }

  const btnExportImg = document.getElementById('btnExportActiveImg');
  if (btnExportImg) {
    btnExportImg.addEventListener('click', () => {
      exportActiveTabAsImage();
    });
  }

  if (btnSaveForm) {
    btnSaveForm.addEventListener('click', async () => {
      const title = document.getElementById('inputSnapshotTitle').value;
      const desc = document.getElementById('inputSnapshotDesc').value;
      const scope = document.getElementById('selectSnapshotScope').value;

      if (scope === 'all') {
        await snapshotAllTabs(title, desc);
      } else {
        await snapshotActiveTab(title, desc);
      }

      document.getElementById('inputSnapshotTitle').value = '';
      document.getElementById('inputSnapshotDesc').value = '';
      if (formCard) formCard.classList.add('hidden');
    });
  }

  const btnModalClear = document.getElementById('btnModalClearSession');
  const btnModalReset = document.getElementById('btnModalResetSession');
  if (btnModalClear) btnModalClear.addEventListener('click', clearActiveSession);
  if (btnModalReset) btnModalReset.addEventListener('click', resetActiveSession);

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        renderSnapshotsList(snapshotsList);
        return;
      }
      const filtered = snapshotsList.filter((s) => {
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.tabs && s.tabs.some(t => (t.cwd && t.cwd.toLowerCase().includes(q)) || (t.buffer && t.buffer.toLowerCase().includes(q))))
        );
      });
      renderSnapshotsList(filtered);
    });
  }
}
