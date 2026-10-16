import { CMDER_THEME } from './theme.js';
import { sendWs } from './state.js';

/**
 * Toast notification for clipboard actions
 */
export function showCopyToast(msg = '✓ Copied to clipboard!') {
  let toast = document.getElementById('copyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToast';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 1200);
}

/**
 * Initializes an xterm.js instance with enhanced Copy/Paste support
 */
export function createTerminalInstance(paneEl, tabId, onCustomKey) {
  const term = new Terminal({
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    theme: CMDER_THEME,
    cursorBlink: true,
    cursorStyle: 'bar',
    scrollback: 10000,
    allowTransparency: true
  });

  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(paneEl);

  // 1. Auto-Copy on selection (Classic Cmder / ConEmu feature)
  term.onSelectionChange(() => {
    if (term.hasSelection()) {
      const selected = term.getSelection();
      if (selected && selected.trim().length > 0) {
        navigator.clipboard.writeText(selected).then(() => {
          showCopyToast('✓ Copied selected text!');
        }).catch(() => {});
      }
    }
  });

  // 2. Keyboard shortcut interception (Copy, Paste & App shortcuts)
  term.attachCustomKeyEventHandler((ev) => {
    if (ev.type === 'keydown') {
      // Ctrl+C or Ctrl+Shift+C: Copy if text is selected
      if ((ev.ctrlKey && ev.key.toLowerCase() === 'c') ||
          (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === 'c')) {
        if (term.hasSelection()) {
          const selected = term.getSelection();
          navigator.clipboard.writeText(selected).then(() => {
            showCopyToast('✓ Copied to clipboard!');
            term.clearSelection();
          });
          return false; // Don't send SIGINT \x03
        }
        // If NO selection, allow Ctrl+C to stop/cancel running command
        return true;
      }

      // Ctrl+V or Ctrl+Shift+V: Paste from clipboard
      if ((ev.ctrlKey && ev.key.toLowerCase() === 'v') ||
          (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === 'v')) {
        navigator.clipboard.readText().then((text) => {
          if (text) {
            sendWs({ type: 'data', tabId, data: text });
          }
        }).catch(() => {});
        return false;
      }

      // Pass through other app shortcuts (Alt+T, Alt+W, Alt+Arrows, etc.)
      if (onCustomKey) {
        const handled = onCustomKey(ev);
        if (handled === false) {
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopPropagation) ev.stopPropagation();
          return false;
        }
      }
    }
    return true;
  });

  // 3. Right-Click Context Menu: Fast Copy & Paste (Cmder style)
  paneEl.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    if (term.hasSelection()) {
      const selected = term.getSelection();
      try {
        await navigator.clipboard.writeText(selected);
        showCopyToast('✓ Copied!');
        term.clearSelection();
      } catch (_) {}
    } else {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          sendWs({ type: 'data', tabId, data: clipText });
        }
      } catch (_) {}
    }
  });

  // 4. Automatically fit terminal dimensions
  setTimeout(() => {
    try { fitAddon.fit(); } catch (_) {}
  }, 50);

  // 5. Stream typed keystrokes to server
  term.onData((data) => {
    sendWs({ type: 'data', tabId, data });
  });

  return { term, fitAddon };
}
