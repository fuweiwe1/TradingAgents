# 进度日志

## 当前已验证状态

- 仓库根目录：`C:\craft_agents`
- 当前目录状态：已初始化为 git 仓库，当前分支 `codex/stock-003-reports-center`，remote `origin` 指向 `https://github.com/fuweiwe1/TradingAgents.git`。
- 标准启动路径：Unix/Git Bash 使用 `bash ./init.sh`；Windows 无 Bash 时使用 `powershell -ExecutionPolicy Bypass -File .\init.ps1`。
- 标准验证路径：`powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`、`bun install --frozen-lockfile`、`bun run typecheck:shared`。
- 当前最高优先级未完成功能：`stock-003`，实现独立报告中心。
- 当前工作流基线：`setup-001`、`spec-001`、`infra-001` 已通过；Craft Agents OSS 基线与 Bun 依赖验证可恢复。
- 当前 blocker：
  - 当前环境的 `bash ./init.sh` 仍会进入损坏的 WSL，失败原因是 `/bin/bash` 不存在；Windows 当前使用 `init.ps1` 作为标准入口。
  - 需要确认 remote 仓库名 `TradingAgents` 是否为本项目最终命名，还是临时名称。

## 会话记录

### Session 001

- 日期：2026-06-15
- 本轮目标：建立 StockCraft 项目前置约束文件的干净基线。
- 已完成：
  - 读取并修复 `AGENTS.md`、`claude-progress.md`、`clean-state-checklist.md`、`feature_list.json`、`init.sh` 的乱码/模板内容。
  - 将 `feature_list.json` 改为合法 JSON，并把功能列表对齐到 StockCraft v1。
  - 新增 `session-handoff.md`，用于后续长会话交接。
  - 新增 `init.ps1`，作为 Windows 无 Bash 环境下的等价启动与验证入口。
  - 将 `setup-001` 标记为 `passing`，后续环境问题归入 `infra-001`。
- 运行过的验证：
  - `Get-Location`：确认当前目录为 `C:\craft_agents`。
  - `python -m json.tool feature_list.json`：通过。
  - Python UTF-8 读取 `feature_list.json`：通过，项目为 `StockCraft`，功能数为 7。
  - `Get-Content -Encoding UTF8 | ConvertFrom-Json`：通过。
  - 必需文件存在性检查：通过，7 个约束/交接文件均存在。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过；当前阶段只做约束文件检查，并确认目录不是 git 仓库、尚无 `package.json`。
  - `git log --oneline -5`：失败，当前目录不是 git 仓库。
  - `bash ./init.sh`：失败，当前环境没有可用 `/bin/bash`；Windows fallback 已通过。
- 已记录证据：
  - blocker 已记录在本文件“当前已验证状态”。
  - 功能状态已记录在 `feature_list.json`。
- 提交记录：无；当前目录不是 git 仓库。
- 更新过的文件或工具：
  - `AGENTS.md`
  - `claude-progress.md`
  - `clean-state-checklist.md`
  - `feature_list.json`
  - `init.sh`
  - `init.ps1`
  - `session-handoff.md`
- 已知风险或未解决问题：
  - 需要先准备 Craft Agents OSS fork 或本地工作区。
  - Unix/Git Bash 环境下的 `init.sh` 尚未在可用 Bash 环境中复验。
- 下一步最佳动作：
  - 初始化/克隆 Craft Agents OSS 工作区。
  - 确认 `bash ./init.sh` 能在目标开发环境中执行；Windows 当前可先使用 `init.ps1`。
  - 将 StockCraft Spec 保存到仓库文档目录并进入实现计划阶段。

### Session 002

- 日期：2026-06-15
- 本轮目标：确认 GitHub 仓库创建后，正式开工前还缺什么。
- 已完成：
  - 重新读取 `AGENTS.md`、`claude-progress.md`、`feature_list.json`。
  - 运行 Windows 标准启动入口 `init.ps1`。
  - 确认当前目录已经是 git 仓库，当前分支为 `main`。
  - 确认 `origin` 为 `https://github.com/fuweiwe1/TradingAgents.git`。
  - 确认当前工作区干净。
- 运行过的验证：
  - `Get-Location`：确认当前目录为 `C:\craft_agents`。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过；提示尚无 `package.json`。
  - `git log --oneline -5`：通过，最近提交为 `d0d0c69 初始化项目`。
  - `git remote -v`：通过，origin 指向 GitHub 仓库。
  - `git status --short`：通过，无输出，工作区干净。
- 当前结论：
  - git/GitHub 基础状态已就绪。
  - 正式实现前仍需要把 StockCraft Spec 落盘，并准备 Craft Agents OSS 代码基线或明确采用空仓库逐步迁入。

### Session 003

- 日期：2026-06-16
- 本轮目标：完成正式开工前两件事：落盘 StockCraft Spec，接入 Craft Agents OSS 代码基线。
- 已完成：
  - 创建 `docs/specs/stockcraft-v1-spec.md`。
  - Spec 明确 v1 范围、out-of-scope、分层架构、单连接默认模型、SQLite 边界、五步研究流与 Craft session 的关系。
- 运行过的验证：
  - `rg -n "Out of Scope|单连接默认模型|renderer 不直接访问 SQLite|每一次单股研究对应一个 Craft session|五步研究流" docs\specs\stockcraft-v1-spec.md`：通过，关键验收点均命中。
- 当前进度：
  - `spec-001` 已标记为 `passing`。
  - 下一步执行 `infra-001`：接入 Craft Agents OSS 上游代码基线。

#### Session 003 续：Craft Agents OSS 基线

- 已完成：
  - 添加 `upstream` remote：`https://github.com/craft-ai-agents/craft-agents-oss.git`。
  - 拉取 `upstream/main`，最新上游提交为 `a512da7 v0.10.3`。
  - 使用 `git merge upstream/main --allow-unrelated-histories --no-edit` 合入 Craft Agents OSS 代码基线。
  - 确认仓库已有 `package.json`、`bun.lock`、`apps/`、`packages/`。
  - 将 `upstream` push URL 设置为 `DISABLED`，避免误推上游。
  - 更新 `init.ps1` / `init.sh`：检测到 `bun.lock` 时要求 Bun，不再建议 npm fallback。
- 运行过的验证：
  - `git status --short`：合入后干净；后续仅 `init.ps1`、`init.sh` 和状态文件有记录性修改。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过约束检查，并正确提示 `bun.lock detected, but Bun is not installed; cannot run project-level verification`。
  - `Test-Path package.json/bun.lock/apps/packages`：均为 `True`。
  - `git remote -v`：`origin` 指向用户仓库，`upstream` fetch 指向 Craft Agents OSS，push 为 `DISABLED`。
- 当前 blocker：
  - 本机未安装 Bun，无法运行 `bun install --frozen-lockfile`、`bun run typecheck:shared` 或测试。

### Session 004

- 日期：2026-06-16
- 本轮目标：解除 `infra-001` 的 Bun blocker，完成 Craft Agents OSS 本地工作区基础验证。
- 已完成：
  - 安装 Bun `1.3.10` 到 `C:\Users\-\.bun\bin\bun.exe`，与仓库 CI 的 `.github/workflows/validate.yml` 配置一致。
  - 发现 `bun install --frozen-lockfile` 初始失败，根因是 `bun.lock` 仍含已移除 workspace（`apps/marketing`、`packages/craft-cli`、`packages/craft-agents-commands`）和旧 workspace 版本 `0.10.2`。
  - 使用官方 registry 临时覆盖重算 `bun.lock`，避免用户级 `.npmrc` 的腾讯镜像 URL 写入锁文件。
  - 更新 `bun.lock`：workspace 版本对齐到 `0.10.3`，移除已不存在 workspace 及其遗留依赖。
  - 完成依赖安装并跑通 shared typecheck。
  - 更新 `init.ps1`：当新终端尚未刷新 PATH 时，自动识别 `$HOME\.bun\bin\bun.exe` 并加入当前进程 PATH。
