/**
 * Scripts / Batch Manager Component
 * Allows saving, managing, searching, suggesting, and 1-click execution of custom batch scripts.
 * CLI command: 'run_c <script_name>'
 */
import { state, sendWs } from './state.js';
import { createTab } from './tabManager.js';
import { showCopyToast } from './terminal.js';

let scripts = [];
let isEditing = false;
let currentEditingId = null;

// DOM Elements
const scriptsModal = document.getElementById('scriptsModal');
const btnCloseScripts = document.getElementById('btnCloseScripts');
const scriptsSearchInput = document.getElementById('scriptsSearchInput');
const scriptsListContainer = document.getElementById('scriptsListContainer');
const btnAddNewScript = document.getElementById('btnAddNewScript');

// Form elements
const scriptEditorCard = document.getElementById('scriptEditorCard');
const editorTitle = document.getElementById('editorTitle');
const inputScriptName = document.getElementById('inputScriptName');
const inputScriptCategory = document.getElementById('inputScriptCategory');
const inputScriptDesc = document.getElementById('inputScriptDesc');
const inputScriptContent = document.getElementById('inputScriptContent');
const btnSaveScript = document.getElementById('btnSaveScript');
const btnCancelScriptEdit = document.getElementById('btnCancelScriptEdit');

/**
 * Toggle the Scripts Modal
 */
export function toggleScriptsModal(show) {
  if (!scriptsModal) return;
  const isHidden = scriptsModal.classList.contains('hidden');
  const shouldOpen = show !== undefined ? show : isHidden;

  if (shouldOpen) {
    scriptsModal.classList.remove('hidden');
    hideEditor();
    loadScripts().then(() => {
      if (scriptsSearchInput) {
        scriptsSearchInput.value = '';
        scriptsSearchInput.focus();
        renderScriptsList();
      }
    });
  } else {
    scriptsModal.classList.add('hidden');
    hideEditor();
    // Return focus to active terminal
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  }
}

export function isScriptsModalOpen() {
  return scriptsModal && !scriptsModal.classList.contains('hidden');
}

/**
 * Fetch saved scripts from backend API
 */
export async function loadScripts() {
  try {
    const res = await fetch('/api/scripts');
    scripts = await res.json();
    return scripts;
  } catch (err) {
    console.error('Failed to load scripts:', err);
    scripts = [];
    return [];
  }
}

/**
 * Render the filtered list of scripts and suggestions
 */
export function renderScriptsList(query = '') {
  if (!scriptsListContainer) return;
  const cleanQuery = (query || '').toLowerCase().trim();

  const filtered = scripts.filter(s => {
    if (!cleanQuery) return true;
    return (
      (s.name && s.name.toLowerCase().includes(cleanQuery)) ||
      (s.description && s.description.toLowerCase().includes(cleanQuery)) ||
      (s.category && s.category.toLowerCase().includes(cleanQuery)) ||
      (s.content && s.content.toLowerCase().includes(cleanQuery))
    );
  });

  if (filtered.length === 0) {
    scriptsListContainer.innerHTML = `
      <div class="empty-scripts">
        <span class="empty-icon">📜</span>
        <p>No scripts found matching "<b>${escapeHtml(cleanQuery)}</b>".</p>
        <button class="btn-primary btn-sm" id="btnQuickCreate">Create script '${escapeHtml(cleanQuery)}'</button>
      </div>
    `;
    const btnQuick = document.getElementById('btnQuickCreate');
    if (btnQuick) {
      btnQuick.addEventListener('click', () => {
        openEditor({ name: cleanQuery.replace(/[^a-zA-Z0-9_\-]/g, '_') });
      });
    }
    return;
  }

  scriptsListContainer.innerHTML = filtered.map((script, idx) => {
    const isTopSuggestion = idx === 0 && cleanQuery.length > 0;
    return `
      <div class="script-card ${isTopSuggestion ? 'top-suggestion' : ''}" data-id="${script.id}">
        <div class="script-header">
          <div class="script-title-group">
            <span class="script-name">${escapeHtml(script.name)}</span>
            <span class="script-badge-cmd" title="Click to copy CLI command" data-cmd="run_c ${escapeHtml(script.name)}">
              <code>run_c ${escapeHtml(script.name)}</code> 📋
            </span>
            ${script.category ? `<span class="script-badge-category">${escapeHtml(script.category)}</span>` : ''}
            ${isTopSuggestion ? `<span class="script-badge-suggest">Suggested (Enter)</span>` : ''}
          </div>
          <div class="script-actions">
            <button class="btn-action-primary btn-run-active" title="Run in Active Tab (Enter)" data-name="${escapeHtml(script.name)}">
              ▶ Run
            </button>
            <button class="btn-action-secondary btn-run-new" title="Run in New Tab" data-name="${escapeHtml(script.name)}">
              ➕ New Tab
            </button>
            <button class="btn-action-icon btn-edit-script" title="Edit Script" data-id="${script.id}">
              ✏
            </button>
            <button class="btn-action-icon btn-delete-script" title="Delete Script" data-name="${escapeHtml(script.name)}">
              🗑
            </button>
          </div>
        </div>
        ${script.description ? `<p class="script-description">${escapeHtml(script.description)}</p>` : ''}
        <pre class="script-code-preview"><code>${escapeHtml(script.content.trim())}</code></pre>
      </div>
    `;
  }).join('');

  // Bind event listeners for card actions
  scriptsListContainer.querySelectorAll('.btn-run-active').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      executeScript(name, false);
    });
  });

  scriptsListContainer.querySelectorAll('.btn-run-new').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      executeScript(name, true);
    });
  });

  scriptsListContainer.querySelectorAll('.btn-edit-script').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = scripts.find(s => s.id === id || s.name === id);
      if (item) openEditor(item);
    });
  });

  scriptsListContainer.querySelectorAll('.btn-delete-script').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.getAttribute('data-name');
      if (confirm(`Are you sure you want to delete script '${name}'?`)) {
        await deleteScript(name);
      }
    });
  });

  scriptsListContainer.querySelectorAll('.script-badge-cmd').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = el.getAttribute('data-cmd');
      navigator.clipboard.writeText(cmd).then(() => {
        showCopyToast(`✓ Copied: ${cmd}`);
      });
    });
  });
}

