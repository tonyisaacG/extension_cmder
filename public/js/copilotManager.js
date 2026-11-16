/**
 * Cmder Multi-Tab Container — Embedded Web Browser Split-Panel Manager
 */
import { state, sendWs } from './state.js';

let isOpen = false;
let currentUrl = 'https://devdocs.io';
let historyStack = ['https://devdocs.io'];
let historyIndex = 0;
let isResizing = false;

// DOM Elements
let panelEl = null;
let resizerEl = null;
let iframeEl = null;
let loaderEl = null;
let urlInputEl = null;
let injectInputEl = null;
let btnToggle = null;
let btnClose = null;
let btnPopout = null;
let btnBack = null;
let btnForward = null;
let btnReload = null;
let btnGo = null;
let btnInject = null;
let statusTrigger = null;

/**
 * Checks whether the Browser split panel is currently visible
 */
export function isCopilotOpen() {
  return isOpen;
}

/**
 * Returns current state for workspace/session persistence
 */
export function getCopilotState() {
  return {
    isOpen,
    url: currentUrl,
    width: panelEl ? parseInt(panelEl.style.width || '480', 10) : 480
  };
}

/**
 * Restores state from persistent storage or workspace
 */
export function restoreCopilotState(savedState) {
  if (!savedState) return;
  if (savedState.width && panelEl) {
    panelEl.style.width = `${savedState.width}px`;
  }
  if (savedState.url) {
    currentUrl = savedState.url;
  }
  if (savedState.isOpen) {
    toggleCopilotPanel(true);
  }
}

/**
 * Toggles the Web Browser split panel
 */
export function toggleCopilotPanel(forceState) {
  isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

  if (panelEl && resizerEl) {
    if (isOpen) {
      panelEl.classList.remove('hidden');
      resizerEl.classList.remove('hidden');
      if (btnToggle) btnToggle.classList.add('active');

      if (!iframeEl.src || iframeEl.src === 'about:blank' || iframeEl.src.endsWith('/')) {
        navigateBrowser(currentUrl, false);
      }
    } else {
      panelEl.classList.add('hidden');
      resizerEl.classList.add('hidden');
      if (btnToggle) btnToggle.classList.remove('active');
    }
  }

  triggerTerminalRefit();
}

/**
 * Re-dimensions all active terminal instances to fit remaining viewport
 */
function triggerTerminalRefit() {
  setTimeout(() => {
    state.tabs.forEach((tab) => {
      try {
        if (tab.fitAddon) {
          tab.fitAddon.fit();
        }
      } catch (_) {}
    });
  }, 50);
}

/**
 * Navigates embedded iframe to designated target URL
 */
export function navigateBrowser(rawTarget, addToHistory = true) {
  if (!rawTarget) return;

  let target = rawTarget.trim();

  // If user typed search terms without protocol or dot
  if (!/^https?:\/\//i.test(target)) {
    if (target.includes(' ') || !target.includes('.')) {
      target = `https://duckduckgo.com/?q=${encodeURIComponent(target)}`;
    } else {
      target = `https://${target}`;
    }
  }

  currentUrl = target;
  if (urlInputEl) {
    urlInputEl.value = target;
  }

  if (addToHistory) {
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(target);
    historyIndex = historyStack.length - 1;
  }

  updateNavButtonStates();

  if (loaderEl) loaderEl.classList.remove('hidden');

  const isLocal = target.includes('localhost') || target.includes('127.0.0.1');
  const finalSrc = isLocal ? target : `/api/proxy?url=${encodeURIComponent(target)}`;

  if (iframeEl) {
    iframeEl.src = finalSrc;
  }

  try {
    localStorage.setItem('browser_last_url', target);
  } catch (_) {}
}

/**
 * Opens the current URL in an external browser tab with noopener
 */
