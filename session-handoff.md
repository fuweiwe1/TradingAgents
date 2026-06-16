# Session Handoff

## 当前上下文

- 项目目标：基于 Craft Agents OSS 套壳/扩展为股票研究桌面工作台，工作名 `StockCraft`。
- 当前阶段：`stock-001` 单股研究五步流实现中，后端入口、首个 UI 发起入口和会话内五步状态展示已完成。
- 用户已确认的关键架构决策：
  - 产品形态：Craft Agents 内核 + 股票研究工作台。
  - 用户定位：个人投资研究。
  - 市场范围：A股 + 港股 + 美股。
  - 主流程：单股研究报告。
  - UI 布局：研究步骤流为主，会话辅助。
  - 智能体流程：五步标准流。
  - LLM：复用 Craft Agents 现有 LLM connection 系统；v1 只使用单连接默认模型。
  - 数据源：Source 优先，由 Agent 调用 Source 工具。
  - 存储：新增本地 SQLite，使用 `better-sqlite3`。
  - 会话模型：一只股票一次研究对应一个 Craft session。

## 当前状态

- `C:\craft_agents` 是 git 仓库，当前分支为 `stock-001-research-run`。
- 当前仓库已经合入 Craft Agents OSS 代码基线，并配置 `upstream` fetch 为 `https://github.com/craft-ai-agents/craft-agents-oss.git`，push 为 `DISABLED`。
- 已安装 Bun `1.3.10` 到 `C:\Users\-\.bun\bin\bun.exe`，与仓库 CI 配置一致。
- `init.ps1` 会在新 PowerShell 尚未刷新 PATH 时自动识别 `$HOME\.bun\bin\bun.exe`。
- `bun.lock` 已对齐当前 workspace：版本为 `0.10.3`，已移除不存在的 `apps/marketing`、`packages/craft-cli`、`packages/craft-agents-commands` 条目。
- Windows 标准入口 `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` 已通过。
- 当前环境运行 `bash ./init.sh` 仍失败，WSL 中缺少 `/bin/bash`；Windows 当前继续使用 `init.ps1`。
- `bun install --frozen-lockfile` 已通过。
- `bun run typecheck:shared` 已通过。
- `packages/server-core` 的 `bun run typecheck` 已通过。
- `stockResearch:createRun` 后端入口已实现：解析 A股/港股/美股代码，创建一个 Craft session，并发送五步研究初始提示词；该入口不传 `model` 或 `llmConnection`，复用 Craft Agents 现有默认 LLM connection。
- 当前功能分支已追踪 `origin/stock-001-research-run`，远端 HEAD 为 `a07b94e`。
- `window.electronAPI.createStockResearchRun` 已接入；左侧栏 `Stock Research` 按钮会打开股票代码输入弹窗，提交后创建研究 session 并导航过去。
- 股票研究会话顶部已接入 `StockResearchStepPanel`，会根据 assistant/plan 消息中的五步标题展示 `pending`、`in_progress`、`completed` 状态。
- `apps/electron` 的 `bun run typecheck` 已通过。

## 下一步建议

1. 继续 `stock-001`：当前可从 UI 发起股票研究，分支为 `stock-001-research-run`。
2. 下一步不要直接做报告持久化；先进入 `stock-002` 的 SQLite 边界，或在 `stock-001` 内补更完整的研究 run 状态来源。
3. 报告持久化应等 `stock-002` SQLite 边界落地后再做。
4. 注意：`bun run typecheck:all` 当前有上游基线问题，本切片验证以 focused tests、`typecheck:shared`、`server-core typecheck` 为准。
