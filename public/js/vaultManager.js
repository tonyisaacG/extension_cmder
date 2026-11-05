/**
 * Vault & Quick Notes Manager Component
 * Allows saving passwords, tokens, connection strings, and notes with quick abbreviation search,
 * 1-click clipboard copy, and direct insertion into the active terminal tab.
 * CLI command: 'pass_c <key>' or 'val_c <key>'
 */
import { state, sendWs } from './state.js';
import { showCopyToast } from './terminal.js';

let vaultItems = [];
let selectedIndex = 0;
let revealedSecrets = new Set();
let isEditing = false;
let currentEditingId = null;

// DOM Elements
const vaultModal = document.getElementById('vaultModal');
const btnCloseVault = document.getElementById('btnCloseVault');
const vaultSearchInput = document.getElementById('vaultSearchInput');
const vaultListContainer = document.getElementById('vaultListContainer');
const btnAddNewVaultItem = document.getElementById('btnAddNewVaultItem');

// Form elements
const vaultEditorCard = document.getElementById('vaultEditorCard');
const vaultEditorTitle = document.getElementById('vaultEditorTitle');
const inputVaultKey = document.getElementById('inputVaultKey');
const selectVaultType = document.getElementById('selectVaultType');
const inputVaultTitle = document.getElementById('inputVaultTitle');
const inputVaultValue = document.getElementById('inputVaultValue');
const chkVaultIsSecret = document.getElementById('chkVaultIsSecret');
const btnSaveVaultItem = document.getElementById('btnSaveVaultItem');
const btnCancelVaultEdit = document.getElementById('btnCancelVaultEdit');

/**
 * Toggle the Vault Modal
 */
export function toggleVaultModal(show) {
  if (!vaultModal) return;
  const isHidden = vaultModal.classList.contains('hidden');
  const shouldOpen = show !== undefined ? show : isHidden;

  if (shouldOpen) {
    vaultModal.classList.remove('hidden');
    hideEditor();
    loadVault().then(() => {
      selectedIndex = 0;
      if (vaultSearchInput) {
        vaultSearchInput.value = '';
        vaultSearchInput.focus();
        renderVaultList();
      }
    });
  } else {
    vaultModal.classList.add('hidden');
    hideEditor();
    // Return focus to active terminal
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  }
}

export function isVaultModalOpen() {
  return vaultModal && !vaultModal.classList.contains('hidden');
}

/**
 * Fetch saved vault items from backend API
 */
export async function loadVault() {
  try {
    const res = await fetch('/api/vault');
    vaultItems = await res.json();
    return vaultItems;
  } catch (err) {
    console.error('Failed to load vault:', err);
    vaultItems = [];
    return [];
  }
}

/**
 * Paste item value directly into the active Cmder terminal tab
 */
export function pasteItemIntoTerminal(item) {
  if (!item || !item.value) return;
  if (!state.activeTabId) return;

  // Send value directly to active terminal process
  sendWs({ type: 'data', tabId: state.activeTabId, data: item.value });
  toggleVaultModal(false);
  showCopyToast(`⚡ Pasted '${item.key}' into terminal!`);
}

/**
 * Copy item value to system clipboard
 */
export function copyItemToClipboard(item) {
  if (!item || !item.value) return;
  navigator.clipboard.writeText(item.value).then(() => {
    showCopyToast(`✓ Copied '${item.key}' to clipboard!`);
  }).catch(() => {
    showCopyToast(`Failed to copy`);
  });
}

/**
 * Filter items by query
 */
function getFilteredItems(query = '') {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) return vaultItems;
  return vaultItems.filter(i => 
    (i.key && i.key.toLowerCase().includes(clean)) ||
    (i.title && i.title.toLowerCase().includes(clean)) ||
    (i.type && i.type.toLowerCase().includes(clean)) ||
    (!i.isSecret && i.value && i.value.toLowerCase().includes(clean))
  );
}

/**
 * Render the filtered list of vault items
 */
