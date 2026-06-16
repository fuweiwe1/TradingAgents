# Session Handoff

## 当前上下文

- 项目目标：基于 Craft Agents OSS 套壳/扩展为股票研究桌面工作台，工作名 `StockCraft`。
- 当前阶段：`stock-001` 单股研究五步流已通过；`stock-002` 本地 SQLite 存储已通过；下一步进入 `stock-003` 独立 Reports 中心。
- 用户已确认的关键架构决策：
  - 产品形态：Craft Agents 内核 + 股票研究工作台。
  - 用户定位：个人投资研究。
  - 市场范围：A股 + 港股 + 美股。
  - 主流程：单股研究报告。
  - UI 布局：研究步骤流为主，会话辅助。
  - 智能体流程：五步标准流。
  - LLM：复用 Craft Agents 现有 LLM connection 系统；v1 只使用单连接默认模型。
  - 数据源：Source 优先，由 Agent 调用 Source 工具。
  - 存储：新增本地 SQLite；当前实现使用 Bun 内置 `bun:sqlite`。
  - 会话模型：一只股票一次研究对应一个 Craft session。

## 当前状态

- `C:\craft_agents` 是 git 仓库，当前分支为 `codex/stock-002-sqlite-storage`。
- 当前仓库已经合入 Craft Agents OSS 代码基线，并配置 `upstream` fetch 为 `https://github.com/craft-ai-agents/craft-agents-oss.git`，push 为 `DISABLED`。
- 已安装 Bun `1.3.10` 到 `C:\Users\-\.bun\bin\bun.exe`，与仓库 CI 配置一致。
- Windows 标准入口 `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` 已通过。
- 当前环境运行 `bash ./init.sh` 仍失败，WSL 中缺少 `/bin/bash`；Windows 当前继续使用 `init.ps1`。
- `stock-001` 已标记为 `passing`：A股/港股/美股输入可创建一个 `Stock Research: ...` Craft session，UI 可发起并在会话内展示五步状态。
- `stock-002` 已标记为 `passing`：
  - `packages/server-core/src/stock/StockStorageService` 初始化 `stock_symbols`、`watchlist_items`、`research_runs`、`research_steps`、`research_reports` 五张表。
  - Watchlist 支持新增、查询、删除。
  - Research run 支持创建，并自动初始化五个 pending steps。
  - Research report 支持保存、列表查询、详情打开。
  - `stockResearch:createRun` 返回 `runId` 并持久化关联 Craft session id 的 research run。
  - 新增 RPC：`stockResearch:addWatchlistItem`、`stockResearch:listWatchlistItems`、`stockResearch:removeWatchlistItem`、`stockResearch:saveReport`、`stockResearch:listReports`、`stockResearch:getReport`。
  - Renderer 只通过 `ElectronAPI` / RPC 访问股票存储，不直接访问 SQLite。
- SQLite 数据库当前由 Electron main 与 headless server 注入到 server-core，路径为 `~/.craft-agent/stockcraft.sqlite`。
- `better-sqlite3` 曾按原计划尝试安装，但本机两次 `bun add better-sqlite3 @types/better-sqlite3` 超时，且探针报原生 binding 缺失；本轮使用 `bun:sqlite` 保持可验证。

## 最近验证

- `bun test packages/server-core/src/stock/stock-storage.test.ts`：通过，3 tests。
- `bun test packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts`：通过，13 tests。
- `bun test apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts`：通过，9 tests。
- focused 收尾复验：`bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts`：通过，25 tests。
- `bun test apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts`：通过，2 tests。
- `bun run typecheck:shared`：通过。
- `cd packages/server-core && bun run typecheck`：通过。
- `cd apps/electron && bun run typecheck`：通过。
- `python -m json.tool feature_list.json`：通过。
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`：通过。
- `git diff --check`：通过，仅有 Windows LF/CRLF 提醒。

## 下一步建议

1. 继续 `stock-003`：实现独立 Reports 中心，复用 `stockResearch:listReports` / `stockResearch:getReport`。
2. 如果 Reports 中心需要按 workspace 隔离数据，先在 `stock-002` 存储层加 `workspace_id` 或改成 workspace-scoped database，再接 UI。
3. Watchlist 独立页面属于 `stock-004`，不要在 `stock-003` 中扩大范围。
4. 注意：`bun run typecheck:all` 当前有上游基线问题，后续切片验证以 focused tests、相关 package typecheck、`typecheck:shared` 和 `init.ps1` 为准，除非专门修复全量 typecheck。
