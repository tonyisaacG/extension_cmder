/**
 * Cmder Multi-Tab Container — Embedded AI Copilot & Web Split-Panel Manager
 */
import { state, sendWs } from './state.js';

let isOpen = false;
let currentMode = 'ai'; // 'ai' or 'web'
let currentUrl = 'https://devdocs.io';
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

// AI Chat Assistant Elements
let tabModeAi = null;
let tabModeWeb = null;
let aiViewEl = null;
let webViewEl = null;
let chatMessagesEl = null;
let chatInputEl = null;
let chatSendBtn = null;
let btnOpenOfficialGpt = null;

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
    mode: currentMode,
    url: currentUrl,
    width: panelEl ? parseInt(panelEl.style.width || '460', 10) : 460
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
  if (savedState.mode) {
    switchCopilotMode(savedState.mode);
  }
  if (savedState.url) {
    currentUrl = savedState.url;
  }
  if (savedState.isOpen) {
    toggleCopilotPanel(true);
  }
}

/**
 * Switches between AI Assistant view and Embedded Web/Docs view
 */
export function switchCopilotMode(mode) {
  currentMode = mode === 'web' ? 'web' : 'ai';

  if (tabModeAi && tabModeWeb && aiViewEl && webViewEl) {
    if (currentMode === 'ai') {
      tabModeAi.classList.add('active');
      tabModeWeb.classList.remove('active');
      aiViewEl.classList.remove('hidden');
      webViewEl.classList.add('hidden');
      if (chatInputEl) chatInputEl.focus();
    } else {
      tabModeWeb.classList.add('active');
      tabModeAi.classList.remove('active');
      webViewEl.classList.remove('hidden');
      aiViewEl.classList.add('hidden');
      if (!iframeEl.src || iframeEl.src === 'about:blank') {
        navigateCopilot(currentUrl, false);
      }
    }
  }

  try {
    localStorage.setItem('copilot_mode', currentMode);
  } catch (_) {}
}

/**
 * Opens official ChatGPT with clean opener stripping to prevent COOP / ERR_BLOCKED_BY_RESPONSE
 */
export function openOfficialGptWindow() {
  const link = document.createElement('a');
  link.href = 'https://chatgpt.com';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
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

      if (currentMode === 'web') {
        if (!iframeEl.src || iframeEl.src === 'about:blank' || iframeEl.src.endsWith('/')) {
          navigateCopilot(currentUrl, false);
        }
      } else {
        if (chatInputEl) setTimeout(() => chatInputEl.focus(), 100);
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

  // If user clicks or requests ChatGPT, show companion card or navigate
  if (target.includes('chatgpt.com') || target.includes('openai.com')) {
    target = 'https://chatgpt.com';
  } else if (!/^https?:\/\//i.test(target)) {
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
      injectInputEl.placeholder = `✓ Executed: ${cmd.slice(0, 30)}...`;
      setTimeout(() => {
        injectInputEl.placeholder = 'Paste command to run in active Cmder tab...';
      }, 2500);
    }
  } else {
    console.warn('No active terminal or WebSocket not open to inject command');
  }
}

/**
 * Pastes command into active terminal prompt without immediately executing it
 */
export function pasteCommandToTerminal(command) {
  if (!command || !command.trim()) return;

  const activeTabId = state.activeTabId;
  if (activeTabId && state.ws && state.ws.readyState === WebSocket.OPEN) {
    sendWs({
      type: 'data',
      tabId: activeTabId,
      data: command.trim()
    });
  }
}

// ============================================================================
// AI Chat Assistant Knowledge & Conversation Engine
// ============================================================================

/**
 * Appends a message bubble into the AI chat feed
 */
