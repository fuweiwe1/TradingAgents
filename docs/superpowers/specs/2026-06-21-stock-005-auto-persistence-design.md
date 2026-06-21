# StockCraft 自动持久化研究结果设计

## 1. 目标

`stock-005` 补齐 StockCraft v1 的最后一个端到端闭环：股票研究会话完成后，系统自动识别规范的五步研究输出，将每一步结果和最终报告持久化到本地 SQLite，并让报告立即出现在 Reports 中。

用户不需要手动复制报告或调用保存动作。保存失败不能丢失研究会话内容，但必须在原会话中明确显示失败状态和“重试保存”入口。

## 2. 范围

### 2.1 In Scope

- 调整研究 run 创建顺序，确保 Agent 开始执行前 run 已存在。
- 强化初始提示词，要求最终回复使用固定五步 Markdown 标题并包含免责声明。
- 在服务端监听最终 assistant 消息完成事件。
- 从最终消息解析五步 Markdown 章节。
- 原子持久化五步输出、run 状态和最终报告。
- 同一个 run 重复收到完成事件时更新原报告，不创建重复报告。
- 解析失败时记录持久化失败原因。
- 在研究会话中展示保存失败和“重试保存”。
- 重试时先重新解析现有最终回复；仍不完整时，向原 Craft session 发送规范化修复提示，让 Agent 重新生成报告。
- Electron 和 headless server 使用同一套服务端持久化协调器。

### 2.2 Out of Scope

- 新增 Agent 工具或要求 Agent 主动调用保存工具。
- 新增独立队列、后台任务系统或跨进程消息总线。
- 自动交易、实时行情、云同步。
- 对旧的任意自由格式会话做复杂 NLP 恢复。
- 在 Reports 中保存不完整或缺少免责声明的报告。

## 3. 方案比较

### 3.1 服务端完成钩子 + 规范 Markdown 解析（采用）

SessionManager 在一次 turn 真正完成且产生新的最终 assistant 消息后，调用实例级完成监听器。StockCraft 协调器按 `sessionId` 查找 research run、解析消息并写入 SQLite。

优点：

- Electron 窗口关闭、切换页面或使用 headless server 时仍能保存。
- 复用现有 Craft session 生命周期，不把业务可靠性放在 renderer。
- 可以同步更新 run、steps 和 report，保证一致性。
- 改动集中、可测试，不需要引入 Agent 工具权限流程。

代价：

- 需要为 SessionManager 增加一个通用、实例级的完成监听边界。
- 最终回复必须遵守明确的 Markdown 契约。

### 3.2 Agent 主动调用保存工具（不采用）

结构化程度最高，但需要新增工具定义、权限、调用失败恢复和模型行为约束。对 v1 闭环来说范围过大。

### 3.3 Renderer 监听消息并保存（不采用）

实现较快，但窗口关闭、页面卸载、远端客户端或 headless 模式都可能漏保存，不满足持久化可靠性要求。

## 4. 最终回复契约

初始研究提示词要求最终 assistant 消息至少包含以下五个二级 Markdown 标题，顺序固定：

```markdown
## 数据收集
...

## 分析师观点
...

## 牛熊辩论
...

## 风险审查
...

## 报告生成
...

本内容仅供研究参考，不构成投资建议。
```

解析规则：

- 标题允许前后空白，但标题文字必须准确匹配。
- 每个章节必须包含非空正文。
- 五个章节必须按标准顺序出现。
- 最终消息必须包含完整免责声明“本内容仅供研究参考，不构成投资建议”。
- `contentMarkdown` 保存完整最终消息。
- `summary` 取“报告生成”章节的第一段非空文本，限制为适合列表展示的长度。
- `title` 使用“股票展示代码 + 研究报告”的稳定格式。
- `rating` 和 `riskLevel` 仅在能从规范字段中明确提取时写入，否则为 `null`；它们不阻塞保存。

不满足以上必需规则时，解析返回结构化错误，不产生残缺报告。

## 5. 服务端架构

### 5.1 SessionManager 完成监听边界

为 `ISessionManager` / `SessionManager` 增加实例级订阅方法，监听一次 turn 的最终完成：

```ts
subscribeToFinalAssistantMessage(
  listener: (event: {
    sessionId: string
    workspaceId: string
    messageId: string
    content: string
  }) => Promise<void> | void,
): () => void
```

触发条件：

- processing stop 原因为 `complete`。
- 本 turn 产生了新的 final、非 intermediate assistant message。
- 在向 UI 发出最终 `complete` 事件前等待监听器完成。

监听器失败不得破坏 SessionManager 的清理流程。SessionManager 记录异常并继续完成会话；StockCraft 协调器负责把业务失败写入 research run。

使用实例级订阅而不是现有 module-level runtime hooks，避免多个 SessionManager 实例或测试之间共享业务监听状态。

### 5.2 StockResearchPersistenceCoordinator

在 `server-core` 股票域新增协调器，职责单一：

- 接收最终 assistant 消息。
- 按 `sessionId` 查找 research run；非股票研究 session 直接忽略。
- 调用纯解析器。
- 成功时调用 storage 原子保存。
- 失败时将 run 标记为 `failed` 并记录可展示错误。
- 实现手动重试流程。

Electron main 和 headless server 在创建 handler dependencies 时，各自创建一次协调器并订阅当前 SessionManager。

### 5.3 创建顺序