- 运行过的验证：
  - `Get-Location`：确认当前目录为 `C:\craft_agents`。
  - `git log --oneline -5`：通过，最近提交为 `9cd3de9 Merge remote-tracking branch 'upstream/main'`。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过，并提示可运行 `bun install --frozen-lockfile` 与 `bun run typecheck:shared`。
  - `powershell -NoProfile -Command "bun --version"`：失败，说明系统级 PATH 尚未在新 PowerShell 中刷新；`init.ps1` 已通过默认路径兜底解决仓库启动检查。
  - `bash ./init.sh`：失败；WSL 报错 `execvpe(/bin/bash) failed: No such file or directory`，当前 Windows 环境继续使用 `init.ps1`。
  - `bun --version`：`1.3.10`。
  - `bun install --frozen-lockfile`：通过。
  - `bun run typecheck:shared`：通过。
- 当前进度：
  - `infra-001` 已标记为 `passing`。
  - 下一步执行 `stock-001`：先定位 Craft Agents 现有 LLM connection 默认模型读取路径和 session 创建路径，再设计单股研究 run 的最小实现。

### Session 005

- 日期：2026-06-16
- 本轮目标：推进 `stock-001` 的首个后端切片。
- 已完成：
  - 创建并切换到分支 `stock-001-research-run`。
  - 创建 `docs/superpowers/plans/2026-06-16-stock-001-single-stock-research.md`。
  - 定位默认 LLM 连接路径：`SessionManager.createSession` / `getOrCreateAgent` 会通过 `resolveSessionConnection` 读取 session、workspace、global 默认连接；StockCraft v1 handler 不传 `model` 或 `llmConnection`，从而复用现有默认模型。
  - 新增 `packages/shared/src/stock`：股票代码识别、研究步骤定义、五步研究初始提示词。
  - 新增 `stockResearch:createRun` RPC：创建一个 Craft session 并发送五步研究提示。
  - 将新 RPC 纳入 routing 分类、core handler 注册和注册覆盖测试。
  - 修正 `settings.HANDLED_CHANNELS` 漏声明已实际注册的 `rtk:*` channel，使注册覆盖测试与实际注册行为一致。
- TDD 记录：
  - `symbols.test.ts` 先因 `../symbols` 缺失失败，再实现 parser 后通过。
  - `research-run.test.ts` 先因 `../research-run` 缺失失败，再实现提示词 helper 后通过。
  - `stock-research.test.ts` 先因 `./stock-research` 缺失失败，再实现 RPC handler 后通过。
- 运行过的验证：
  - `bun test packages/shared/src/stock/__tests__/symbols.test.ts packages/shared/src/stock/__tests__/research-run.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts`：通过，9 tests。
  - `bun test packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts`：通过，12 tests。
  - `bun run typecheck:shared`：通过。
  - `cd packages/server-core && bun run typecheck`：通过。
  - 收尾复验：`powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` 通过。
  - 收尾复验：`python -m json.tool feature_list.json` 通过。
  - 收尾复验：上述 9 个 focused tests、12 个 routing/registration tests、`bun run typecheck:shared`、`cd packages/server-core && bun run typecheck` 均重新通过。
  - `bun run typecheck:all`：失败，当前基线问题包括缺少 `C:/craft_agents/tsconfig.base.json`、`@types/cacheable-request`/`keyv` 类型不匹配、`session-tools-core` target/downlevel 类型问题；本轮不扩大范围修复。
- 当前进度：
  - `stock-001` 保持 `in_progress`：后端创建研究会话入口已完成，UI 工作台、步骤状态展示和报告持久化仍未完成。
  - 本地提交已完成；用户已手动推送 `origin/stock-001-research-run`，本地分支现已追踪远端，远端 HEAD 为 `a07b94e`。

### Session 006

- 日期：2026-06-16
- 本轮目标：继续 `stock-001`，接入 renderer 的第一个股票研究入口。
- 已完成：
  - 确认 `origin/stock-001-research-run` 已存在，远端 HEAD 为 `a07b94e`，本地分支正在追踪该远端分支。
  - 创建 `docs/superpowers/plans/2026-06-16-stock-001-renderer-entry.md`。
  - 将 `stockResearch:createRun` 暴露为 `window.electronAPI.createStockResearchRun`。
  - 新增 renderer helper `startStockResearch`：提交股票代码、调用后端创建研究 run、刷新新 session、导航到该 session。
  - 新增 `StockResearchDialog`，并在左侧栏 `New Session` 下方加入 `Stock Research` 入口。
- TDD 记录：
  - `start-stock-research.test.ts` 先因 `../start-stock-research` 缺失失败，再实现 helper 后通过。
  - `ipc-channels.test.ts` 先因 `stockResearch:createRun` 未加入 expected channel list 失败，再补齐 API/channel 映射后通过。
- 运行过的验证：
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
  - `git ls-remote --heads origin stock-001-research-run`：通过，返回 `a07b94e928ba4ff444561830a77d67d371b27bee`。
  - `bun test apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts`：通过，7 tests。
  - `cd apps/electron && bun run typecheck`：通过。
  - `cd apps/webui && bun run typecheck`：通过。
  - `python -m json.tool feature_list.json`：通过。
  - `git diff --check`：通过，仅有 Windows LF/CRLF 提醒。
- 当前进度：
  - `stock-001` 继续保持 `in_progress`：用户现在可以从 UI 发起股票研究并进入关联 Craft session；步骤状态展示和报告持久化仍未完成。

### Session 007

- 日期：2026-06-16
- 本轮目标：继续 `stock-001`，在股票研究会话内展示五步研究状态。
- 已完成：
  - 创建 `docs/superpowers/plans/2026-06-16-stock-001-step-status-panel.md`。
  - 新增 `apps/electron/src/renderer/stock-research/step-status.ts`：识别 `Stock Research: ...` 会话，并从 assistant/plan 消息标题推导五步状态。
  - 新增 `StockResearchStepPanel`：在股票研究会话顶部展示数据收集、分析师观点、牛熊辩论、风险审查、报告生成五步状态。
  - 将步骤面板接入 `ChatPage`，只在已加载的 Stock Research 会话中显示。
- TDD 记录：
  - `step-status.test.ts` 先因 `../step-status` 缺失失败，再实现 helper 后通过。
- 运行过的验证：
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
  - `bun test apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts`：通过，11 tests。
  - `cd apps/electron && bun run typecheck`：通过。
- 当前进度：
  - `stock-001` 继续保持 `in_progress`：后端入口、UI 发起入口和会话内五步状态展示已完成；报告持久化仍未完成，需等待 `stock-002` SQLite 边界。

### Session 008

- 日期：2026-06-16
- 本轮目标：收敛 `stock-001` 验收证据，并按用户选择推送到现有 PR 分支。
- 已完成：
  - 按开工流程重新确认当前目录为 `C:\craft_agents`，读取 `claude-progress.md` 与 `feature_list.json`，查看最近 5 个提交，并确认工作区起始状态干净。
  - 运行 Windows 标准入口 `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`，确认当前平台启动路径可恢复。
  - 扩展 `packages/server-core/src/handlers/rpc/stock-research.test.ts`：`stockResearch:createRun` 现在分别覆盖 `600519`、`00700.HK`、`AAPL`，并断言三类输入都会创建一个 `Stock Research: ...` Craft session、返回标准五步、发送包含股票展示代码和“报告生成”的五步提示。
  - 将 `stock-001` 标记为 `passing`；报告/步骤结果持久化明确留给 `stock-002` 的 SQLite 边界，不再阻塞本功能。
- TDD/验证记录：
  - 本轮没有修改生产代码；新增的是验收覆盖测试，因此未进入新的 production red/green 循环。
  - `bun test packages/shared/src/stock/__tests__/symbols.test.ts packages/shared/src/stock/__tests__/research-run.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts`：通过，11 tests，0 fail。
  - 收尾复验：`bun test packages/shared/src/stock/__tests__/symbols.test.ts packages/shared/src/stock/__tests__/research-run.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts`：通过，22 tests，0 fail。
  - 收尾复验：`bun run typecheck:shared` 通过。
  - 收尾复验：`cd packages/server-core && bun run typecheck` 通过。
  - 收尾复验：`cd apps/electron && bun run typecheck` 通过。