function appendChatMessage(sender, text) {
  if (!chatMessagesEl) return;

  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg chat-msg-${sender}`;

  const avatar = sender === 'user' ? '👤' : '🤖';

  let bodyHtml = '';
  if (sender === 'user') {
    bodyHtml = `<div class="chat-msg-body"><p>${escapeHtml(text)}</p></div>`;
  } else {
    bodyHtml = `<div class="chat-msg-body">${formatAiResponse(text)}</div>`;
  }

  msgEl.innerHTML = `
    <div class="chat-msg-avatar">${avatar}</div>
    ${bodyHtml}
  `;

  chatMessagesEl.appendChild(msgEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  // Wire up run and copy buttons inside the new message
  msgEl.querySelectorAll('.chat-run-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code;
      if (code) injectCommandToTerminal(code);
    });
  });

  msgEl.querySelectorAll('.chat-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          const oldText = btn.innerHTML;
          btn.innerHTML = '✓ Copied!';
          setTimeout(() => btn.innerHTML = oldText, 2000);
        });
      }
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Formats AI markdown and code blocks with 1-click Run buttons
 */
function formatAiResponse(raw) {
  const parts = raw.split(/(```[\s\S]*?```)/g);
  let html = '';

  parts.forEach(part => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      let lang = 'sh';
      let code = part.slice(3, -3).trim();
      if (lines.length > 0 && /^[a-zA-Z0-9_-]+$/.test(lines[0].trim())) {
        lang = lines[0].trim();
        code = lines.slice(1).join('\n').trim();
      }

      html += `
        <div class="chat-code-block">
          <div class="chat-code-header">
            <span>${escapeHtml(lang.toUpperCase())}</span>
            <div class="chat-code-actions">
              <button class="chat-copy-btn" data-code="${escapeHtml(code)}" title="Copy code">📋 Copy</button>
              <button class="chat-run-btn" data-code="${escapeHtml(code)}" title="Run in active terminal tab">▶ Run in Cmder</button>
            </div>
          </div>
          <pre><code>${escapeHtml(code)}</code></pre>
        </div>
      `;
    } else {
      const paras = part.split(/\n\n+/).filter(Boolean);
      paras.forEach(p => {
        let formatted = escapeHtml(p.trim())
          .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
          .replace(/`([^`]+)`/g, '<code style="background:#222; padding:1px 5px; border-radius:3px; color:#2ecc71;">$1</code>');
        html += `<p>${formatted}</p>`;
      });
    }
  });

  return html;
}

/**
 * Generates an intelligent terminal-oriented AI response
 */
