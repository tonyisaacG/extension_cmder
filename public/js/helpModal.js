import { state } from './state.js';

const helpModal = document.getElementById('helpModal');
const btnOpenHelp = document.getElementById('btnOpenHelp');

export function toggleHelpModal(show) {
  const isCurrentlyOpen = !helpModal.classList.contains('hidden');
  const shouldOpen = show !== undefined ? show : !isCurrentlyOpen;

  if (shouldOpen) {
    helpModal.classList.remove('hidden');
    btnOpenHelp.classList.add('active');
  } else {
    helpModal.classList.add('hidden');
    btnOpenHelp.classList.remove('active');
    // Return focus to active terminal
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  }
}

export function isHelpModalOpen() {
  return !helpModal.classList.contains('hidden');
}
