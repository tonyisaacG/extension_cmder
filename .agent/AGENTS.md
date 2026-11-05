# 🤖 Agent Instructions for Cmder Multi-Tab Container

Welcome, AI Agent / Pair Programmer!

This workspace contains the **Cmder Multi-Tab Container**, a specialized Windows terminal workspace built with Node.js, `node-pty`, and zero-build Vanilla ES6 modules.

---

## 📌 Standard Operating Procedures

When the user asks you to **add a feature** or **fix a bug**:
1. **Activate the Skill:** Read and follow [`skills/cmder-feature-workflow/SKILL.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/.agent/skills/cmder-feature-workflow/SKILL.md).
2. **Follow Workspace Rules:** Adhere to [`rules/workflow_rules.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/.agent/rules/workflow_rules.md).
3. **Respect Keyboard Boundaries:** 
   * `Alt + Key` = Container Extension Only.
   * `Ctrl + Key` = Cmder Shell Only (streamed directly as ASCII `\x01`–`\x1a`).
4. **Synchronize Documentation Across All Files:**
   * Master Tracker: [`docs/FEATURE_AND_BUG_TRACKER.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/FEATURE_AND_BUG_TRACKER.md)
   * Product Spec: [`docs/00_PRODUCT_REQUIREMENTS_DOCUMENT.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/00_PRODUCT_REQUIREMENTS_DOCUMENT.md)
   * Technical Chapter: `docs/<number>_<FEATURE_NAME>.md`
   * Roadmap: [`feature.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/feature.md)
   * Bugs: [`Bugs.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/Bugs.md)
   * Plan: [`PLAN.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/PLAN.md)
   * README: [`README.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/README.md) & [`docs/README.md`](file:///e:/2026/MyBigProjects_SimpleLib/extension_cmder/docs/README.md)
