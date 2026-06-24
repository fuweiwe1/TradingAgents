# StockCraft README 重写设计

## 目标

将仓库根目录仍沿用 Craft Agents OSS 的原版 `README.md`，重写为以 StockCraft 为主体的中文项目说明。

新版 README 面向第一次访问 GitHub 仓库的用户和潜在贡献者，需要让读者快速理解：

- StockCraft 是什么。
- 当前已经实现了哪些股票研究能力。
- 如何在本地启动开发预览版。
- 项目与 Craft Agents OSS 的关系。
- 当前成熟度、限制和投资风险边界。

## 定位与语气

- 项目名称：StockCraft。
- 主要语言：中文，命令、代码标识和必要的技术名词保留英文。
- 成熟度：开发预览版，可本地运行。
- README 类型：产品型 README，同时提供足够的开发入口。
- 不把项目描述为正式发布、生产就绪或投资建议工具。

## 推荐结构

### 1. 标题区

以 `StockCraft` 为主标题，配一段简短定位：

> 基于 AI Agent 的本地股票研究桌面工作台，支持 A 股、港股和美股的五步研究流程。

标题区展示：

- Apache 2.0 License 徽章。
- Development Preview 状态徽章。
- 基于 Craft Agents OSS 的简短说明。

不沿用上游 Trendshift、Craft Agents 宣传视频和原产品截图。

### 2. 项目简介

说明 StockCraft 不是行情终端或自动交易系统，而是围绕单只股票组织研究过程的桌面工作台。

强调：

- 每次研究对应一个可追溯的 Agent 会话。
- 研究步骤和最终报告会保存到本地。
- 复用现有 LLM connection、Sources、MCP 和工具能力。

### 3. 核心功能

以用户可见能力为主：

- A 股、港股、美股代码识别。
- 数据收集、分析师观点、牛熊辩论、风险审查、报告生成五步研究流。
- Watchlist 分组、备注、删除和直接发起研究。
- Reports 历史报告浏览、筛选、详情、返回原会话和 Markdown 导出。
- SQLite 本地持久化。
- 保存失败后的重试和报告重新生成。
- StockCraft Dev 与已安装 Craft Agents 的配置、数据、锁、日志和 Deep Link 隔离。

### 4. 界面工作流

用简短编号描述：

1. 配置可用的 LLM connection。
2. 创建或选择 workspace。
3. 输入股票代码或从 Watchlist 发起研究。
4. 在会话中查看五步进度。
5. 在 Reports 中查看和导出结果。

不添加尚未存在的产品截图，以免 README 展示过期或虚构界面。

### 5. 本地运行

以 Windows 为主要验证平台，同时保留 Unix/Git Bash 入口。

前置条件：

- Git。
- Bun 1.3.x；仓库当前验证版本为 Bun 1.3.10。
- Windows 本地开发建议使用 PowerShell。

启动步骤：

```powershell
git clone https://github.com/fuweiwe1/TradingAgents.git
cd TradingAgents
bun install --frozen-lockfile
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
bun run electron:dev
```

Unix/Git Bash 使用：

```bash
bash ./init.sh
bun run electron:dev
```

README 需说明：

- 当前 GitHub 仓库名仍为 `TradingAgents`，产品名为 StockCraft。
- Windows 环境如果 WSL 缺少 `/bin/bash`，使用 `init.ps1`。
- 开发实例默认使用 `~/.stockcraft-dev`，不会写入原版 `~/.craft-agent`。

### 6. 常用命令

只列当前仓库实际存在且与普通开发者相关的命令：

- `bun run electron:dev`
- `bun run typecheck:shared`
- `bun run typecheck:all`
- `bun run lint:instance-paths`
- `bun run lint:i18n:sorted`
- `bun run lint:i18n:parity`
- `bun run electron:build`
- `bun run electron:dist:stockcraft-dev:win`

不把上游所有脚本完整复制进 README。

### 7. 技术架构

简述已有分层：

- Electron：桌面宿主和本地系统能力。
- React + Vite：渲染器界面。
- server-core：RPC、会话编排和股票领域 handler。
- shared：Agent、LLM connections、Sources、MCP、协议和股票共享契约。
- SQLite：Watchlist、研究 run、步骤和报告持久化。

明确 renderer 不直接访问 SQLite，股票研究继续复用 Craft session。

### 8. 项目目录

仅列关键目录：

- `apps/electron`
- `packages/shared`
- `packages/server-core`
- `packages/server`
- `docs/specs`
- `scripts`

### 9. 项目基础

简短说明：

- StockCraft 基于 Craft Agents OSS `v0.10.3` 代码基线进行垂直改造。
- 保留其 Agent 会话、LLM connection、Sources、MCP、权限和桌面基础能力。
- 上游项目链接指向 `https://github.com/craft-ai-agents/craft-agents-oss`。
- 本仓库新增的核心方向是股票研究流、Watchlist、Reports、本地研究持久化和独立开发实例。

该章节只做来源说明，不继续使用上游产品营销文案。

### 10. 当前状态与限制

明确开发预览版边界：

- 可本地运行，核心 StockCraft v1 流程已有自动化验证。
- 尚未提供正式安装包下载和稳定发布承诺。
- 股票数据质量依赖用户配置的 Sources、MCP 和可用工具。
- 不提供实时行情、券商接入、自动交易或收益保证。
- `node:sqlite` 在当前 Electron Node 运行时仍会显示实验性警告。

### 11. 免责声明与许可证

投资免责声明必须明确：

> StockCraft 生成的内容仅供学习与研究，不构成投资建议、交易建议或收益承诺。使用者应独立核实数据并自行承担决策风险。

许可证部分链接仓库 `LICENSE`，说明采用 Apache License 2.0。

## 验证标准

README 重写完成后至少验证：

- 根标题和首屏主体为 StockCraft，不再以 Craft Agents 为产品名。
- 不再包含上游安装脚本、宣传视频、Trendshift 徽章和原产品截图。
- 所列命令均存在于当前仓库脚本或启动入口中。
- 功能描述与 `feature_list.json` 中已经标记为 `passing` 的能力一致。
- 明确写出开发预览状态、Craft Agents OSS 来源和投资免责声明。
- Markdown 链接与相对文件链接有效。
- `init.ps1` 和 `bun run typecheck:shared` 继续通过。

## 非目标

- 不在本次任务中重命名 GitHub 仓库。
- 不修改 `package.json` 的包名、版本或描述。
- 不制作 Logo、截图、演示视频或发布安装包。
- 不修改产品实现、数据库或 Agent 行为。
- 不把尚未实现的功能写成现有能力。