- 当前进度：
  - `stock-001` 已达到当前功能清单的完成定义：A股、港股、美股输入均有自动化验收证据，研究 run 关联一个 Craft session，UI 可发起并展示五步状态。
  - 下一步最高优先级功能为 `stock-002`：实现股票模块本地 SQLite 存储。
  - 已知环境 blocker 仍为：当前 Windows/WSL 环境运行 `bash ./init.sh` 会因 `/bin/bash` 不存在失败；当前平台继续使用 `init.ps1`。

### Session 009

- 日期：2026-06-16
- 本轮目标：继续 `stock-002`，实现股票模块本地 SQLite 存储的第一个可验收切片。
- 已完成：
  - 创建并切换到分支 `codex/stock-002-sqlite-storage`。
  - 创建 `docs/superpowers/plans/2026-06-16-stock-002-sqlite-storage.md`。
  - 新增 `packages/server-core/src/stock/StockStorageService`，负责初始化 `stock_symbols`、`watchlist_items`、`research_runs`、`research_steps`、`research_reports` 五张表。
  - 新增 Watchlist 新增/列表/删除、research run 创建、五步 research step 初始化、报告保存/列表/详情读取能力。
  - `stockResearch:createRun` 现在返回 `runId`，并持久化一个关联 Craft session id 的 research run。
  - 新增并分类 RPC：`stockResearch:addWatchlistItem`、`stockResearch:listWatchlistItems`、`stockResearch:removeWatchlistItem`、`stockResearch:saveReport`、`stockResearch:listReports`、`stockResearch:getReport`。
  - 将新 RPC 暴露到 Electron `CHANNEL_MAP` 和 `ElectronAPI` 类型；renderer 仍然只通过 RPC/ElectronAPI 访问，不直接访问 SQLite。
  - Electron main 与 headless server 注入同一个 server-side stock storage service，数据库路径为 `~/.craft-agent/stockcraft.sqlite`。
- TDD 记录：
  - `stock-storage.test.ts` 先因 `./stock-storage` 缺失失败，再实现服务后通过。
  - `stock-research.test.ts` 先因 `runId` 缺失和新 handler 未注册失败，再补齐 RPC 契约与 handler 后通过。
  - `ipc-channels.test.ts` 先因新 channel 未加入稳定清单失败，再补齐清单后通过。
- 运行过的验证：
  - `bun test packages/server-core/src/stock/stock-storage.test.ts`：通过，3 tests。
  - `bun test packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts`：通过，13 tests。
  - `bun test apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts`：通过，9 tests。
  - focused 收尾复验：`bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts` 通过，25 tests。
  - `bun test apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts`：通过，2 tests。
  - `bun run typecheck:shared`：通过。
  - `cd packages/server-core && bun run typecheck`：通过。
  - `cd apps/electron && bun run typecheck`：通过。
  - `python -m json.tool feature_list.json`：通过。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
  - `git diff --check`：通过，仅有 Windows LF/CRLF 提醒。
- 偏差与风险：
  - Spec/feature notes 原计划使用 `better-sqlite3`。本机两次 `bun add better-sqlite3 @types/better-sqlite3` 超时，且实际探针报 `Could not locate the bindings file`，原生 binding 未构建成功；为保持当前 Bun workspace 可验证，本轮改用 Bun 内置 `bun:sqlite`。
  - 当前数据库为 app/server 级 `~/.craft-agent/stockcraft.sqlite`，未按 workspace 拆分；当前验收未要求 workspace 隔离，后续若 Reports/Watchlist 需要跨 workspace 隔离，应加 `workspace_id` 或 workspace-scoped database。
  - Windows/WSL 环境运行 `bash ./init.sh` 仍会因 `/bin/bash` 不存在失败；当前平台继续使用 `init.ps1`。
- 当前进度：
  - `stock-002` 已标记为 `passing`：空数据库 schema、Watchlist 增删查、报告保存/列表/详情、renderer 不直连 SQLite 均有自动化或架构证据。
  - 下一步最高优先级功能为 `stock-003`：实现独立 Reports 中心。

### Session 010

- 日期：2026-06-16
- 本轮目标：修复 GitHub Actions `validate` 基线失败，并将该修复应用到 PR #1。
- 根因：
  - `packages/session-tools-core/tsconfig.json` 和 `packages/pi-agent-server/tsconfig*.json` 继承了缺失的 `../../tsconfig.base.json`。
  - 缺少共享 base config 后，TypeScript 退回旧 target，触发 GitHub 日志里的 `tsconfig.base.json` 缺失、`Set` 迭代、Unicode regex flag、第三方 `.d.ts` 等错误。
  - 补回 base config 后，`packages/pi-agent-server` 暴露出 3 个真实 strict nullability/indexing 错误。
  - 后续 CI i18n 步骤还有基线问题：locale 文件未排序，且 `lint:i18n:coverage` 引用了缺失脚本。
- 已完成：
  - 在 `stock-001-research-run` 上 cherry-pick CI baseline fix 并推送，PR #1 的 Validate 后续通过。
  - 新增根 `tsconfig.base.json`，包含共享 strict ESNext/bundler 编译选项。
  - 修复 `packages/pi-agent-server` 在 prefetch logging、DuckDuckGo redirect extraction、web-fetch content-type parsing 中的索引/可空类型问题。
  - 新增 `scripts/check-i18n-coverage.ts`，静态检查 `t(...)`、`i18n.t(...)`、`<Trans i18nKey>` key 是否存在于 `en.json`，并处理 plural base-key。
  - 运行 `bun run sort-locales` 排序所有 locale JSON。
  - 更新 `feature_list.json`，记录 infra 证据和本机 validate 限制。
- 验证：
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
  - `cmd /c "cd /d C:\craft_agents\packages\session-tools-core && bun run tsc --noEmit"`：通过。
  - `cmd /c "cd /d C:\craft_agents\packages\pi-agent-server && bun run typecheck"`：通过。
  - `bun run typecheck:all`：通过。
  - `bun run test:shared:all`：在 `validate:ci` 进入 doc-tools 前通过。
  - `bun run lint:i18n:parity`：通过。
  - `bun run lint:i18n:sorted`：通过。
  - `bun run lint:i18n:coverage`：通过，检查 1077 个静态 key。
  - `bun run validate:ci`：已越过原始 GitHub typecheck 失败和 shared tests，本机停在 `test:doc-tools`，原因是 Windows 环境没有 `python3` 命令。
  - `python -m unittest ...doc tool smoke...`：本机停止，原因是 `apps/electron/resources/bin/win32-x64/uv.exe` 不存在且 `uv` 不在 PATH。
- 剩余风险/blocker：
  - 当前 Windows 机器缺少 `python3`/`uv`，无法完整本地跑完 `validate:ci`；GitHub Actions 在 Ubuntu 上会安装 uv。

### Session 011

- 日期：2026-06-16
- 本轮目标：PR #1 合并到 main 后，继续整理 `stock-002` 分支并准备发布。
- 已完成：
  - 按开工流程确认当前目录为 `C:\craft_agents`，读取 `claude-progress.md` 与 `feature_list.json`，查看最近提交，并运行 Windows 标准入口 `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`。
  - 切换到 `codex/stock-002-sqlite-storage` 分支。
  - 确认该分支包含 `f0b1df4 实现股票模块 SQLite 存储` 与 `80c0bbd 修复 GitHub validate 基线`。
  - 复查 `stock-002` 存储实现：`StockStorageService` 使用 Bun 内置 `bun:sqlite`，由 Electron/headless server 注入 server-core handler；renderer 仅通过 RPC/ElectronAPI 调用，不直接访问 SQLite。
  - 修复 `feature_list.json` 中 `stock-002` evidence/notes 的乱码文本，并明确记录当前实现采用 `bun:sqlite` 而非 `better-sqlite3` 的原因。
- 验证记录：
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
  - `bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts`：通过，15 tests，0 fail。
  - `bun run typecheck:shared`：通过。
  - `cd packages/server-core && bun run typecheck`：通过。
  - `cd apps/electron && bun run typecheck`：通过。
- 当前进度：
  - `stock-002` 已在功能清单中保持 `passing`；本轮只修正持久化证据文字。
  - 已创建 PR #2：`https://github.com/fuweiwe1/TradingAgents/pull/2`，当前为 Draft。