export function renderVaultList(query = '') {
  if (!vaultListContainer) return;
  const filtered = getFilteredItems(query);

  if (selectedIndex >= filtered.length) {
    selectedIndex = Math.max(0, filtered.length - 1);
  }

  if (filtered.length === 0) {
    const cleanQuery = (query || '').trim();
    vaultListContainer.innerHTML = `
      <div class="empty-scripts">
        <span class="empty-icon">🔐</span>
        <p>No secrets or notes found matching "<b>${escapeHtml(cleanQuery)}</b>".</p>
        <button class="btn-primary btn-sm" id="btnQuickCreateVault">Add '${escapeHtml(cleanQuery)}' to Vault</button>
      </div>
    `;
    const btnQuick = document.getElementById('btnQuickCreateVault');
    if (btnQuick) {
      btnQuick.addEventListener('click', () => {
        openEditor({ key: cleanQuery.replace(/[^a-zA-Z0-9_\-]/g, '_') });
      });
    }
    return;
  }

  vaultListContainer.innerHTML = filtered.map((item, idx) => {
    const isSelected = idx === selectedIndex;
    const isSecret = item.isSecret !== false;
    const isRevealed = revealedSecrets.has(item.id || item.key);
    const displayValue = isSecret && !isRevealed ? '••••••••••••' : item.value;

    return `
      <div class="vault-card ${isSelected ? 'selected' : ''}" data-id="${item.id || item.key}" data-index="${idx}">
        <div class="vault-header">
          <div class="vault-title-group">
            <span class="vault-key">${escapeHtml(item.key)}</span>
            <span class="vault-badge-cmd" title="Click to copy CLI command" data-cmd="pass_c ${escapeHtml(item.key)}">
              <code>pass_c ${escapeHtml(item.key)}</code> 📋
            </span>
            <span class="vault-type-badge type-${(item.type || 'password').toLowerCase()}">${escapeHtml(item.type || 'Secret')}</span>
            ${isSelected ? `<span class="vault-badge-suggest">Press Enter to Paste</span>` : ''}
          </div>
          <div class="vault-actions">
            <button class="btn-action-primary btn-paste-term" title="Paste directly into active terminal (Enter)" data-index="${idx}">
              ⌨️ Paste into Tab
            </button>
            <button class="btn-action-secondary btn-copy-val" title="Copy to clipboard" data-index="${idx}">
              📋 Copy
            </button>
            ${isSecret ? `
              <button class="btn-action-icon btn-toggle-peek" title="${isRevealed ? 'Hide' : 'Reveal'}" data-id="${item.id || item.key}">
                ${isRevealed ? '🙈' : '👁️'}
              </button>
            ` : ''}
            <button class="btn-action-icon btn-edit-vault" title="Edit Item" data-id="${item.id || item.key}">
              ✏
            </button>
            <button class="btn-action-icon btn-delete-vault" title="Delete Item" data-id="${item.id || item.key}">
              🗑
            </button>
          </div>
        </div>
        ${item.title ? `<p class="vault-description">${escapeHtml(item.title)}</p>` : ''}
        <div class="vault-value-box ${isSecret && !isRevealed ? 'masked' : ''}">
          <code>${escapeHtml(displayValue)}</code>
        </div>
      </div>
    `;
  }).join('');

  // Bind Actions
  vaultListContainer.querySelectorAll('.btn-paste-term').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const item = filtered[idx];
      if (item) pasteItemIntoTerminal(item);
    });
  });

  vaultListContainer.querySelectorAll('.btn-copy-val').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const item = filtered[idx];
      if (item) copyItemToClipboard(item);
    });
  });

  vaultListContainer.querySelectorAll('.btn-toggle-peek').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (revealedSecrets.has(id)) {
        revealedSecrets.delete(id);
      } else {
        revealedSecrets.add(id);
      }
      renderVaultList(vaultSearchInput ? vaultSearchInput.value : '');
    });
  });

  vaultListContainer.querySelectorAll('.btn-edit-vault').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const item = vaultItems.find(i => i.id === id || i.key === id);
      if (item) openEditor(item);
    });
  });

  vaultListContainer.querySelectorAll('.btn-delete-vault').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm(`Delete '${id}' from vault?`)) {
        await deleteVaultItem(id);
      }
    });
  });

  vaultListContainer.querySelectorAll('.vault-badge-cmd').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = el.getAttribute('data-cmd');
      navigator.clipboard.writeText(cmd).then(() => {
        showCopyToast(`✓ Copied: ${cmd}`);
      });
    });
  });

  // Clicking a card selects it
  vaultListContainer.querySelectorAll('.vault-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-index'), 10);
      selectedIndex = idx;
      renderVaultList(vaultSearchInput ? vaultSearchInput.value : '');
    });
  });
}

