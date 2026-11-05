---
name: cmder-feature-workflow
description: >-
  Standard engineering and documentation workflow for adding new features or fixing bugs
  in the Cmder Multi-Tab Container codebase. Use whenever designing, implementing,
  debugging, or documenting capabilities in this repository.
---

# 🛠️ Cmder Container Feature & Bug Lifecycle Skill

This skill defines the standardized, senior-level procedure for extending the **Cmder Multi-Tab Container**, implementing new features, diagnosing and fixing bugs, and keeping all technical and product documentation strictly in sync.

---

## 🏛️ 1. Core Architectural Invariants

Every modification MUST adhere to these architectural rules:

1. **Strict Keyboard Responsibility Boundary:**
   * **Extension Container Actions:** MUST ONLY use `Alt + Key` (e.g. `Alt+T`, `Alt+W`, `Alt+S`, `Alt+V`, `Alt+M`, `Alt+K`, `Alt+B`, `Alt+G`, `Alt+1..9`, `Alt+Arrows`, plus `Escape` and `F1`).
   * **Cmder Shell Actions:** ALL `Ctrl + Key` combinations MUST be forwarded directly to the backend PTY as raw ASCII control bytes (`\x01` through `\x1a`). The extension MUST NEVER intercept or hijack `Ctrl + Key`.
2. **Zero-Build ES6 Frontend:**
   * No Webpack, Vite, or Rollup compilation. Frontend files in `public/js/` MUST remain native ES6 modules.
3. **PTY Broker Pattern:**
   * Shell processes run through `node-pty` in `server/ptyManager.js`.
   * All shell communications flow over the multiplexed WebSocket (`type: "data"`, `"create"`, `"resize"`, `"broadcast"`, `"reset"`, `"close"`).
4. **Zero-Loss State & Persistence:**
   * If a feature introduces persistent state, follow the established pattern of a local `.json` file (`scripts.json`, `vault.json`, `snapshots.json`, `workspaces.json`, `last_session.json`) managed via explicit REST endpoints in `server/routes.js`.

---

## 🔄 2. New Feature Development Workflow

When adding any new feature, follow this 5-stage procedure:

### Stage 1: Product & Architecture Planning
* Identify the user persona and problem being solved.
* Determine if the feature needs:
  * Backend REST endpoint (`server/routes.js`)
  * Local JSON storage file
  * WebSocket frame extension (`server.js` & `public/js/state.js`)
  * Frontend UI module (`public/js/<feature>Manager.js`)
  * Global CLI command in `bin/` with PATH injection

### Stage 2: Backend Implementation
1. **Define File & REST Route:**
   * In `server.js`, declare file path constant and pass to `handleHttpRequest`.
   * In `server/routes.js`, implement `GET`, `POST`, `DELETE` endpoints with proper JSON parsing, input sanitization, and error handling.
2. **PTY / WebSocket Extension (if applicable):**
   * If managing terminal processes, add necessary handlers in `server/ptyManager.js` and `server.js` `switch(msg.type)`.

### Stage 3: Frontend Module Implementation
1. **Create Dedicated Manager Module (`public/js/<feature>Manager.js`):**
   * Encapsulate UI state, modal visibility toggles, REST API fetch calls, and event listeners.
   * Provide clean exports (`init<Feature>Manager`, `toggle<Feature>Modal`, `is<Feature>ModalOpen`).
2. **Update HTML Layout (`public/index.html`):**
   * Add tool button in `.header-tools`.
   * Add shortcut hint in `.app-statusbar`.
   * Insert modal markup following `.modal-overlay > .modal-card.modal-card-wide` convention.
3. **Add Styling (`public/style.css`):**
   * Style cards, badges, buttons, and inputs adhering to the dark theme color palette.
4. **Register Keyboard Shortcut (`public/js/shortcuts.js`):**
   * Assign an unused `Alt + Key` combination.
   * Register modal close on `Escape`.
5. **Bootstrap in Entry Point (`public/js/main.js`):**
   * Import manager module and call initialization function inside `main.js`.

### Stage 4: Verification & Syntax Validation
Run Node syntax validation across all modified files before proceeding:
```powershell
node -c server.js
node -c server/routes.js
node -c public/js/<feature>Manager.js
node -c public/js/shortcuts.js
node -c public/js/main.js
```

---

## 🐞 3. Bug Fixing & Hardening Workflow

When addressing any bug or regression:

1. **Root Cause Analysis (RCA):**
   * Is it an event bubbling / propagation trap? (Check `_handledByApp`, `preventDefault`, `stopPropagation`).
   * Is it a socket drop / idle timeout? (Check WebSocket ping/pong and `attach` reconnection logic).
   * Is it a browser shortcut collision? (Ensure browser defaults are prevented in `terminal.js`).
2. **Apply Minimal & Robust Fix:**
   * Implement fixes at the lowest possible layer (e.g., event handler level in `terminal.js` or connection level in `main.js`).
3. **Regression Testing:**
   * Verify that existing shortcuts (`Alt+T`, `Alt+W`, `Alt+M`, etc.) and Cmder native control keys (`Ctrl+Q`, `Ctrl+C`, `Ctrl+R`) continue to function without degradation.

---

## 📝 4. Documentation Synchronization Protocol (Mandatory)

Whenever a feature is added or a bug is resolved, you **MUST** update the following documents in order:

### 1. `docs/FEATURE_AND_BUG_TRACKER.md` (Master Tracker)
* If **New Feature:** Add an entry under `## 2. Feature & Functionality Catalog` with `[FEAT-XX]`, description, UI/CLI triggers, responsible modules, and status `🟢 Complete`.
* If **Bug Fix:** Add an entry under `## 3. Bug Registry & Resolution Log` with `[BUG-XX]`, symptoms, root cause, implemented resolution, and verification status.

### 2. Feature Specification Document (`docs/<chapter>_<FEATURE_NAME>.md`)
* For every major feature, create or update a dedicated technical document in `docs/` containing:
  * Problem Statement & Executive Summary.
  * Architecture Sequence / Mermaid Diagram.
  * Data Schema & Storage JSON specification.
  * REST API / WebSocket protocol spec.
  * User Interface & Keyboard Guide.

### 3. Product Requirements Document (`docs/00_PRODUCT_REQUIREMENTS_DOCUMENT.md`)
* Add the new functional requirement (`FR-XX`) to the Feature Catalog table.
* Add detailed requirements specification under Section 4.

### 4. Roadmap & Status Checklists
* **`feature.md`:** Mark `[x]` on completed features with bullet points explaining deliverables.
* **`Bugs.md` / `bugs.md`:** Add `[x]` with problem description and technical resolution.
* **`PLAN.md`:** Update phased delivery roadmap and architectural milestones.
* **`docs/README.md` & `README.md`:** Update table of contents, features summary, and keyboard shortcuts table.