### Session 012

- 日期：2026-06-16
- 本轮目标：继续 PR #2 发布流程，去除重复 CI baseline 差异。
- 已完成：
  - 发现 PR #2 diff 中仍包含 `tsconfig.base.json`、`scripts/check-i18n-coverage.ts` 和 `packages/pi-agent-server` CI baseline 文件；这些内容已通过 PR #1 合进 main，不应作为 `stock-002` 的新增差异。
  - 尝试 `git fetch origin main` 失败，原因是当前网络连接 GitHub 443 超时。
  - 改用本地已存在的 `stock-001-research-run` 分支执行 `git merge stock-001-research-run --no-edit`，使 `codex/stock-002-sqlite-storage` 包含 main 已有的 CI baseline ancestor，避免 PR diff 重复显示该修复。
  - 合并仅在 `claude-progress.md` 产生冲突；已保留 `stock-002` 记录、CI baseline 记录和 PR #2 发布记录。
- 验证记录：
  - `python -m json.tool feature_list.json`：通过。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
  - `git diff --check`：通过。
  - `bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts`：通过，27 tests，0 fail。
  - `bun run typecheck:shared`：通过。
  - `cd packages/server-core && bun run typecheck`：通过。
  - `cd apps/electron && bun run typecheck`：通过。
- 当前进度：
  - 已生成 merge commit `8c6059d`，`codex/stock-002-sqlite-storage` 当前比远端多 2 个提交。
  - 下一步是推送分支并重新确认 PR #2 diff 与 GitHub Actions 状态。

### Session 013

- 日期：2026-06-17
- 本轮目标：为 `stock-003` 独立 Reports 中心确认设计并落盘 spec。
- 已完成：
  - 按开工流程确认当前目录为 `C:\craft_agents`，读取 `claude-progress.md` 与 `feature_list.json`，查看最近提交，并运行 Windows 标准入口 `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`。
  - 确认 `stock-003` 是最高优先级未完成项，目标为独立 Reports 页面。
  - 与用户确认采用 A 方案：独立 Reports 页面，复用 `stock-002` 已有 `listStockResearchReports` / `getStockResearchReport` RPC，renderer 本地筛选。
  - 用视觉草图确认页面信息架构：左侧 Reports 入口、中间报告列表与筛选、右侧报告详情，详情提供 `Open Session` 与 `Export MD`。
  - 发现 `origin/main` 尚未包含 PR #2 的 stock storage RPC，因此将 `codex/stock-003-reports-center` 基于 `codex/stock-002-sqlite-storage` 创建；待 PR #2 合并后再整理 base。
  - 创建 `docs/superpowers/specs/2026-06-17-stock-003-reports-center-design.md`。
  - 用户确认 spec 后，使用 writing-plans skill 创建 `docs/superpowers/plans/2026-06-17-stock-003-reports-center.md`，把实现拆成 6 个 TDD 任务。
- 当前进度：
  - `stock-003` 设计与实现计划已落盘，尚未开始实现代码。
  - 下一步是按计划执行，推荐使用 subagent-driven development；若用户选择 inline，也可用 executing-plans 顺序执行。

### Session 014

- Date: 2026-06-17
- Goal: Execute StockCraft Reports Center Task 1, adding `sessionId` to report DTOs.
- Completed:
  - Followed TDD: updated the existing `creates research runs with five pending steps and stores reports` test first.
  - Confirmed the red test failed because `listResearchReports()` did not include `sessionId`.
  - Added `sessionId: string` to `StockResearchReport`.
  - Selected `research_runs.session_id` for report rows and mapped it through `mapResearchReportRow`.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - Baseline `bun test packages/server-core/src/stock/stock-storage.test.ts`: passed before edits.
  - Red `bun test packages/server-core/src/stock/stock-storage.test.ts`: failed at the report list assertion because `sessionId` was missing.
  - Green `bun test packages/server-core/src/stock/stock-storage.test.ts`: passed, 3 tests, 0 fail, 9 expectations.
- Current progress:
  - `stock-003` remains `in_progress`; Task 1 is complete and committed.
  - Next task should continue the Reports Center plan from `docs/superpowers/plans/2026-06-17-stock-003-reports-center.md`.

### Session 015

- Date: 2026-06-17
- Goal: Execute StockCraft Reports Center Task 2, adding report filtering and export helpers.
- Completed:
  - Followed TDD: created helper tests before production modules existed.
  - Confirmed the red test failed because `../report-filtering` and `../report-export` were missing.
  - Added `filterStockReports` and `sortStockReportsNewestFirst` in `apps/electron/src/renderer/stock-reports/report-filtering.ts`.
  - Added `formatStockReportMarkdown` and `buildStockReportFilename` in `apps/electron/src/renderer/stock-reports/report-export.ts`; the filename helper preserves display symbol casing while lower-casing the title slug.
- Verification:
  - `bun test apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts`: red failed with missing module errors before implementation.
  - `bun test apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts`: green passed, 5 tests, 0 fail, 16 expectations.
- Current progress:
  - `stock-003` remains `in_progress`; Task 2 is complete.
  - Next task should add the Reports route and navigation state from `docs/superpowers/plans/2026-06-17-stock-003-reports-center.md`.

### Session 016

- Date: 2026-06-17
- Goal: Execute StockCraft Reports Center Task 3, adding the Reports route and navigation state.
- Completed:
  - Followed TDD: created `apps/electron/src/shared/__tests__/route-parser-reports.test.ts` before production route changes.
  - Confirmed the red test failed because `routes.view.reports`, compound parsing, navigation-state conversion, and reports roundtrip support were missing.
  - Added `routes.view.reports()` returning `reports`.
  - Added `ReportsNavigationState`, `isReportsNavigation`, and reports handling for navigation state keys.
  - Added reports handling to compound route parsing, parsed view conversion, navigation-state conversion, and route rebuilding.
  - Re-exported `isReportsNavigation` from `NavigationContext`.
  - Fixed the compile fallout in pure navigation helper detail-mode handling: reports is navigator-only and returns `false`.
- Verification:
  - Startup: `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` passed.
  - Baseline smoke before edits: `bun test apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-history-key.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-reconcile.test.ts` passed, 21 tests, 0 fail.
  - Red: `bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts` failed as expected, 0 pass / 5 fail, with missing reports route/parser/navigation support.
  - Green: `bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts` passed, 5 tests, 0 fail.
  - Follow-on red for typecheck fallout: `bun test apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` failed because reports detail-mode returned `undefined`.
  - Follow-on green: `bun test apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` passed, 1 test, 0 fail.
  - Regression: `bun test apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-history-key.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-reconcile.test.ts` passed, 21 tests, 0 fail.
  - Typecheck: `cd apps/electron && bun run typecheck` passed.
- Current progress:
  - `stock-003` remains `in_progress`; Task 3 is complete.
  - Next task should continue the Reports Center plan from `docs/superpowers/plans/2026-06-17-stock-003-reports-center.md`.

### Session 017

- Date: 2026-06-17
- Goal: Execute StockCraft Reports Center Task 4, adding report action and page-state helpers.
- Completed:
  - Followed TDD: created `report-actions.test.ts` and `report-page-state.test.ts` before production modules existed.
  - Confirmed the red test failed because `../report-actions` and `../report-page-state` were missing.
  - Added `openStockReportSession`, `exportStockReportMarkdown`, and `downloadMarkdownFile` in `apps/electron/src/renderer/stock-reports/report-actions.ts`.
  - Added `chooseInitialReportId` and `shouldLoadReportDetail` in `apps/electron/src/renderer/stock-reports/report-page-state.ts`.
- Verification:
  - Startup: `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` passed.
  - Red: `bun test apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts` failed with missing module errors for `../report-actions` and `../report-page-state`.
  - Green: `bun test apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts` passed, 6 tests, 0 fail, 8 expectations.
- Current progress:
  - `stock-003` remains `in_progress`; Task 4 is complete.
  - Next task should render the Reports page and navigation entry from `docs/superpowers/plans/2026-06-17-stock-003-reports-center.md`.

### Session 018

