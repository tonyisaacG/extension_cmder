import { isHelpModalOpen, toggleHelpModal } from './helpModal.js';
import { toggleBroadcast } from './broadcast.js';
import { isScriptsModalOpen, toggleScriptsModal } from './scriptsManager.js';
import { isVaultModalOpen, toggleVaultModal } from './vaultManager.js';
import { isSnapshotsModalOpen, toggleSnapshotsModal, clearActiveSession } from './snapshotManager.js';

// Throttle timestamps to prevent double-firing and key repeats
let lastCreateTime = 0;
let lastNavTime = 0;
let lastCloseTime = 0;

/**
 * Checks a keyboard event and triggers the appropriate action.
 * Prevents double-firing, event bubbling duplicates, and accidental key repeats.
 * Returns false if shortcut was handled, true otherwise.
 */
export function handleAppShortcut(e, { createTab, closeTab, switchTab, navigateTab, toggleGrid, activeTabId, tabs }) {
  // If this event was already processed by another listener, ignore it completely
  if (e._handledByApp) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    return false;
  }

  const now = Date.now();

  const markHandled = () => {
    e._handledByApp = true;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  };

  // CRITICAL ARCHITECTURAL SPLIT:
  // Extension shortcuts are STRICTLY Alt + Key (plus F1 / Escape).
  // ALL Ctrl + Key shortcuts belong to Cmder and must NEVER be handled by the extension!
  if (e.ctrlKey && !e.altKey) {
    return true;
  }

  // 1. Escape: Close modal or broadcast bar
  if (e.key === 'Escape') {
    if (isSnapshotsModalOpen()) {
      markHandled();
      toggleSnapshotsModal(false);
      return false;
    }
    if (isVaultModalOpen()) {
      markHandled();
      toggleVaultModal(false);
      return false;
    }
    if (isScriptsModalOpen()) {
      markHandled();
      toggleScriptsModal(false);
      return false;
    }
    if (isHelpModalOpen()) {
      markHandled();
      toggleHelpModal(false);
      return false;
    }
    const broadcastBar = document.getElementById('broadcastBar');
    if (broadcastBar && !broadcastBar.classList.contains('hidden')) {
      markHandled();
      toggleBroadcast();
      return false;
    }
  }

  // 2. Snapshots & Buffer Memory: Alt+M
  if (e.altKey && e.key.toLowerCase() === 'm') {
    if (e.repeat) return false;
    markHandled();
    toggleSnapshotsModal();
    return false;
  }

  // 3. Quick Clear Terminal: Alt+K
  if (e.altKey && e.key.toLowerCase() === 'k') {
    if (e.repeat) return false;
    markHandled();
    clearActiveSession();
    return false;
  }

  // 2. Guide / Help: Alt+H or F1 (No repeat)
  if (e.key === 'F1' || (e.altKey && e.key.toLowerCase() === 'h')) {
    if (e.repeat) return false;
    markHandled();
    toggleHelpModal();
    return false;
  }

  // 3. Vault & Secrets Store: Alt+V or Alt+P
  if (e.altKey && (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'p')) {
    if (e.repeat) return false;
    markHandled();
    toggleVaultModal();
    return false;
  }

  // 4. Scripts Store / Runner: Alt+S
  if (e.altKey && e.key.toLowerCase() === 's') {
    if (e.repeat) return false;
    markHandled();
    toggleScriptsModal();
    return false;
  }

  // 5. Move Between Tabs: Alt+Left / Alt+Right
  // Throttled by 150ms so it moves strictly one-by-one without skipping
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    if (now - lastNavTime < 150) {
      markHandled();
      return false;
    }
    lastNavTime = now;
    markHandled();
    navigateTab(e.key === 'ArrowLeft' ? -1 : 1);
    return false;
  }

  // 6. New Tab: Alt+T or Alt+N (strictly 1 tab per press)
  if (e.altKey && (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'n')) {
    if (e.repeat) return false;
    if (now - lastCreateTime < 250) {
      markHandled();
      return false;
    }
    lastCreateTime = now;
    markHandled();
    createTab();
    return false;
  }

  // 7. Close Tab: Alt+W (never on Q or Ctrl)
  if (e.altKey && e.key.toLowerCase() === 'w') {
    if (e.repeat) return false;
    if (now - lastCloseTime < 200) {
      markHandled();
      return false;
    }
    lastCloseTime = now;
    markHandled();
    if (activeTabId) closeTab(activeTabId);
    return false;
  }

  // 8. Broadcast Bar: Alt+B
  if (e.altKey && e.key.toLowerCase() === 'b') {
    if (e.repeat) return false;
    markHandled();
    toggleBroadcast();
    return false;
  }

  // 9. Grid View: Alt+G
  if (e.altKey && e.key.toLowerCase() === 'g') {
    if (e.repeat) return false;
    markHandled();
    toggleGrid();
    return false;
  }

  // 10. Jump to Tab: Alt+1..9
  if (e.altKey && e.key >= '1' && e.key <= '9') {
    if (e.repeat) return false;
    markHandled();
    const index = parseInt(e.key, 10) - 1;
    const tabKeys = Array.from(tabs.keys());
    if (index < tabKeys.length) {
      switchTab(tabKeys[index]);
    }
    return false;
  }

  return true;
}
