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

## 当前 blocker

- `C:\craft_agents` 当前不是 git 仓库。
- 当前环境运行 `bash ./init.sh` 失败，WSL 中缺少 `/bin/bash`；Windows 等价入口 `init.ps1` 已通过。
- 尚未准备 Craft Agents OSS fork 或本地代码工作区。

## 下一步建议

1. 准备 Craft Agents OSS 本地工作区。
2. 在目标环境中优先确认 `bash ./init.sh`；Windows 无 Bash 时使用 `powershell -ExecutionPolicy Bypass -File .\init.ps1`。
3. 将 StockCraft 架构 Spec 落盘到仓库文档目录。
4. 在 Spec 通过后，再写实现计划。