- Date: 2026-06-17
- Goal: Execute StockCraft Reports Center Task 5, rendering the Reports page and navigation entry.
- Completed:
  - Added the explicit top-level reports route assertion requested for this UI wiring slice; it passed immediately because Task 3 had already established the route contract.
  - Created `apps/electron/src/renderer/pages/ReportsPage.tsx`.
  - ReportsPage loads report lists through `window.electronAPI.listStockResearchReports(workspaceId)` only when `workspaceId` is present.
  - ReportsPage filters and sorts locally with the existing report helpers, selects the initial/current report with `chooseInitialReportId`, and loads details on demand with `getStockResearchReport(workspaceId, selectedReportId)`.
  - Added list/detail loading, error, empty states; detail actions for Open Session and Export MD; report metadata, summary, markdown body, and disclaimer rendering.
  - Exported ReportsPage from the pages barrel and rendered it from `MainContentPanel` for reports navigation.
  - Added the left-sidebar Reports entry in `AppShell` using the existing navigate/routes pattern and `FileText` icon.
  - Added `sidebar.reports` to `en` and `zh-Hans`; i18n parity also required adding the same key to `de`, `es`, `hu`, `ja`, and `pl`.
- Verification:
  - Startup: `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` passed.
  - Route guard after test insertion: `bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts` passed, 6 tests, 0 fail.
  - Focused suite: `bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` passed, 20 tests, 0 fail.
  - Typecheck: `cd apps/electron; bun run typecheck` passed.
  - Locale sorted check: `bun run lint:i18n:sorted` passed.
  - Locale parity check: first failed because `sidebar.reports` was missing from `de`, `es`, `hu`, `ja`, and `pl`; after adding those narrow keys, `bun run lint:i18n:parity` passed.
- Current progress:
  - `stock-003` remains `in_progress`; Task 5 is complete.
  - Next task should perform the final verification/recording slice from `docs/superpowers/plans/2026-06-17-stock-003-reports-center.md`.

### Session 019

- Date: 2026-06-17
- Goal: Address Task 5 code quality review for ReportsPage state refresh behavior.
- Completed:
  - Verified the review finding in `apps/electron/src/renderer/pages/ReportsPage.tsx`: detail load skipping was keyed only by selected report id, and list refresh did not force selected detail reload.
  - Added workspace-tagged report/detail rendering so reports and details from the previous workspace are hidden immediately during workspace transitions.
  - Reset list-derived and detail state on every `workspaceId` change.
  - Added `detailRefreshKey` and loaded refresh tracking so Refresh and Retry can refetch the selected detail even when the selected report id is unchanged.
  - Updated the Refresh button to reload both the list and selected detail.
  - Added a detail error Retry button.
  - Added `aria-label="Search reports"` to the search input and `aria-current` to selected report rows.
- Verification:
  - Startup: `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` passed.
  - Focused suite: `bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` passed, 20 tests, 0 fail.
  - Typecheck: `cd apps/electron; bun run typecheck` passed.
  - `python -m json.tool feature_list.json` passed.
  - `git diff --check` passed with only expected CRLF warnings.
- Test note:
  - No component-level test was added because there is no established nearby React DOM test harness for `ReportsPage`; verification used the existing focused route/helper tests plus Electron typecheck.
- Current progress:
  - `stock-003` remains `in_progress`; Task 5 code quality review fixes are complete.

### Session 020

- Date: 2026-06-17
- Goal: Complete StockCraft Reports Center Task 6, final verification and persistent handoff.
- Completed:
  - Marked `stock-003` as `passing` in `feature_list.json`.
  - Recorded final Reports Center evidence after the implementation and review-fix commits.
  - Confirmed the Reports Center now covers report list/detail UI, local filtering, route/sidebar integration, Open Session, Markdown export, and workspace-safe refresh/retry behavior.
- Verification:
  - Focused suite passed: `bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` passed with 43 tests, 0 failures, and 131 expectations.
  - `bun run typecheck:shared` passed.
  - `cd packages/server-core && bun run typecheck` passed.
  - `cd apps/electron && bun run typecheck` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` passed.
  - `bun run lint:i18n:sorted` passed.
  - `bun run lint:i18n:parity` passed with 6 locales and 1437 keys each.
  - `python -m json.tool feature_list.json` passed.
  - `git diff --check` passed after final record edits.
- Current progress:
  - `stock-003` is now `passing`.
  - Next highest-priority feature is `stock-004`, the lightweight Watchlist.
- Known risk/blocker:
  - `codex/stock-003-reports-center` is still temporarily based on `codex/stock-002-sqlite-storage` until PR #2 lands.
  - On this Windows machine, `bash ./init.sh` still enters the broken WSL path where `/bin/bash` is missing; the standard local startup path remains `init.ps1`.

### Session 021

- Date: 2026-06-17
- Goal: Address final code review feedback for the Reports Center.
- Completed:
  - Verified the final reviewer finding: the report list load-error branch showed the error text but did not include the contextual Retry action required by the spec.
  - Added a local Retry button to the list error state in `ReportsPage`, wired to the existing refresh flow.
  - Updated `feature_list.json` with the review-fix evidence.
- Verification:
  - Focused suite passed again: `bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` passed with 43 tests, 0 failures, and 131 expectations.
  - `cd apps/electron && bun run typecheck` passed.
- Current progress:
  - `stock-003` remains `passing`; awaiting final re-review and branch finishing.

### Session 022

- Date: 2026-06-18
- Goal: Resume the Reports Center work, perform final re-review, and determine the safe branch-finishing path.
- Completed:
  - Restored context from `claude-progress.md`, `feature_list.json`, recent commits, and the implementation plan.
  - Confirmed the working tree is clean on `codex/stock-003-reports-center`.
  - Reviewed the complete Reports Center diff against `codex/stock-002-sqlite-storage`; no new Critical or Important issue was found.
  - Checked GitHub state: PR #2 (`codex/stock-002-sqlite-storage` into `main`) remains open and mergeable, and no PR exists for `codex/stock-003-reports-center`.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - Focused suite passed: `bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts` with 43 tests, 0 failures, and 131 expectations.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core && bun run typecheck`: passed.
  - `cd apps/electron && bun run typecheck`: passed.
  - `bun run lint:i18n:sorted`: passed.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1437 keys each.
  - `python -m json.tool feature_list.json`: passed.
  - `git diff --check`: passed.
- Current progress:
  - `stock-003` remains `passing`.
  - Branch finishing is waiting on a user choice: merge locally, create a stacked PR, keep the branch, or discard it.
- Known risk/blocker:
  - PR #2 is not merged, so a Reports Center PR opened now would need to target `codex/stock-002-sqlite-storage` as a stacked PR or temporarily include the storage changes when targeting `main`.
  - On this Windows machine, `bash ./init.sh` still enters the broken WSL path where `/bin/bash` is missing; use `init.ps1`.

### Session 023

- Date: 2026-06-18
- Goal: Locally merge the completed Reports Center branch into `codex/stock-002-sqlite-storage`.
- Completed:
  - Confirmed `codex/stock-003-reports-center` was clean and reran its focused tests and typechecks before integration.
  - Switched to `codex/stock-002-sqlite-storage`.
  - Attempted `git pull --ff-only`; it failed because GitHub port 443 timed out. The local branch matched the cached `origin/codex/stock-002-sqlite-storage` ref before the attempt.
  - Fast-forward merged `codex/stock-003-reports-center` into the local `codex/stock-002-sqlite-storage` branch.
  - Preserved the local `.superpowers/brainstorm/` directory; the merged `.gitignore` entry now ignores it.
  - Re-ran verification on the merged result.
