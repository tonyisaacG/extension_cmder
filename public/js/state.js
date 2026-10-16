/**
 * Application State & WebSocket Management
 */
export const state = {
  ws: null,
  tabs: new Map(), // tabId -> { id, title, cwd, customName, term, fitAddon, element, tabEl }
  activeTabId: null,
  isGridMode: false,
  tabCounter: 0,
  defaultCwd: ''
};

export function sendWs(payload) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
  }
}
