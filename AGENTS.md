# AGENTS.md

本仓库面向长时运行的 coding agent 工作流。目标不是尽快写代码，而是保证每一轮会话结束后，下一轮会话仍然能从持久化文件中无猜测地继续工作。

## 开工流程

写代码或修改实现前必须先做这些事：

1. 用 `pwd` 或 `Get-Location` 确认当前目录。
2. 读取 `claude-progress.md`，了解最新已验证状态、当前 blocker 和下一步。
3. 读取 `feature_list.json`，选择优先级最高且未完成的功能。
4. 用 `git log --oneline -5` 查看最近提交；如果当前目录还不是 git 仓库，必须记录为 blocker。
5. 运行标准启动入口：Unix/Git Bash 环境运行 `bash ./init.sh`；Windows 且没有 Bash 时运行 `powershell -ExecutionPolicy Bypass -File .\init.ps1`。如果两个入口都无法运行，必须记录实际失败原因。
6. 在开始新功能前，先跑必要的 smoke test 或端到端验证。

如果基础验证一开始就失败，先修基础状态，不要在坏的起点上继续叠新功能。

## 工作规则

- 一次只做一个功能。
- 不要因为“代码已经写了”就把功能标记为完成。
- 除非为了消除当前 blocker 的窄范围修复，否则不要扩大到其他功能。
- 实现过程中不要悄悄削弱验证规则。
- 优先依赖仓库里的持久化文件，而不是聊天记录。
- 修改代码前必须确认当前工作区状态；不得覆盖用户未提交的改动。
- 如果遇到不确定的产品决策，先更新 Spec 或提出明确问题，不要擅自扩大范围。

## 必需文件

- `feature_list.json`：功能状态的唯一事实来源。
- `claude-progress.md`：会话进度、验证结果、当前 blocker 和下一步。
- `init.sh`：Unix/Git Bash 的统一启动与验证入口。
- `init.ps1`：Windows PowerShell 的等价启动与验证入口。
- `clean-state-checklist.md`：收尾前检查清单。
- `session-handoff.md`：较长会话或上下文压缩前的交接摘要。

## 完成定义

一个功能只有在以下条件都满足时才算完成：

- 目标用户可见行为已经实现。
- 要求的验证真的跑过，并且结果记录清楚。
- 证据记录在 `feature_list.json` 或 `claude-progress.md`。
- 仓库仍然能按当前平台的标准启动路径重新开始工作。
- 若涉及产品规格，Spec 与实现没有明显冲突。

## 收尾流程

结束会话前必须：

1. 更新 `claude-progress.md`。
2. 更新 `feature_list.json`。
3. 记录仍未解决的风险或 blocker。
4. 跑适合当前阶段的验证；如果无法运行，记录原因。
5. 在工作处于安全状态后，用清晰的提交信息提交；如果当前目录不是 git 仓库，记录无法提交的原因。
6. 保证下一轮会话知道如何处理 `init.sh`/`init.ps1` 的当前状态。
