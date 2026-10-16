import { state, sendWs } from './state.js';

const broadcastBar = document.getElementById('broadcastBar');
const broadcastInput = document.getElementById('broadcastInput');
const btnToggleBroadcast = document.getElementById('btnToggleBroadcast');

export function toggleBroadcast() {
  const isHidden = broadcastBar.classList.contains('hidden');
  if (isHidden) {
    broadcastBar.classList.remove('hidden');
    btnToggleBroadcast.classList.add('active');
    broadcastInput.focus();
  } else {
    broadcastBar.classList.add('hidden');
    btnToggleBroadcast.classList.remove('active');
    // Focus back on active terminal
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  }
}

export function executeBroadcast() {
  const cmd = broadcastInput.value.trim();
  if (!cmd) return;

  sendWs({
    type: 'broadcast',
    command: cmd
  });

  broadcastInput.value = '';
  setTimeout(() => {
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  }, 100);
}
