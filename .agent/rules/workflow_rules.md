# 📜 Cmder Container Workspace Rules & Instructions

These rules apply to all tasks performed inside the `extension_cmder` workspace.

---

## 1. Architectural Integrity & Keyboard Boundaries
* **Extension Shortcuts:** The extension container MUST ONLY use `Alt + Key` combinations (e.g. `Alt+T`, `Alt+W`, `Alt+S`, `Alt+V`, `Alt+M`, `Alt+K`, `Alt+B`, `Alt+G`, `Alt+1..9`, `Alt+Arrows`, plus `Escape` and `F1`).
* **Cmder Shell Controls:** ALL `Ctrl + Key` combinations belong to Cmder and must be forwarded directly as raw ASCII control bytes (`\x01`–`\x1a`). The extension MUST NEVER intercept `Ctrl + Key` shortcuts.
* **Zero-Build ES6:** Do not introduce bundlers (Webpack, Vite, Rollup, Babel). Frontend code in `public/js/` must execute natively in standard ES6-compliant browsers.
* **Process Handles:** All terminal shells must run as isolated `node-pty` processes bridged via WebSockets.

---

## 2. Mandatory Documentation Protocol
Whenever you implement a feature or fix a bug, you MUST update all corresponding documentation files before completing the turn:
1. **Master Tracker:** Update [`docs/FEATURE_AND_BUG_TRACKER.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/FEATURE_AND_BUG_TRACKER.md) with feature or bug entries.
2. **Feature Spec:** Create or update the technical chapter in `docs/` (`docs/XX_<FEATURE>.md`).
3. **PRD:** Update [`docs/00_PRODUCT_REQUIREMENTS_DOCUMENT.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/00_PRODUCT_REQUIREMENTS_DOCUMENT.md) requirements table.
4. **Roadmap & Registries:** Check off entries in [`feature.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/feature.md), [`Bugs.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/Bugs.md), and [`PLAN.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/PLAN.md).
5. **Root & Docs READMEs:** Sync [`README.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/README.md) and [`docs/README.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/README.md).

---

## 3. Code Validation Checklist
Before closing any task:
1. Run syntax validation with `node -c <file>` on all modified or new backend and frontend JS files.
2. Ensure no duplicate event listeners or unhandled key repeats are introduced.
3. Verify that persistent state files (JSON) are properly checked for existence before file read/write operations.