function handleAiQuery(prompt) {
  const q = prompt.toLowerCase().trim();

  // Show typing loader
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'chat-msg chat-msg-system thinking-msg';
  thinkingEl.innerHTML = `
    <div class="chat-msg-avatar">🤖</div>
    <div class="chat-msg-body"><p><i>Thinking...</i></p></div>
  `;
  chatMessagesEl.appendChild(thinkingEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  setTimeout(() => {
    thinkingEl.remove();

    let response = '';

    if (q.includes('undo') && q.includes('commit')) {
      response = `To undo your most recent git commit while keeping all your modified code untouched in your working directory, run:\n\n` +
        `\`\`\`sh\ngit reset --soft HEAD~1\n\`\`\`\n\n` +
        `If you want to unstage the files as well, use:\n\n` +
        `\`\`\`sh\ngit reset HEAD~1\n\`\`\`\n\n` +
        `Click **▶ Run in Cmder** above to execute it directly!`;
    } else if (q.includes('port') && (q.includes('kill') || q.includes('find') || q.includes('3000') || q.includes('8080') || q.includes('5321'))) {
      const portMatch = q.match(/\b\d{4,5}\b/);
      const port = portMatch ? portMatch[0] : '3000';
      response = `Here is how to find and kill the process holding port **${port}** on Windows:\n\n` +
        `\`\`\`sh\nfor /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a\n\`\`\`\n\n` +
        `Or in PowerShell:\n\n` +
        `\`\`\`powershell\nGet-NetTCPConnection -LocalPort ${port} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n\`\`\``;
    } else if (q.includes('pass_c') || q.includes('vault') || q.includes('secret') || q.includes('password')) {
      response = `In Cmder Container, you have the built-in Secrets Vault:\n\n` +
        `1. Press **Alt + V** to open the Vault UI.\n` +
        `2. Or in the terminal, list all saved secrets:\n\n` +
        `\`\`\`sh\npass_c\n\`\`\`\n\n` +
        `3. Copy a secret directly to your Windows clipboard with 1-click:\n\n` +
        `\`\`\`sh\npass_c <secret_name>\n\`\`\``;
    } else if (q.includes('search') && (q.includes('file') || q.includes('text') || q.includes('string'))) {
      response = `To search for a specific text string across files recursively in Windows:\n\n` +
        `**Using PowerShell:**\n\n` +
        `\`\`\`powershell\nGet-ChildItem -Recurse -File | Select-String "your_keyword"\n\`\`\`\n\n` +
        `**Using Git grep (very fast in git repos):**\n\n` +
        `\`\`\`sh\ngit grep "your_keyword"\n\`\`\``;
    } else if (q.includes('docker') && (q.includes('clean') || q.includes('remove') || q.includes('prune') || q.includes('stop'))) {
      response = `Here are quick Docker cleanup routines:\n\n` +
        `Stop and remove all running containers:\n\n` +
        `\`\`\`sh\ndocker stop $(docker ps -aq) && docker rm $(docker ps -aq)\n\`\`\`\n\n` +
        `Prune unused Docker images, containers, and networks:\n\n` +
        `\`\`\`sh\ndocker system prune -a --volumes -f\n\`\`\``;
    } else if (q.includes('branch') || q.includes('git branch')) {
      response = `Useful Git branch commands:\n\n` +
        `List all local and remote branches sorted by recent commit date:\n\n` +
        `\`\`\`sh\ngit branch -a --sort=-committerdate\n\`\`\`\n\n` +
        `Delete a branch locally:\n\n` +
        `\`\`\`sh\ngit branch -d <branch_name>\n\`\`\``;
    } else {
      response = `Here is a suggested command based on your request:\n\n` +
        `\`\`\`sh\n${escapeHtml(prompt)}\n\`\`\`\n\n` +
        `You can click **▶ Run in Cmder** to test it in your active terminal, or click **[Open Companion Window ↗]** above to ask your full ChatGPT account.`;
    }

    appendChatMessage('ai', response);
  }, 400);
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

    // Prevent mouse events from being captured inside iframe during drag
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
        localStorage.setItem('copilot_width', panelEl.style.width);
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

  // AI Chat Assistant Elements
  tabModeAi = document.getElementById('tabModeAi');
  tabModeWeb = document.getElementById('tabModeWeb');
  aiViewEl = document.getElementById('copilotAiView');
  webViewEl = document.getElementById('copilotWebView');
  chatMessagesEl = document.getElementById('copilotChatMessages');
  chatInputEl = document.getElementById('copilotChatInput');
  chatSendBtn = document.getElementById('copilotChatSend');
  btnOpenOfficialGpt = document.getElementById('btnOpenOfficialGpt');

  // Restore saved width and mode from localStorage
  try {
    const savedWidth = localStorage.getItem('copilot_width');
    if (savedWidth && panelEl) {
      panelEl.style.width = savedWidth;
    }
    const savedMode = localStorage.getItem('copilot_mode');
    if (savedMode) {
      switchCopilotMode(savedMode);
    }
    const savedUrl = localStorage.getItem('copilot_last_url');
    if (savedUrl) {
      currentUrl = savedUrl;
    }
  } catch (_) {}

  // Mode switcher listeners
  if (tabModeAi) {
    tabModeAi.addEventListener('click', () => switchCopilotMode('ai'));
  }
  if (tabModeWeb) {
    tabModeWeb.addEventListener('click', () => switchCopilotMode('web'));
  }

  // Official ChatGPT companion window button
  if (btnOpenOfficialGpt) {
    btnOpenOfficialGpt.addEventListener('click', () => openOfficialGptWindow());
  }

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
      if (currentMode === 'ai') {
        openOfficialGptWindow();
      } else if (currentUrl) {
        window.open(currentUrl, '_blank');
      }
    });
  }

  // AI Chat Input & Send
  const submitChat = () => {
    if (!chatInputEl) return;
    const text = chatInputEl.value.trim();
    if (!text) return;
    chatInputEl.value = '';
    appendChatMessage('user', text);
    handleAiQuery(text);
  };

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', submitChat);
  }
  if (chatInputEl) {
    chatInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitChat();
      }
    });
  }

  // Quick Chips in initial chat
  if (chatMessagesEl) {
    chatMessagesEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.quick-chip');
      if (chip && chip.dataset.prompt) {
        const prompt = chip.dataset.prompt;
        appendChatMessage('user', prompt);
        handleAiQuery(prompt);
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