/**
 * Open Vault Editor
 */
function openEditor(item = null) {
  if (!vaultEditorCard) return;
  isEditing = true;
  currentEditingId = item && (item.id || item.key) ? (item.id || item.key) : null;

  vaultEditorTitle.textContent = item && item.key ? `Edit Secret: ${item.key}` : 'Add Secret / Password / Note';
  inputVaultKey.value = item && item.key ? item.key : '';
  selectVaultType.value = item && item.type ? item.type : 'Password';
  inputVaultTitle.value = item && item.title ? item.title : '';
  inputVaultValue.value = item && item.value ? item.value : '';
  chkVaultIsSecret.checked = item ? item.isSecret !== false : true;

  vaultEditorCard.classList.remove('hidden');
  inputVaultKey.focus();
}

function hideEditor() {
  if (!vaultEditorCard) return;
  isEditing = false;
  currentEditingId = null;
  vaultEditorCard.classList.add('hidden');
}

/**
 * Save Item to Vault (API POST)
 */
async function saveVaultItemFromEditor() {
  const key = (inputVaultKey.value || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (!key) {
    alert('Please enter a valid key/abbreviation (e.g. server_109, db_pass).');
    inputVaultKey.focus();
    return;
  }

  const payload = {
    id: currentEditingId || key,
    key: key,
    type: selectVaultType.value || 'Password',
    title: (inputVaultTitle.value || '').trim() || key,
    value: inputVaultValue.value,
    isSecret: chkVaultIsSecret.checked
  };

  try {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch (_) {
      alert(`Server error (${res.status}): ${text}`);
      return;
    }

    if (result.success) {
      showCopyToast(`✓ Saved '${key}' to vault!`);
      hideEditor();
      await loadVault();
      renderVaultList(vaultSearchInput ? vaultSearchInput.value : '');
    } else {
      alert(`Error saving item: ${result.error || 'Failed'}`);
    }
  } catch (err) {
    alert(`Failed to save item: ${err.message}`);
  }
}

/**
 * Delete Item from Vault (API DELETE)
 */
async function deleteVaultItem(id) {
  try {
    const res = await fetch(`/api/vault?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      showCopyToast(`✓ Deleted '${id}'`);
      await loadVault();
      renderVaultList(vaultSearchInput ? vaultSearchInput.value : '');
    } else {
      alert(`Error deleting item: ${result.error}`);
    }
  } catch (err) {
    alert(`Failed to delete item: ${err.message}`);
  }
}

/**
 * Initialize DOM listeners for the Vault component
 */
export function initVaultManager() {
  if (btnCloseVault) {
    btnCloseVault.addEventListener('click', () => toggleVaultModal(false));
  }

  if (btnAddNewVaultItem) {
    btnAddNewVaultItem.addEventListener('click', () => openEditor());
  }

  if (btnCancelVaultEdit) {
    btnCancelVaultEdit.addEventListener('click', hideEditor);
  }

  if (btnSaveVaultItem) {
    btnSaveVaultItem.addEventListener('click', saveVaultItemFromEditor);
  }

  if (vaultSearchInput) {
    vaultSearchInput.addEventListener('input', (e) => {
      selectedIndex = 0;
      renderVaultList(e.target.value);
    });

    vaultSearchInput.addEventListener('keydown', (e) => {
      const query = vaultSearchInput.value;
      const filtered = getFilteredItems(query);

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex + 1) % filtered.length;
          renderVaultList(query);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
          renderVaultList(query);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered.length > 0 && filtered[selectedIndex]) {
          pasteItemIntoTerminal(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        toggleVaultModal(false);
      }
    });
  }

  // Pre-load vault in background
  loadVault();
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