- Verification:
  - Focused suite passed with 43 tests, 0 failures, and 131 expectations.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core && bun run typecheck`: passed.
  - `cd apps/electron && bun run typecheck`: passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - `bun run lint:i18n:sorted`: passed after running the standard `bun run sort-locales`; the rewrite produced no actual Git content diff.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1437 keys each.
  - `python -m json.tool feature_list.json`: passed.
  - `git diff --check`: passed.
- Current progress:
  - `stock-003` remains `passing` and is locally integrated into `codex/stock-002-sqlite-storage`.
  - The next highest-priority feature remains `stock-004`, the lightweight Watchlist.
- Known risk/blocker:
  - The combined local branch is ahead of `origin/codex/stock-002-sqlite-storage`; no push was requested in this session.
  - GitHub network access timed out during `git pull --ff-only`, so remote freshness beyond the cached origin ref could not be confirmed.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 024

- Date: 2026-06-18
- Goal: Confirm the product and technical design for `stock-004`, the lightweight Watchlist.
- Completed:
  - Confirmed the pushed remote branch now points to local commit `d286ca8`.
  - Created and switched to `codex/stock-004-watchlist`.
  - Used the visual companion to compare three Watchlist layouts; the user selected a standalone top-level page.
  - Confirmed product behavior:
    - Select an existing group or type a new group while adding.
    - Allow the same symbol in multiple groups.
    - Start research immediately and navigate to the new Craft session.
    - Require confirmation before removal.
    - Accept an optional note during creation.
    - Edit group and note from the detail pane.
    - Normalize missing groups to `未分组`.
    - Sort groups by name and entries by newest first.
  - Confirmed the recommended technical path: add an atomic `updateWatchlistItem` RPC while keeping groups as derived strings instead of adding a groups table.
  - Confirmed workspace-safe loading, duplicate-conflict behavior, error handling, and test boundaries.
  - Created `docs/superpowers/specs/2026-06-18-stock-004-watchlist-design.md`.
- Current progress:
  - `stock-004` is now `in_progress` at the approved design stage.
  - Next step is user review of the written Spec, followed by a TDD implementation plan.
- Known risk/blocker:
  - The new branch is stacked on the combined `codex/stock-002-sqlite-storage` branch and therefore depends on the storage/Reports changes already present there.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 025

- Date: 2026-06-18
- Goal: Turn the approved `stock-004` Watchlist Spec into an executable TDD implementation plan.
- Completed:
  - Received final user approval for `docs/superpowers/specs/2026-06-18-stock-004-watchlist-design.md`.
  - Clarified patch semantics in the Spec: omitted update fields preserve current values; explicit blank/null group moves to the canonical `Default` ungrouped bucket; `note: null` clears the note.
  - Created `docs/superpowers/plans/2026-06-18-stock-004-watchlist.md`.
  - Split implementation into seven tasks: storage update, RPC/API wiring, renderer helpers, route/navigation, dialogs, page/sidebar/i18n wiring, and final verification/records.
  - Self-reviewed the plan for Spec coverage, TDD ordering, type/signature consistency, path correctness, and scope.
- Current progress:
  - `stock-004` remains `in_progress`.
  - The implementation plan is ready for execution.
- Known risk/blocker:
  - The branch remains stacked on `codex/stock-002-sqlite-storage`.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 026

- Date: 2026-06-20
- Goal: Complete `stock-004`, the lightweight Watchlist, including implementation review, final verification, and persistent records.
- Completed:
  - Implemented atomic watchlist item updates with duplicate symbol/group conflict protection and wired `stockResearch:updateWatchlistItem` through shared protocol, server-core, ElectronAPI, and channel mapping.
  - Added tested renderer helpers for grouping, filtering, deterministic selection, dirty state, research launch, domain error classification, and stale request generations.
  - Added the top-level `watchlist` route, navigation history support, keyboard/sidebar entry, and standalone two-pane `WatchlistPage`.
  - Added workspace-safe loading and A→B→A stale-result guards for list, save, research, session refresh, and navigation operations.
  - Added add/remove dialogs with submission-close guards, localized conflict/not-found behavior, app-language date formatting, pluralized counts, and complete translations across all locale files.
  - Completed spec review and code-quality review fixes; Task 6 implementation commit is `b4d3ea4 Add stock watchlist page`.
  - Marked `stock-004` as `passing`; all features currently listed in `feature_list.json` are now passing.
- Verification:
  - Non-registration focused suite passed: 70 tests, 0 failures, 487 expectations.
  - Registration coverage passed in an isolated process: `registration.test.ts` + `registration-profiles.test.ts`, 4 tests, 0 failures. When included in the large parallel Bun invocation, the profile test shared mock registration state across files and produced a timeout/cross-profile false negative; isolation consistently passed and the Watchlist page commit does not modify registration code.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core; bun run typecheck`: passed.
  - `cd apps/electron; bun run typecheck`: passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - `bun run lint:i18n:sorted`: passed.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1484 keys each.
  - `python -m json.tool feature_list.json`: passed after final record edits.
  - `git diff --check`: passed after final record edits.
- Browser smoke note:
  - The Vite renderer server returned HTTP 200 at `http://127.0.0.1:56072/`.
  - A normal browser tab cannot provide the Electron preload/API, so the Electron renderer remained at its initial shell and could not serve as an end-to-end product test. No visual-pass claim is made; the repository's approved page-wiring strategy uses focused tests, Electron typecheck, and the standard startup entry rather than adding a new DOM harness.
- Current progress:
  - `stock-004` is `passing` on branch `codex/stock-004-watchlist`.
  - The branch is 17 commits ahead of cached `origin/codex/stock-002-sqlite-storage` and has not been pushed in this session.
  - No additional not-started feature remains in `feature_list.json`; the next action is branch handoff (push/merge/PR choice) or defining the next product feature.
- Known risk/blocker:
  - The branch remains stacked on the combined `codex/stock-002-sqlite-storage` history.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 027

- Date: 2026-06-20
- Goal: Locally merge the completed Watchlist branch into `codex/stock-002-sqlite-storage`.
- Completed:
  - Confirmed `codex/stock-002-sqlite-storage` is an ancestor of `codex/stock-004-watchlist` and both worktrees were clean before integration.
  - Switched to `codex/stock-002-sqlite-storage` and fast-forward merged `codex/stock-004-watchlist` from `d286ca8` to `ccd443f` with no conflicts.
  - Kept the feature branch intact; no push or branch deletion was requested.
  - Investigated the post-checkout locale sorted-check failure: all locale blob hashes matched the index and the apparent drift was caused by Windows CRLF checkout versus the formatter's LF output. Running the standard sorter produced no staged content diff and restored a clean index.
- Verification on the merged target branch:
  - Core focused suite: 70 tests, 0 failures, 487 expectations.
  - Registration suite in isolated process: 4 tests, 0 failures, 8 expectations.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core; bun run typecheck`: passed.
  - `cd apps/electron; bun run typecheck`: passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - `bun run lint:i18n:sorted`: passed after normalizing working-tree line endings with `bun run sort-locales`; Git confirmed no actual locale content diff.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1484 keys each.
  - `python -m json.tool feature_list.json` and `git diff --check`: passed after this record update.
- Current progress:
  - Current branch: `codex/stock-002-sqlite-storage`.
  - `stock-001` through `stock-004` are locally integrated and marked passing.
  - The combined target branch has not been pushed in this session.
- Known risk/blocker:
  - The local target branch is ahead of `origin/codex/stock-002-sqlite-storage`; the user will push manually if desired.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 028

- Date: 2026-06-21
- Goal: Resume from persistent state and verify the completed combined branch before handoff.
- Completed:
  - Restored context from `claude-progress.md`, `feature_list.json`, `session-handoff.md`, recent commits, and the Watchlist implementation plan.
  - Confirmed the normal repository workspace is clean on `codex/stock-002-sqlite-storage`.
  - Confirmed local `HEAD`, the cached tracking ref, and the live remote branch `origin/codex/stock-002-sqlite-storage` all point to `f5c90cd`.
  - Confirmed every feature in `feature_list.json` is marked `passing`; no unstarted feature remains, so no new implementation was opened without a product decision.
  - Reproduced the documented Bun cross-file mock-state failure when the two registration test files run in one invocation, then confirmed each file passes in its own process.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - Core focused suite: 64 tests, 0 failures, 477 expectations.
  - `registration.test.ts` in its own process: 2 tests, 0 failures.
  - `registration-profiles.test.ts` in its own process: 2 tests, 0 failures.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core; bun run typecheck`: passed.
  - `cd apps/electron; bun run typecheck`: passed.
  - `bun run lint:i18n:sorted`: passed.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1484 keys each.
  - `python -m json.tool feature_list.json`: passed after record edits.
  - `git diff --check`: passed after record edits with only expected Windows line-ending warnings.
