/**
 * Cmder Multi-Tab Container — Embedded AI Copilot & Web Split-Panel Manager
 */
import { state, sendWs } from './state.js';

let isOpen = false;
let currentUrl = 'https://chatgpt.com';
let historyStack = [];
let historyIndex = -1;
let isResizing = false;

// DOM Elements
let panelEl = null;
let resizerEl = null;
let iframeEl = null;
let loaderEl = null;
let urlInputEl = null;
let injectInputEl = null;
let presetsContainer = null;
let btnToggle = null;
let btnClose = null;
let btnPopout = null;
let btnBack = null;
let btnForward = null;
let btnReload = null;
let btnGo = null;
let btnInject = null;
let statusTrigger = null;

const DEFAULT_PRESETS = [
  { name: '🤖 ChatGPT', url: 'https://chatgpt.com' },
  { name: '🔍 Google', url: 'https://www.google.com' },
  { name: '📚 DevDocs', url: 'https://devdocs.io' },
  { name: '🐙 GitHub', url: 'https://github.com' },
  { name: '💻 Localhost', url: 'http://localhost:3000' }
];

/**
 * Checks whether the Copilot split panel is currently visible
 */
export function isCopilotOpen() {
  return isOpen;
}

/**
 * Returns current Copilot state for workspace/session persistence
 */
export function getCopilotState() {
  return {
    isOpen,
    url: currentUrl,
    width: panelEl ? parseInt(panelEl.style.width || '440', 10) : 440
  };
}

/**
 * Restores Copilot state from persistent storage or workspace
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
 * Toggles the AI Copilot & Web split panel
 */
export function toggleCopilotPanel(forceState) {
  isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

  if (panelEl && resizerEl) {
    if (isOpen) {
      panelEl.classList.remove('hidden');
      resizerEl.classList.remove('hidden');
      if (btnToggle) btnToggle.classList.add('active');

      // Load initial URL if iframe is still empty
      if (!iframeEl.src || iframeEl.src === 'about:blank' || iframeEl.src.endsWith('/')) {
        navigateCopilot(currentUrl, false);
      }
    } else {
      panelEl.classList.add('hidden');
      resizerEl.classList.add('hidden');
      if (btnToggle) btnToggle.classList.remove('active');
    }
  }

  // Refit all active xterm terminal viewports smoothly
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
export function navigateCopilot(rawTarget, addToHistory = true) {
  if (!rawTarget) return;

  let target = rawTarget.trim();
  if (!/^https?:\/\//i.test(target)) {
    // If user typed search terms (e.g. "how to revert git commit"), search Google
    if (target.includes(' ') || !target.includes('.')) {
      target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    } else {
      target = `https://${target}`;
    }
  }

  currentUrl = target;
  if (urlInputEl) {
    urlInputEl.value = target;
  }

  // Update preset pill active state
  if (presetsContainer) {
    const pills = presetsContainer.querySelectorAll('.preset-pill');
    pills.forEach(pill => {
      if (pill.dataset.url && target.startsWith(pill.dataset.url)) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  // Manage internal history stack
  if (addToHistory) {
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(target);
    historyIndex = historyStack.length - 1;
  }

  updateNavButtonStates();

  // Show skeleton loader
  if (loaderEl) loaderEl.classList.remove('hidden');

  // Route through backend CORS / X-Frame-Options stripper proxy for external sites
  let finalSrc = target;
  const isLocal = target.includes('localhost') || target.includes('127.0.0.1');
  if (!isLocal) {
    finalSrc = `/api/proxy?url=${encodeURIComponent(target)}`;
  }

  if (iframeEl) {
    iframeEl.src = finalSrc;
  }

  try {
    localStorage.setItem('copilot_last_url', target);
  } catch (_) {}
}

/**
 * Updates back / forward button enabled states
 */
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

    // Provide visual feedback
    if (injectInputEl) {
      injectInputEl.value = '';
    }

    // Auto-focus active terminal
    const activeTab = state.tabs.get(activeTabId);
    if (activeTab && activeTab.term) {
      activeTab.term.focus();
    }
  }
}

/**
 * Initializes Drag-to-Resize divider functionality
 */
function initResizer() {
  if (!resizerEl || !panelEl) return;

  let startX = 0;
  let startWidth = 0;

  const onMouseDown = (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = parseInt(document.defaultView.getComputedStyle(panelEl).width, 10);
    resizerEl.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Disable iframe pointer events during drag so mouse doesn't get trapped
    if (iframeEl) iframeEl.style.pointerEvents = 'none';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isResizing) return;
    const deltaX = startX - e.clientX;
    const newWidth = Math.min(Math.max(startWidth + deltaX, 280), window.innerWidth * 0.75);
    panelEl.style.width = `${newWidth}px`;
    triggerTerminalRefit();
  };

  const onMouseUp = () => {
    if (!isResizing) return;
    isResizing = false;
    resizerEl.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (iframeEl) iframeEl.style.pointerEvents = 'auto';

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    try {
      localStorage.setItem('copilot_width', panelEl.style.width);
    } catch (_) {}
    triggerTerminalRefit();
  };

  resizerEl.addEventListener('mousedown', onMouseDown);
}

/**
 * Initializes Copilot DOM elements and event bindings
 */
export function initCopilotManager() {
  panelEl = document.getElementById('copilotPanel');
  resizerEl = document.getElementById('copilotResizer');
  iframeEl = document.getElementById('copilotIframe');
  loaderEl = document.getElementById('copilotLoader');
  urlInputEl = document.getElementById('copilotUrlInput');
  injectInputEl = document.getElementById('copilotInjectInput');
  presetsContainer = document.getElementById('copilotPresets');
  btnToggle = document.getElementById('btnToggleCopilot');
  btnClose = document.getElementById('copilotBtnClose');
  btnPopout = document.getElementById('copilotBtnPopout');
  btnBack = document.getElementById('copilotBtnBack');
  btnForward = document.getElementById('copilotBtnForward');
  btnReload = document.getElementById('copilotBtnReload');
  btnGo = document.getElementById('copilotBtnGo');
  btnInject = document.getElementById('copilotBtnInject');
  statusTrigger = document.getElementById('statusCopilotTrigger');

  // Restore saved width from localStorage
  try {
    const savedWidth = localStorage.getItem('copilot_width');
    if (savedWidth && panelEl) {
      panelEl.style.width = savedWidth;
    }
    const savedUrl = localStorage.getItem('copilot_last_url');
    if (savedUrl) {
      currentUrl = savedUrl;
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
    btnPopout.addEventListener('click', () => {
      if (currentUrl) {
        window.open(currentUrl, '_blank');
      }
    });
  }

  // Presets pills click binding
  if (presetsContainer) {
    presetsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.preset-pill');
      if (pill && pill.dataset.url) {
        navigateCopilot(pill.dataset.url, true);
      }
    });
  }

  // URL navigation input & Go button
  if (urlInputEl) {
    urlInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateCopilot(urlInputEl.value, true);
      }
    });
  }
  if (btnGo) {
    btnGo.addEventListener('click', () => {
      if (urlInputEl) navigateCopilot(urlInputEl.value, true);
    });
  }

  // Back, Forward, Reload navigation
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        navigateCopilot(historyStack[historyIndex], false);
      }
    });
  }
  if (btnForward) {
    btnForward.addEventListener('click', () => {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        navigateCopilot(historyStack[historyIndex], false);
      }
    });
  }
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      if (currentUrl) {
        navigateCopilot(currentUrl, false);
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
