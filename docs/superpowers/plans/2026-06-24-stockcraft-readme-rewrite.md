# StockCraft README Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the upstream Craft Agents README with a Chinese-first StockCraft README that accurately describes the development preview, implemented stock-research features, local startup, architecture, upstream basis, and risk boundaries.

**Architecture:** This is a documentation-only change. `README.md` becomes the public project entry point, while `feature_list.json` and `claude-progress.md` remain the persistent evidence and handoff records required by the repository workflow.

**Tech Stack:** Markdown, JSON, PowerShell, Bun, Git

---

### Task 1: Track the README rewrite as the single active feature

**Files:**
- Modify: `feature_list.json`

- [ ] **Step 1: Add the documentation feature**

Append one feature after `infra-002`:

```json
{
  "id": "docs-001",
  "priority": 9,
  "area": "documentation",
  "title": "重写 StockCraft 项目 README",
  "user_visible_behavior": "GitHub 仓库首页以中文准确介绍 StockCraft 的定位、现有功能、本地运行方式、开发状态、上游基础和投资风险边界。",
  "status": "in_progress",
  "verification": [
    "README 首屏主体为 StockCraft，并明确标注开发预览版。",
    "README 只描述已经实现并验证的 StockCraft 功能。",
    "README 中的本地启动和常用命令与当前仓库脚本一致。",
    "README 简短说明 Craft Agents OSS 项目基础并包含投资免责声明。"
  ],
  "evidence": [],
  "notes": "已批准 README 重写设计，正在替换上游原版项目说明。"
}
```

- [ ] **Step 2: Validate the JSON**

Run:

```powershell
python -m json.tool feature_list.json > $null
```

Expected: exit code 0.

### Task 2: Replace the root README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Remove upstream-only presentation**

Replace the original Craft Agents title, Trendshift badge, marketing video, upstream screenshots, one-line installer, and upstream product marketing copy.

- [ ] **Step 2: Write the StockCraft title and status**

The opening must contain:

```markdown
# StockCraft

基于 AI Agent 的本地股票研究桌面工作台，支持 A 股、港股和美股的五步研究流程。

> 当前状态：开发预览版，可本地运行。
```

- [ ] **Step 3: Document verified product capabilities**

Include concise sections for:

- five-step stock research;
- A-share, Hong Kong, and U.S. symbol support;
- one Craft session per research run;
- Watchlist;
- Reports and Markdown export;
- SQLite persistence and retry;
- isolated StockCraft Dev runtime.

- [ ] **Step 4: Document local startup**

Use the actual repository URL and commands:

```powershell
git clone https://github.com/fuweiwe1/TradingAgents.git
cd TradingAgents
bun install --frozen-lockfile
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
bun run electron:dev
```

Also include `bash ./init.sh` for Unix/Git Bash and explain the verified Windows fallback.

- [ ] **Step 5: Document development commands and architecture**

List only commands present in `package.json`, and explain the Electron, React/Vite, server-core, shared, and SQLite boundaries.

- [ ] **Step 6: Document upstream basis and risk boundaries**

Link to Craft Agents OSS, retain Apache 2.0 attribution, state the development-preview limitations, and include:

```markdown
StockCraft 生成的内容仅供学习与研究，不构成投资建议、交易建议或收益承诺。使用者应独立核实数据并自行承担决策风险。
```

### Task 3: Verify README accuracy

**Files:**
- Test: `README.md`
- Test: `package.json`

- [ ] **Step 1: Check required content**

Run:

```powershell
rg -n "^# StockCraft|开发预览版|五步研究|Watchlist|Reports|SQLite|StockCraft Dev|Craft Agents OSS|不构成投资建议" README.md
```

Expected: every required topic is matched.

- [ ] **Step 2: Check removed upstream-only content**

Run:

```powershell
rg -n "trendshift|xQouiAIilvU|agents\.craft\.do/install-app|# Craft Agents" README.md
```

Expected: no output.

- [ ] **Step 3: Check documented commands exist**

Run:

```powershell
$scripts = (Get-Content -Raw package.json | ConvertFrom-Json).scripts
@(
  "electron:dev",
  "typecheck:shared",
  "typecheck:all",
  "lint:instance-paths",
  "lint:i18n:sorted",
  "lint:i18n:parity",
  "electron:build",
  "electron:dist:stockcraft-dev:win"
) | ForEach-Object {
  if (-not $scripts.PSObject.Properties.Name.Contains($_)) {
    throw "Missing package script: $_"
  }
}
```

Expected: exit code 0.

- [ ] **Step 4: Run repository smoke verification**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
bun run typecheck:shared
git diff --check
```

Expected: all commands pass.

### Task 4: Record completion and commit

**Files:**
- Modify: `feature_list.json`
- Modify: `claude-progress.md`
- Modify: `session-handoff.md`

- [ ] **Step 1: Mark `docs-001` passing**

Set `status` to `passing`, add dated verification evidence, and update the notes to state that the GitHub-facing README now describes StockCraft.

- [ ] **Step 2: Add the session record**

Append a concise session entry to `claude-progress.md` containing:

- the README replacement;
- verification commands and results;
- current branch;
- remaining repository-name and release-status notes.

- [ ] **Step 3: Refresh the handoff**

Update `session-handoff.md` so the next session knows the README is StockCraft-specific and the branch still needs its normal integration/push decision.

- [ ] **Step 4: Revalidate persistent files**

Run:

```powershell
python -m json.tool feature_list.json > $null
git diff --check
git status --short
```

Expected: JSON and diff checks pass; only the planned files are modified.

- [ ] **Step 5: Commit**

Run:

```powershell
git add README.md feature_list.json claude-progress.md session-handoff.md docs/superpowers/plans/2026-06-24-stockcraft-readme-rewrite.md
git commit -m "Rewrite README for StockCraft"
```

Expected: one commit containing the README implementation, plan, and persistent workflow records.