- Current progress:
  - Current branch: `codex/stock-002-sqlite-storage`.
  - `stock-001` through `stock-004` are integrated, verified, and present on the remote branch at `f5c90cd`.
  - The next action requires a product/integration choice: merge toward `main`, open/update a PR, keep the branch, or define the next feature.
- Known risk/blocker:
  - Running `registration.test.ts` and `registration-profiles.test.ts` together in one Bun invocation still shares mock registration state and yields a timeout/cross-profile false negative; each file passes independently.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 029

- Date: 2026-06-21
- Goal: Merge the completed StockCraft branch into local `main` and leave pushing to the user.
- Completed:
  - Confirmed `codex/stock-002-sqlite-storage` was clean at `71cb02b`.
  - Switched to `main` and fast-forwarded it from `3fb97d8` to current `origin/main` at `a6df0e6`.
  - Merged `codex/stock-002-sqlite-storage` into local `main` with merge commit `e9f2044`; no merge conflicts occurred.
  - Investigated the post-merge locale sorted-check failure. The Git index contained LF while the Windows working tree contained CRLF; running the standard locale sorter produced no Git content diff, refreshed the index, and restored a clean sorted check.
  - Did not push any branch.
- Verification on merged `main`:
  - StockCraft focused suite: 94 tests, 0 failures, 546 expectations.
  - `registration.test.ts` in its own process: 2 tests, 0 failures.
  - `registration-profiles.test.ts` in its own process: 2 tests, 0 failures.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core; bun run typecheck`: passed.
  - `cd apps/electron; bun run typecheck`: passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
  - `bun run lint:i18n:sorted`: passed after line-ending normalization with no locale content diff.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1484 keys each.
  - `python -m json.tool feature_list.json`: passed after final record edits.
  - `git diff --check`: passed after final record edits with only expected Windows line-ending warnings.
- Current progress:
  - Current branch: `main`.
  - `stock-001` through `stock-004` are locally integrated into `main`.
  - Local `main` has not been pushed; the user requested the push command for manual execution.
- Known risk/blocker:
  - The two registration test files must still run in separate Bun processes to avoid their known shared mock-state false negative.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 030

- Date: 2026-06-21
- Goal: Define the missing v1 automatic research persistence closure as `stock-005`.
- Completed:
  - Confirmed `origin/main` contains the locally integrated StockCraft work at `c650775`.
  - Verified all previously listed features were `passing`, then identified the missing production call path from completed research messages to `saveStockResearchReport`.
  - User selected visible failure with Retry Save, and selected retry behavior that first reparses the existing final reply before asking the Agent to regenerate a compliant report.
  - User approved the service-side completion hook plus strict Markdown parsing approach.
  - Created branch `codex/stock-005-auto-persistence`.
  - Added `stock-005` as the only `in_progress` feature in `feature_list.json`.
  - Created `docs/superpowers/specs/2026-06-21-stock-005-auto-persistence-design.md`.
- Current progress:
  - The written design is ready for user review.
  - No production implementation has started; the next step after approval is a detailed TDD implementation plan.
- Known risk/blocker:
  - The current `createRun` handler persists the research run only after `sendMessage()` returns; implementation must reverse this order so the completion hook can find the run.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 031

- Date: 2026-06-21
- Goal: Implement and verify `stock-005`, automatic persistence of completed StockCraft research.
- Completed:
  - Created isolated worktree `C:\craft_agents\.worktrees\stock-005-auto-persistence` on branch `codex/stock-005-auto-persistence`.
  - Added a strict shared Markdown parser for the five required research sections and disclaimer, plus a canonical repair prompt.
  - Added transactional, idempotent completion storage: five step outputs, one report per run, and completed run state are persisted atomically.
  - Added an instance-level SessionManager final-assistant-message listener that fires only for a new final message on successful completion and isolates listener failures.
  - Added `StockResearchPersistenceCoordinator` for automatic save, parse failure recording, transactional failure recording, parse-first retry, and asynchronous regeneration fallback.
  - Changed `stockResearch:createRun` to persist and mark the run running before starting the Agent; initial send failures now persist a failed run.
  - Added `stockResearch:getRunBySession` and `stockResearch:retryPersistence` through protocol, routing, server handlers, ElectronAPI, and channel map.
  - Wired the coordinator into both Electron main and the standalone headless server.
  - Added stale-safe renderer status loading and a localized Retry Save / regenerating banner in Stock Research sessions.
  - Made the legacy `saveReport` RPC idempotent per run to remain compatible with the new unique report constraint.
  - Updated `init.ps1` and `init.sh` to recognize linked Git worktrees through `git rev-parse`.
  - Marked `stock-005` as `passing`.
- TDD record:
  - Parser tests first failed because `research-report.ts` was missing.
  - Storage tests first failed because run lookup/status and completion methods were missing.
  - Final-message listener tests first failed because the subscription boundary was missing.
  - Coordinator tests first failed because the coordinator was missing; later regression tests reproduced SQLite failure recording and legacy save idempotency before fixes.
  - Renderer helper tests first failed because persistence-state helpers were missing.
- Verification:
  - Focused suite: 73 tests, 0 failures, 517 expectations.
  - `registration.test.ts` in its own process: 2 tests, 0 failures.
  - `registration-profiles.test.ts` in its own process: 2 tests, 0 failures.
  - `bun run typecheck:shared`: passed.
  - `cd packages/server-core; bun run typecheck`: passed.
  - `cd apps/electron; bun run typecheck`: passed.
  - `cd packages/server; bun run typecheck`: passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed from the linked worktree and correctly displayed recent commits.
  - `bun run lint:i18n:sorted`: passed.
  - `bun run lint:i18n:parity`: passed with 6 locales and 1488 keys each.
  - `python -m json.tool feature_list.json`: passed after final record edits.
  - `git diff --check`: passed after final record edits with only expected Windows line-ending warnings.
- Environment note:
  - Initial `bun install --frozen-lockfile` in the new worktree was blocked by a GitHub API 403 in `@vscode/ripgrep` postinstall. `bun install --frozen-lockfile --ignore-scripts` completed, and all required tests/typechecks passed without that optional binary download.
- Current progress:
  - `stock-005` is `passing`; all features currently listed in `feature_list.json` are passing.
  - Current branch: `codex/stock-005-auto-persistence`.
  - Worktree: `C:\craft_agents\.worktrees\stock-005-auto-persistence`.
  - The branch has not been pushed or merged.
- Known risk/blocker:
  - Registration coverage files can still exceed their 5-second timeout and contaminate shared mock state when run concurrently with heavy typechecks; each file passes consistently in its own process.
  - On this Windows machine, `bash ./init.sh` remains unavailable because the WSL `/bin/bash` path is missing; use `init.ps1`.

### Session 032

- Date: 2026-06-21
- Goal: Locally merge the completed automatic persistence feature into `main`.
- Completed:
  - Confirmed local `main` matched `origin/main` before integration.
  - Fast-forward merged `codex/stock-005-auto-persistence` into local `main` at `fcad437`; no conflicts occurred.
  - Re-ran post-merge verification on `main`.
  - Removed the owned worktree at `C:\craft_agents\.worktrees\stock-005-auto-persistence`, pruned its Git registration, and deleted the merged local feature branch.
  - Did not push `main`; the user requested the push command for manual execution.
- Post-merge verification:
  - Focused suite: 73 tests, 0 failures, 517 expectations.
  - `registration.test.ts`: 2 tests, 0 failures after warm standalone rerun.
  - `registration-profiles.test.ts`: 2 tests, 0 failures.
  - shared, server-core, Electron, and headless server typechecks: passed.
  - `init.ps1`: passed.
  - i18n sorted/parity: passed with 6 locales and 1488 keys each.
  - `feature_list.json` and `git diff --check`: passed before this record update.
- Current progress:
  - Current branch: `main`.
  - All listed StockCraft v1 features are integrated locally and marked `passing`.
  - Local `main` has not been pushed.
- Known risk/blocker:
  - The first cold standalone registration test on the main checkout took over 30 seconds and exceeded its fixed 5-second timeout; an immediate standalone rerun passed in 1.47 seconds. This remains a test-harness cold-start issue, not a product failure.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 033

- Date: 2026-06-21
- Goal: Fix `bun run electron:dev` failing to bundle `bun:sqlite`.
- Root cause:
  - `StockStorageService` directly imported Bun's `bun:sqlite`, but the Electron main process is bundled for and executed by Electron 39's Node 22.21.1 runtime.
  - Marking `bun:sqlite` external would only move the failure from build time to app startup because Electron cannot load Bun built-ins.
- Completed:
  - Extracted the existing storage SQL and behavior into runtime-neutral `StockStorageServiceBase`.
  - Added a Bun adapter at `@craft-agent/server-core/stock/bun` for the standalone headless server and existing Bun tests.
  - Added a Node adapter at `@craft-agent/server-core/stock/node` using `node:sqlite` for Electron.
  - Updated Electron and headless server composition roots to select the correct adapter.
- Verification:
  - Initial regression: `cd apps/electron; bun run build:main:win` failed on unresolved `bun:sqlite`.
  - Focused suite passed: 25 tests, 0 failures, 97 expectations.
  - `bun run typecheck:shared`, server-core typecheck, Electron typecheck, and headless server typecheck passed.
  - `cd apps/electron; bun run build:main:win` passed and produced `dist/main.cjs`.
  - Electron runtime smoke under Node 22.21.1 created the five-table schema with `node:sqlite` and inserted/listed an AAPL watchlist item.
  - `bun run electron:dev` reached `App initialized successfully`, created the workspace window, connected the renderer RPC client, and was then shut down cleanly.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` passed.
