/**
 * Application State & WebSocket Management
 */
export const state = {
  ws: null,
  tabs: new Map(), // tabId -> { id, title, cwd, customName, term, fitAddon, element, tabEl }
  activeTabId: null,
  isGridMode: false,
  tabCounter: 0,
  defaultCwd: '',
  wsQueue: []
};

export function sendWs(payload) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
  } else {
    // Queue message so it sends as soon as connection is established or reconnected
    state.wsQueue.push(payload);
  }
}

export function flushWsQueue() {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  while (state.wsQueue.length > 0) {
    const payload = state.wsQueue.shift();
    try {
      state.ws.send(JSON.stringify(payload));
    } catch (_) {}
  }
}