当前 `createRun` 在 `sendMessage()` 返回后才写入 research run，这会使完成监听器找不到 run。新顺序必须是：

1. 创建 Craft session。
2. 创建 research run 和五个 pending steps。
3. 将 run 标记为 `running`。
4. 发送初始研究提示。
5. 返回 `runId` / `sessionId`。

如果发送初始消息失败，将 run 标记为 `failed` 并保留错误信息，然后继续抛出原错误。

## 6. 存储与幂等性

`StockStorage` 新增以下领域操作：

- `getResearchRunBySessionId(sessionId)`
- `markResearchRunRunning(runId)`
- `markResearchPersistenceFailed(runId, message)`
- `saveCompletedResearch(input)`

`saveCompletedResearch` 使用一个 SQLite transaction：

1. 更新五个 `research_steps`：
   - `status = completed`
   - `output_markdown = 对应章节正文`
   - 设置 `started_at` / `completed_at`
2. 按 `run_id` 查找已有 report：
   - 已存在则 update。
   - 不存在则 insert。
3. 更新 `research_runs`：
   - `status = completed`
   - `completed_at = now`
   - `error_message = null`

幂等规则：

- 同一个 run 最多保留一份最终报告。
- 重复完成事件更新现有 report，不增加列表重复项。
- 解析失败不覆盖已有的成功报告。
- 已完成 run 若收到相同消息，可安全重复执行。

## 7. 重试流程

新增 RPC：

- `stockResearch:getRunBySession`
- `stockResearch:retryPersistence`

`retryPersistence(workspaceId, sessionId)` 的流程：

1. 查找 session 对应 run。
2. 读取该 session 最新的 final assistant 消息。
3. 立即尝试重新解析并保存。
4. 如果成功，返回 `completed`。
5. 如果仍然缺少章节或免责声明：
   - 将 run 状态改为 `running` 并清除旧错误。
   - 向同一 session 发送修复提示，要求基于现有研究内容重新输出完整规范报告。
   - 新回复完成后由同一个自动完成钩子保存。
   - RPC 返回 `regenerating`。

为了避免重复生成：

- run 已是 `running` 且 session 正在处理时，重试 RPC 返回当前状态，不再次发送消息。
- UI 在请求进行中禁用重试按钮。

## 8. UI 行为

股票研究会话在停止处理后查询该 session 对应的 research run：

- `completed`：五步面板显示完成，不显示保存警告。
- `created` / `running`：显示现有研究状态，不显示失败警告。
- `failed` 且存在 persistence error：在五步面板附近显示：
  - “研究已完成，但报告保存失败。”
  - 精简错误说明。
  - “重试保存”按钮。

点击重试：

- 按钮进入 loading/disabled。
- RPC 返回 `completed` 时立即刷新状态。
- RPC 返回 `regenerating` 时显示“正在重新生成规范报告”，等待 session 完成事件后再次刷新。
- RPC 本身失败时保留按钮并显示可重试错误。

不新增独立页面，不改变 Reports 页面信息架构。

## 9. 错误处理

- 非股票研究 session：完成监听器静默忽略。
- 找不到 run：记录诊断日志，不创建孤立报告。
- 解析失败：run 标记为 `failed`，保留研究会话原文。
- SQLite transaction 失败：回滚 steps/report/run 更新，并记录失败。
- 修复提示发送失败：run 保持 `failed` 并记录发送错误。
- 保存失败不会把 Craft session 标记为失败，也不会删除消息。
- Reports 只显示成功保存的完整报告。

## 10. 测试边界

### 10.1 纯解析器

- 正确解析五步章节和免责声明。
- 缺少任一章节时失败。
- 章节为空时失败。
- 顺序错误时失败。
- 缺少免责声明时失败。
- 正确派生 title、summary 和可选风险字段。

### 10.2 存储

- 按 sessionId 查找 run。
- 原子保存五步、report 和 run 完成状态。
- 同一 run 二次保存更新同一 report。
- transaction 失败不留下部分完成状态。
- 失败状态和重试 running 状态可持久化。

### 10.3 完成协调器

- 非研究 session 被忽略。
- 规范消息自动保存。
- 解析失败记录 failure。
- 重试先解析现有消息。
- 现有消息仍无效时发送修复提示。
- 已在处理时不会重复发送修复提示。

### 10.4 SessionManager

- 仅对本 turn 新产生的 final assistant message 触发监听器。
- intermediate 消息不触发。
- interrupted/error/timeout 不触发。
- 监听器异常不阻塞会话完成事件。

### 10.5 Renderer

- failed 状态显示重试。
- completed 状态隐藏重试。
- 重试 loading 和 regenerating 状态正确。
- workspace/session 切换时旧请求结果不能污染当前页面。

## 11. 完成定义

`stock-005` 只有在以下条件全部满足时才能标记为 `passing`：

- 新研究 run 在 Agent 执行前已经持久化。
- 规范最终回复会自动写入五步结果和单一报告。
- Reports 中能打开自动保存的报告并跳回原 session。
- 缺少章节或免责声明时不会保存残缺报告。
- 保存失败在原会话中可见，并提供“重试保存”。
- 重试会先解析现有回复，必要时让 Agent 重新生成规范报告。
- Electron 和 headless server 都完成协调器接线。
- focused tests、shared/server-core/electron typecheck、标准启动、i18n、JSON 和 diff 检查全部通过并记录证据。

