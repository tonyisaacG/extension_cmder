import { isHelpModalOpen, toggleHelpModal } from './helpModal.js';
import { toggleBroadcast } from './broadcast.js';

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

  // 1. Escape: Close modal or broadcast bar
  if (e.key === 'Escape') {
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

  // 2. Guide / Help: Alt+H or Ctrl+H or F1 (No repeat)
  if (e.key === 'F1' || ((e.altKey || e.ctrlKey) && (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'i'))) {
    if (e.repeat) return false;
    markHandled();
    toggleHelpModal();
    return false;
  }

  // 3. Move Between Tabs: Alt+Left / Alt+Right or Ctrl+Left / Ctrl+Right
  // Throttled by 150ms so it moves strictly one-by-one without skipping
  if ((e.altKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    if (now - lastNavTime < 150) {
      markHandled();
      return false;
    }
    lastNavTime = now;
    markHandled();
    navigateTab(e.key === 'ArrowLeft' ? -1 : 1);
    return false;
  }

  // 4. Cycle Tabs: Ctrl+Tab
  if (e.ctrlKey && e.key === 'Tab') {
    if (now - lastNavTime < 150) {
      markHandled();
      return false;
    }
    lastNavTime = now;
    markHandled();
    navigateTab(e.shiftKey ? -1 : 1);
    return false;
  }

  // 5. New Tab: Alt+T or Alt+N or Ctrl+Shift+T or Ctrl+T (strictly 1 tab per press)
  if ((e.altKey && (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'n')) ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') ||
      (e.ctrlKey && e.key.toLowerCase() === 't')) {
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

  // 6. Close Tab: Alt+W or Alt+Q or Ctrl+Shift+W or Ctrl+W
  if ((e.altKey && (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'q')) ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'w') ||
      (e.ctrlKey && e.key.toLowerCase() === 'w')) {
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

  // 7. Broadcast Bar: Alt+B or Ctrl+B
  if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
    if (e.repeat) return false;
    markHandled();
    toggleBroadcast();
    return false;
  }

  // 8. Grid View: Alt+G or Ctrl+G
  if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
    if (e.repeat) return false;
    markHandled();
    toggleGrid();
    return false;
  }

  // 9. Jump to Tab: Alt+1..9 or Ctrl+1..9
  if ((e.altKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
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
