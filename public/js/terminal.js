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
 * Initializes an xterm.js instance with enhanced, deduplicated Copy/Paste support
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

  // 1. Mouse selection auto-copy (Cleanly triggered ONCE on mouseup, avoiding repeated clipboard spam)
  let lastCopiedSelection = '';
  paneEl.addEventListener('mouseup', () => {
    setTimeout(() => {
      if (term.hasSelection()) {
        const selected = term.getSelection();
        if (selected && selected.trim().length > 0 && selected !== lastCopiedSelection) {
          lastCopiedSelection = selected;
          navigator.clipboard.writeText(selected).then(() => {
            showCopyToast('✓ Copied selection!');
          }).catch(() => {});
        }
      }
    }, 20);
  });

  // 2. Keyboard shortcut interception: Clean split between Extension (Alt) and Cmder (Ctrl)
  term.attachCustomKeyEventHandler((ev) => {
    if (ev.type === 'keydown') {
      // A. Extension Shortcuts: STRICTLY Alt+Key (plus Escape / F1)
      if (ev.altKey || ev.key === 'Escape' || ev.key === 'F1') {
        if (onCustomKey) {
          const handled = onCustomKey(ev);
          if (handled === false) {
            if (ev.preventDefault) ev.preventDefault();
            if (ev.stopPropagation) ev.stopPropagation();
            return false;
          }
        }
        return true;
      }

      // B. Cmder Shortcuts: ALL Ctrl+Key combinations are sent DIRECTLY to Cmder
      if (ev.ctrlKey && !ev.altKey) {
        // Allow Developer Tools (Ctrl+Shift+I / Ctrl+Shift+J)
        if (ev.shiftKey && (ev.key.toLowerCase() === 'i' || ev.key.toLowerCase() === 'j')) {
          return true;
        }

        // 1. Copy text if selected (Ctrl+C or Ctrl+Shift+C)
        if (ev.key.toLowerCase() === 'c' && term.hasSelection()) {
          const selected = term.getSelection();
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopPropagation) ev.stopPropagation();
          lastCopiedSelection = selected;
          navigator.clipboard.writeText(selected).then(() => {
            showCopyToast('✓ Copied to clipboard!');
            term.clearSelection();
          }).catch(() => {});
          return false;
        }

        // 2. Paste from clipboard (Ctrl+V or Ctrl+Shift+V)
        if (ev.key.toLowerCase() === 'v') {
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopPropagation) ev.stopPropagation();
          navigator.clipboard.readText().then((text) => {
            if (text) {
              sendWs({ type: 'data', tabId, data: text });
            }
          }).catch(() => {});
          return false;
        }

        // 3. Ctrl+C with NO selection: Send SIGINT (\x03) directly to cancel/stop running processes
        if (ev.key.toLowerCase() === 'c') {
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopPropagation) ev.stopPropagation();
          sendWs({ type: 'data', tabId, data: '\x03' });
          return false;
        }

        // 4. Any letter key A-Z with Ctrl (Ctrl+Q, Ctrl+R, Ctrl+W, Ctrl+A, Ctrl+E, Ctrl+L, Ctrl+U, etc.)
        const keyUpper = ev.key.toUpperCase();
        if (keyUpper.length === 1 && keyUpper >= 'A' && keyUpper <= 'Z') {
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopPropagation) ev.stopPropagation();
          // Convert letter to standard ASCII control byte (A=1, B=2, ..., Q=17, ..., Z=26)
          const code = keyUpper.charCodeAt(0) - 64;
          const ctrlChar = String.fromCharCode(code);
          sendWs({ type: 'data', tabId, data: ctrlChar });
          return false;
        }

        // 5. Special navigation and editing keys with Ctrl
        const specialCtrlMap = {
          '[': '\x1b',
          '\\': '\x1c',
          ']': '\x1d',
          '^': '\x1e',
          '_': '\x1f',
          'ArrowLeft': '\x1b[1;5D',
          'ArrowRight': '\x1b[1;5C',
          'ArrowUp': '\x1b[1;5A',
          'ArrowDown': '\x1b[1;5B',
          'Backspace': '\x17',
          'Delete': '\x1b[3;5~',
          'Home': '\x1b[1;5H',
          'End': '\x1b[1;5F',
          'Tab': '\t'
        };

        if (specialCtrlMap[ev.key]) {
          if (ev.preventDefault) ev.preventDefault();
          if (ev.stopPropagation) ev.stopPropagation();
          sendWs({ type: 'data', tabId, data: specialCtrlMap[ev.key] });
          return false;
        }

        // Prevent browser defaults for any remaining unmapped Ctrl combinations
        if (ev.preventDefault) ev.preventDefault();
        return true;
      }
    }
    return true;
  });

  // 3. Right-Click Context Menu: Fast Copy & Paste without duplicates
  paneEl.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (term.hasSelection()) {
      const selected = term.getSelection();
      try {
        lastCopiedSelection = selected;
        await navigator.clipboard.writeText(selected);
        showCopyToast('✓ Copied to clipboard!');
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