- Current progress:
  - All features remain `passing`.
  - Current branch: `main`.
- Next best action:
  - Run `bun run electron:dev` normally and continue product-level StockCraft UI validation; no implementation feature is currently marked incomplete.
- Known risk/blocker:
  - Electron logs Node's experimental SQLite warning under Node 22.21.1; functionality is available and verified, but the API remains marked experimental by that runtime.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 034

- Date: 2026-06-21
- Goal: Design complete runtime isolation between the installed Craft Agents app and StockCraft Dev.
- Completed:
  - Created branch `codex/infra-002-instance-isolation`.
  - Added `infra-002` as the only `in_progress` feature.
  - Audited instance boundaries and confirmed `CRAFT_CONFIG_DIR` currently covers only part of the application.
  - Identified production hard-coded paths affecting credentials, workspaces, docs, release notes, StockCraft SQLite, window state, messaging, audit logs, network interception, and headless server paths.
  - Confirmed Electron does not currently set a separate `userData` path before main-process modules load.
  - Created `docs/superpowers/specs/2026-06-21-infra-002-instance-isolation-design.md`.
- Design decision:
  - Installed original remains unchanged at `~/.craft-agent`.
  - Local development defaults to `StockCraft Dev`, `~/.stockcraft-dev`, a separate Electron userData directory, and `stockcraft-dev://`.
  - No automatic migration or credential sharing.
- Current progress:
  - Spec is ready for user review.
  - No production implementation has started.
- Next best action:
  - After user approval, create the TDD implementation plan for `infra-002`.
- Known risk/blocker:
  - Several modules capture paths at import time, so implementation needs an Electron bootstrap entry that sets the instance identity before dynamically importing the existing main process.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 035

- Date: 2026-06-21
- Goal: Convert the approved `infra-002` design into an executable TDD plan.
- Completed:
  - User approved `docs/superpowers/specs/2026-06-21-infra-002-instance-isolation-design.md`.
  - Mapped the implementation boundaries across shared config, Electron bootstrap/build entry points, server storage paths, child-process environments, packaging, and dual-instance verification.
  - Created `docs/superpowers/plans/2026-06-21-infra-002-instance-isolation.md`.
  - Split implementation into nine independently verifiable tasks with red/green commands and frequent commits.
- Current progress:
  - `infra-002` remains `in_progress`.
  - No production implementation has started.
- Next best action:
  - Execute the plan with subagent-driven development, beginning with the centralized instance configuration task.
- Known risk/blocker:
  - Dual-instance verification will interact with the user's installed Craft Agents process and must preserve its data; implementation tests must use temporary directories until the final explicit smoke test.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 036

- Date: 2026-06-22
- Goal: Implement infra-002 Task 3, bootstrapping Electron instance identity before business imports.
- Completed:
  - Added `apps/electron/src/main/bootstrap.ts` with a dependency-injected `configureElectronInstance` helper.
  - The helper sets the Electron app name, conditionally sets `userData`, and only then dynamically loads the existing main implementation.
  - Added focused order coverage, including production defaults where `electronUserDataDir` is null and `setPath` must not run.
  - Removed the late `app.setName` call from `apps/electron/src/main/index.ts`.
  - Switched one-shot development, watch mode, root main build, Win32 build, Electron package scripts, and the legacy Windows package build script from `index.ts` to `bootstrap.ts`.
  - Kept the generated CJS bundle free of top-level await; bootstrap failures log `Failed to bootstrap Electron instance:` and exit Electron with code 1.
- TDD record:
  - RED: `bun test apps/electron/src/main/__tests__/bootstrap-order.test.ts` failed because `../bootstrap` did not exist.
  - GREEN: the same focused command passed with 2 tests and 0 failures after the minimal bootstrap implementation.
- Verification:
  - Task 1 baseline: `bun test packages/shared/src/config/__tests__/instance.test.ts` passed with 14 tests.
  - Task 2 baseline: `bun test scripts/electron-instance.test.ts` passed with 15 tests.
  - `cd apps/electron; bun run typecheck`: passed.
  - `cd apps/electron; bun run build:main:win`: passed and produced `dist/main.cjs`.
  - `bun run electron:build:main`: passed and verified the root main-process bundle.
  - Build-entry grep found no `main/index.ts` references under active build/watch scripts; remaining references are documentation, tests, or resource guidance only.
- Current progress:
  - `infra-002` remains `in_progress`; Task 3 is complete and Task 4 is next.
  - Current branch: `codex/infra-002-instance-isolation-impl`.
- Known risk/blocker:
  - No GUI was launched for this task, per instruction; final dual-instance behavior remains part of the later explicit acceptance task.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.

### Session 037

- Date: 2026-06-22
- Goal: Implement infra-002 Task 4, routing shared runtime storage through the centralized instance config directory.
- Completed:
  - Added a subprocess regression test that loads production modules with a temporary `CRAFT_CONFIG_DIR`.
  - Routed default workspaces, docs, release notes, encrypted credentials, interceptor config/log/API-error fallback, provider-domain logo cache, browser prerequisite docs, and app permissions through `CONFIG_DIR`.
  - Exported only the production constants/accessors needed to inspect those real paths.
  - Kept secure-storage `homedir()` usage only for machine-key derivation, not filesystem placement.
- TDD record:
  - RED: `bun test packages/shared/src/config/__tests__/instance-path-consumers.test.ts` failed because workspace and interceptor paths still resolved under `C:\Users\-\.craft-agent`, while the remaining required path exports/accessors were absent.
  - GREEN: the same focused test passed with 1 test and 0 failures after the minimal path changes.
- Verification:
  - Tasks 1-3 baselines passed: instance config 14 tests, Electron instance launcher 15 tests, Electron bootstrap 4 tests.
  - Focused Task 4 suite passed: 18 tests, 0 failures across the new subprocess test, instance config, interceptor behavior, and interceptor packaging contract.
  - `bun run typecheck:shared`: passed.
  - `git diff --check`: passed with only expected Windows line-ending warnings.
  - Permissions migration assertions passed, but its standalone Windows cleanup still exits with `EBUSY` because the test removes the directory that remains its current working directory.
  - The same-process permissions CLI flag test still mutates `CRAFT_CONFIG_DIR` after importing the module; Task 4 intentionally captures `CONFIG_DIR` at module load, so path-isolation coverage now uses subprocesses.
- Current progress:
  - `infra-002` remains `in_progress`; Tasks 1-4 are complete and Task 5 is next.
  - Current branch: `codex/infra-002-instance-isolation-impl`.
- Known risk/blocker:
  - Permissions tests that need different `CRAFT_CONFIG_DIR` values must load the module in separate subprocesses.
  - On this Windows machine, use `init.ps1`; the WSL `/bin/bash` path remains unavailable.
