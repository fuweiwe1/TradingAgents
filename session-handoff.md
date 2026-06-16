# Session Handoff

## 当前上下文

- 项目目标：基于 Craft Agents OSS 套壳/扩展为股票研究桌面工作台，工作名 `StockCraft`。
- 当前阶段：正式实现前的 Spec 与工作流约束准备。
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

- `C:\craft_agents` 是 git 仓库，当前分支为 `main`。
- 当前仓库已经合入 Craft Agents OSS 代码基线，并配置 `upstream` fetch 为 `https://github.com/craft-ai-agents/craft-agents-oss.git`，push 为 `DISABLED`。
- 已安装 Bun `1.3.10` 到 `C:\Users\-\.bun\bin\bun.exe`，与仓库 CI 配置一致。
- `bun.lock` 已对齐当前 workspace：版本为 `0.10.3`，已移除不存在的 `apps/marketing`、`packages/craft-cli`、`packages/craft-agents-commands` 条目。
- Windows 标准入口 `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1` 已通过。
- 当前环境运行 `bash ./init.sh` 仍失败，WSL 中缺少 `/bin/bash`；Windows 当前继续使用 `init.ps1`。
- `bun install --frozen-lockfile` 已通过。
- `bun run typecheck:shared` 已通过。

## 下一步建议

1. 开始 `stock-001`：实现单股研究五步流。
2. 先定位现有 LLM connection 默认模型读取路径和 Craft session 创建路径。
3. 设计最小研究 run 数据模型与入口，确保一只股票一次研究关联一个 Craft session。
4. 实现前先为股票代码识别和 run 创建补验证：`600519`、`00700.HK`、`AAPL`。