/**
 * Execute script either in active tab or in a new tab
 */
export function executeScript(scriptName, inNewTab = false) {
  if (!scriptName) return;

  const commandText = `run_c ${scriptName}\r`;

  if (inNewTab) {
    const newTabId = createTab('', `Script: ${scriptName}`);
    setTimeout(() => {
      sendWs({ type: 'data', tabId: newTabId, data: commandText });
    }, 200);
  } else {
    if (state.activeTabId) {
      sendWs({ type: 'data', tabId: state.activeTabId, data: commandText });
    }
  }

  toggleScriptsModal(false);
  showCopyToast(`⚡ Executing run_c ${scriptName}`);
}

/**
 * Open Script Editor
 */
function openEditor(script = null) {
  if (!scriptEditorCard) return;
  isEditing = true;
  currentEditingId = script && script.id ? script.id : null;

  editorTitle.textContent = script && script.name ? `Edit Script: ${script.name}` : 'Create New Script / Batch';
  inputScriptName.value = script && script.name ? script.name : '';
  inputScriptName.disabled = Boolean(script && script.name);
  inputScriptCategory.value = script && script.category ? script.category : 'General';
  inputScriptDesc.value = script && script.description ? script.description : '';
  inputScriptContent.value = script && script.content ? script.content : '@echo off\necho Running script...\n';

  scriptEditorCard.classList.remove('hidden');
  inputScriptName.focus();
}

function hideEditor() {
  if (!scriptEditorCard) return;
  isEditing = false;
  currentEditingId = null;
  scriptEditorCard.classList.add('hidden');
}

/**
 * Save Script (API POST)
 */
async function saveScriptFromEditor() {
  const name = (inputScriptName.value || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (!name) {
    alert('Please enter a valid script name (alphanumeric, dashes, underscores).');
    inputScriptName.focus();
    return;
  }

  const payload = {
    id: currentEditingId || name,
    name: name,
    category: (inputScriptCategory.value || 'General').trim(),
    description: (inputScriptDesc.value || '').trim(),
    content: inputScriptContent.value
  };

  try {
    const res = await fetch('/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch (_) {
      alert(`Server error (${res.status}): ${text || 'Unknown response'}`);
      return;
    }

    if (result.success) {
      showCopyToast(`✓ Saved script '${name}'!`);
      hideEditor();
      await loadScripts();
      renderScriptsList(scriptsSearchInput ? scriptsSearchInput.value : '');
    } else {
      alert(`Error saving script: ${result.error || 'Failed'}`);
    }
  } catch (err) {
    alert(`Failed to save script: ${err.message}`);
  }
}

/**
 * Delete Script (API DELETE)
 */
async function deleteScript(name) {
  try {
    const res = await fetch(`/api/scripts?name=${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      showCopyToast(`✓ Deleted script '${name}'`);
      await loadScripts();
      renderScriptsList(scriptsSearchInput ? scriptsSearchInput.value : '');
    } else {
      alert(`Error deleting script: ${result.error}`);
    }
  } catch (err) {
    alert(`Failed to delete script: ${err.message}`);
  }
}

/**
 * Initialize DOM listeners for the Scripts component
 */
export function initScriptsManager() {
  if (btnCloseScripts) {
    btnCloseScripts.addEventListener('click', () => toggleScriptsModal(false));
  }

  if (btnAddNewScript) {
    btnAddNewScript.addEventListener('click', () => openEditor());
  }

  if (btnCancelScriptEdit) {
    btnCancelScriptEdit.addEventListener('click', hideEditor);
  }

  if (btnSaveScript) {
    btnSaveScript.addEventListener('click', saveScriptFromEditor);
  }

  if (scriptsSearchInput) {
    scriptsSearchInput.addEventListener('input', (e) => {
      renderScriptsList(e.target.value);
    });

    scriptsSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = scriptsSearchInput.value.trim().toLowerCase();
        const filtered = scripts.filter(s => {
          if (!query) return true;
          return s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query);
        });
        if (filtered.length > 0) {
          executeScript(filtered[0].name, false);
        }
      }
      if (e.key === 'Escape') {
        toggleScriptsModal(false);
      }
    });
  }

  // Pre-load scripts in background
  loadScripts();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