export function popoutExternalBrowser(targetUrl) {
  const url = targetUrl || currentUrl || 'https://google.com';
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function updateNavButtonStates() {
  if (btnBack) btnBack.disabled = historyIndex <= 0;
  if (btnForward) btnForward.disabled = historyIndex >= historyStack.length - 1;
}

/**
 * Injects command snippet directly into active Cmder terminal tab
 */
export function injectCommandToTerminal(command) {
  if (!command || !command.trim()) return;

  const activeTabId = state.activeTabId;
  if (activeTabId && state.ws && state.ws.readyState === WebSocket.OPEN) {
    const cmd = command.trim();
    sendWs({
      type: 'data',
      tabId: activeTabId,
      data: `${cmd}\r`
    });

    if (injectInputEl) {
      injectInputEl.value = '';
      injectInputEl.placeholder = `✓ Executed: ${cmd.slice(0, 30)}...`;
      setTimeout(() => {
        injectInputEl.placeholder = 'Paste command to run in active Cmder tab...';
      }, 2500);
    }
  }
}

// ============================================================================
// Drag Resizer Implementation
// ============================================================================

function initResizer() {
  if (!resizerEl || !panelEl) return;

  const onMouseDown = (e) => {
    isResizing = true;
    resizerEl.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    if (iframeEl) iframeEl.style.pointerEvents = 'none';

    const onMouseMove = (ev) => {
      if (!isResizing) return;
      const containerWidth = document.body.clientWidth;
      const newWidth = Math.max(300, Math.min(containerWidth * 0.75, containerWidth - ev.clientX));
      panelEl.style.width = `${newWidth}px`;
      triggerTerminalRefit();
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      resizerEl.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (iframeEl) iframeEl.style.pointerEvents = '';

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      try {
        localStorage.setItem('browser_width', panelEl.style.width);
      } catch (_) {}

      triggerTerminalRefit();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  resizerEl.addEventListener('mousedown', onMouseDown);
}

// ============================================================================
// Initialization Entry Point
// ============================================================================

export function initCopilotManager() {
  panelEl = document.getElementById('copilotPanel');
  resizerEl = document.getElementById('copilotResizer');
  iframeEl = document.getElementById('copilotIframe');
  loaderEl = document.getElementById('copilotLoader');
  urlInputEl = document.getElementById('copilotUrlInput');
  injectInputEl = document.getElementById('copilotInjectInput');
  btnToggle = document.getElementById('btnToggleCopilot');
  btnClose = document.getElementById('copilotBtnClose');
  btnPopout = document.getElementById('copilotBtnPopout');
  btnBack = document.getElementById('copilotBtnBack');
  btnForward = document.getElementById('copilotBtnForward');
  btnReload = document.getElementById('copilotBtnReload');
  btnGo = document.getElementById('copilotBtnGo');
  btnInject = document.getElementById('copilotBtnInject');
  statusTrigger = document.getElementById('statusCopilotTrigger');

  try {
    const savedWidth = localStorage.getItem('browser_width');
    if (savedWidth && panelEl) {
      panelEl.style.width = savedWidth;
    }
    const savedUrl = localStorage.getItem('browser_last_url');
    if (savedUrl) {
      currentUrl = savedUrl;
      if (urlInputEl) urlInputEl.value = currentUrl;
    }
  } catch (_) {}

  // Toggle button bindings
  if (btnToggle) {
    btnToggle.addEventListener('click', () => toggleCopilotPanel());
  }
  if (btnClose) {
    btnClose.addEventListener('click', () => toggleCopilotPanel(false));
  }
  if (statusTrigger) {
    statusTrigger.addEventListener('click', () => toggleCopilotPanel());
  }

  // Popout external browser button
  if (btnPopout) {
    btnPopout.addEventListener('click', () => popoutExternalBrowser(currentUrl));
  }

  // URL navigation input & Go button
  if (urlInputEl) {
    urlInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateBrowser(urlInputEl.value, true);
      }
    });
  }
  if (btnGo) {
    btnGo.addEventListener('click', () => {
      if (urlInputEl) navigateBrowser(urlInputEl.value, true);
    });
  }

  // Back, Forward, Reload navigation
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        navigateBrowser(historyStack[historyIndex], false);
      }
    });
  }
  if (btnForward) {
    btnForward.addEventListener('click', () => {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        navigateBrowser(historyStack[historyIndex], false);
      }
    });
  }
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      if (currentUrl) {
        navigateBrowser(currentUrl, false);
      }
    });
  }

  // Iframe load complete
  if (iframeEl) {
    iframeEl.addEventListener('load', () => {
      if (loaderEl) loaderEl.classList.add('hidden');
    });
  }

  // Command injection footer
  if (btnInject) {
    btnInject.addEventListener('click', () => {
      if (injectInputEl) injectCommandToTerminal(injectInputEl.value);
    });
  }
  if (injectInputEl) {
    injectInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        injectCommandToTerminal(injectInputEl.value);
      }
    });
  }

  // Initialize drag resizer
  initResizer();
}