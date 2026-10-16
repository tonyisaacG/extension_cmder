import { state, sendWs } from './state.js';

const terminalViewportEl = document.getElementById('terminalViewport');
const btnToggleGrid = document.getElementById('btnToggleGrid');

export function toggleGridLayout(switchTabFn) {
  state.isGridMode = !state.isGridMode;
  btnToggleGrid.classList.toggle('active', state.isGridMode);

  if (state.isGridMode) {
    terminalViewportEl.classList.add('grid-mode');
    applyGridLayout();
  } else {
    terminalViewportEl.classList.remove('grid-mode');
    terminalViewportEl.style.gridTemplateColumns = '';
    terminalViewportEl.style.gridTemplateRows = '';
    if (switchTabFn && state.activeTabId) {
      switchTabFn(state.activeTabId);
    }
  }
}

export function applyGridLayout() {
  const count = state.tabs.size;
  if (count <= 1) {
    terminalViewportEl.style.gridTemplateColumns = '1fr';
    terminalViewportEl.style.gridTemplateRows = '1fr';
  } else if (count === 2) {
    terminalViewportEl.style.gridTemplateColumns = '1fr 1fr';
    terminalViewportEl.style.gridTemplateRows = '1fr';
  } else if (count <= 4) {
    terminalViewportEl.style.gridTemplateColumns = '1fr 1fr';
    terminalViewportEl.style.gridTemplateRows = '1fr 1fr';
  } else if (count <= 6) {
    terminalViewportEl.style.gridTemplateColumns = '1fr 1fr 1fr';
    terminalViewportEl.style.gridTemplateRows = '1fr 1fr';
  } else {
    terminalViewportEl.style.gridTemplateColumns = '1fr 1fr 1fr';
    terminalViewportEl.style.gridTemplateRows = 'repeat(auto-fit, minmax(200px, 1fr))';
  }

  // Refit all terminals to new grid cell dimensions
  setTimeout(() => {
    state.tabs.forEach((tab) => {
      try {
        tab.fitAddon.fit();
        sendWs({
          type: 'resize',
          tabId: tab.id,
          cols: tab.term.cols,
          rows: tab.term.rows
        });
      } catch (_) {}
    });
  }, 60);
}
