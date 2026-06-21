# StockCraft Automatic Research Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically persist a completed StockCraft five-step research reply into SQLite, expose persistence status in the research session, and let users retry parsing or regenerate a compliant report.

**Architecture:** A pure shared Markdown parser converts the final assistant message into five step outputs and report metadata. An instance-level SessionManager final-message subscription feeds a server-core `StockResearchPersistenceCoordinator`, which performs transactional idempotent storage. Two RPCs expose run status and retry behavior to a small renderer controller and failure banner.

**Tech Stack:** TypeScript, Bun test, Bun SQLite, server-core RPC, Electron React renderer, i18next.

---

## File Structure

- `packages/shared/src/stock/research-report.ts`: pure final-report parser and repair prompt.
- `packages/shared/src/stock/__tests__/research-report.test.ts`: parser contract tests.
- `packages/shared/src/stock/types.ts`: persistence DTOs and parsed report types.
- `packages/server-core/src/stock/stock-storage.ts`: run lookup/status and transactional completion persistence.
- `packages/server-core/src/stock/stock-storage.test.ts`: storage state and idempotency tests.
- `packages/server-core/src/stock/research-persistence.ts`: completion/retry coordinator.
- `packages/server-core/src/stock/research-persistence.test.ts`: coordinator behavior tests.
- `packages/server-core/src/sessions/SessionManager.ts`: instance-level final-message subscription.
- `packages/server-core/src/sessions/final-assistant-message-listener.test.ts`: listener lifecycle tests.
- `packages/server-core/src/handlers/session-manager-interface.ts`: subscription interface.
- `packages/server-core/src/handlers/rpc/stock-research.ts`: create ordering, status, and retry RPCs.
- `packages/server-core/src/handlers/rpc/stock-research.test.ts`: RPC red/green coverage.
- `packages/shared/src/protocol/channels.ts`, `dto.ts`, `routing.ts`: new RPC contracts.
- `apps/electron/src/shared/types.ts`, `transport/channel-map.ts`: renderer API wiring.
- `apps/electron/src/renderer/stock-research/persistence-state.ts`: stale-safe status/retry helpers.
- `apps/electron/src/renderer/stock-research/__tests__/persistence-state.test.ts`: helper tests.
- `apps/electron/src/renderer/stock-research/StockResearchPersistenceBanner.tsx`: failure/regeneration UI.
- `apps/electron/src/renderer/pages/ChatPage.tsx`: load/refresh persistence status.
- `packages/shared/src/i18n/locales/*.json`: persistence UI strings.
- `apps/electron/src/main/index.ts`, `packages/server/src/index.ts`: coordinator bootstrap.

### Task 1: Parse the canonical final research report

**Files:**
- Create: `packages/shared/src/stock/research-report.ts`
- Create: `packages/shared/src/stock/__tests__/research-report.test.ts`
- Modify: `packages/shared/src/stock/types.ts`
- Modify: `packages/shared/src/stock/index.ts`
- Modify: `packages/shared/src/stock/research-run.ts`

- [ ] **Step 1: Write failing parser tests**

Test a valid five-heading report, missing/empty/out-of-order headings, missing disclaimer, summary truncation, and repair prompt contents. The desired API is:

```ts
const result = parseStockResearchReport({
  symbol: parseStockSymbol('AAPL'),
  contentMarkdown: VALID_REPORT,
})
expect(result).toEqual({
  ok: true,
  value: {
    title: 'AAPL 研究报告',
    summary: '维持中性判断。',
    rating: null,
    riskLevel: '中',
    contentMarkdown: VALID_REPORT,
    steps: {
      data_collection: expect.stringContaining('Apple'),
      analyst_views: expect.any(String),
      bull_bear_debate: expect.any(String),
      risk_review: expect.any(String),
      report_generation: expect.any(String),
    },
  },
})
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
bun test packages/shared/src/stock/__tests__/research-report.test.ts
```

Expected: FAIL because `research-report.ts` and parser exports do not exist.

- [ ] **Step 3: Implement the minimal parser**

Use exact `## <title>` line matches in `STOCK_RESEARCH_STEPS` order. Return:

```ts
export type ParseStockResearchReportResult =
  | { ok: true; value: ParsedStockResearchReport }
  | { ok: false; error: string }
```

Require non-empty bodies and the exact disclaimer. Derive summary from the first non-empty paragraph in `report_generation`, cap it at 240 characters, and only extract risk from a `风险等级：低|中|高` line.

Update `buildStockResearchPrompt()` to show the exact required Markdown template and export `buildStockResearchRepairPrompt()`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
bun test packages/shared/src/stock/__tests__/research-report.test.ts packages/shared/src/stock/__tests__/research-run.test.ts
bun run typecheck:shared
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared/src/stock
git commit -m "Add canonical stock report parser"
```

### Task 2: Add transactional run completion storage

**Files:**
- Modify: `packages/server-core/src/stock/stock-storage.ts`
- Modify: `packages/server-core/src/stock/stock-storage.test.ts`
- Modify: `packages/shared/src/stock/types.ts`

- [ ] **Step 1: Write failing storage tests**

Cover:

```ts
expect(service.getResearchRunBySessionId('session-1')?.id).toBe(run.id)
service.markResearchRunRunning(run.id)
service.saveCompletedResearch({
  runId: run.id,
  title: 'AAPL 研究报告',
  summary: '中性判断。',
  rating: null,
  riskLevel: '中',
  contentMarkdown: VALID_REPORT,
  steps: parsedSteps,
})
```

Assert all steps are completed with outputs, the run is completed, and a second save updates the same report ID. Also assert failure/running transitions clear/set `errorMessage`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts
```

Expected: FAIL because the new storage methods do not exist.

- [ ] **Step 3: Implement storage methods**

Add to `StockStorage` and `StockStorageService`:

```ts
getResearchRunBySessionId(sessionId: string): StockResearchRunRecord | null
markResearchRunRunning(runId: string): StockResearchRunRecord
markResearchPersistenceFailed(runId: string, message: string): StockResearchRunRecord
saveCompletedResearch(input: SaveCompletedStockResearchInput): StockResearchReport
```

Add a unique index on `research_reports(run_id)` for new and existing databases. Use one SQLite transaction to upsert the report, update all five steps, and complete the run.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts
cd packages/server-core; bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/server-core/src/stock packages/shared/src/stock/types.ts
git commit -m "Persist completed stock research atomically"
```

### Task 3: Expose final assistant message completion

**Files:**
- Modify: `packages/server-core/src/handlers/session-manager-interface.ts`
- Modify: `packages/server-core/src/sessions/SessionManager.ts`
- Create: `packages/server-core/src/sessions/final-assistant-message-listener.test.ts`

- [ ] **Step 1: Write failing listener tests**

Use a small exported listener registry helper to prove:

- subscribe/unsubscribe works;
- listeners receive only a new final assistant message on `complete`;
- intermediate/no-new-message/interrupted paths do not notify;
- one listener throwing does not prevent later listeners.

Desired event:

```ts
{
  sessionId: 'session-1',
  workspaceId: 'workspace-1',
  messageId: 'assistant-1',
  content: 'final report',
}
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
bun test packages/server-core/src/sessions/final-assistant-message-listener.test.ts
```

Expected: FAIL because the instance subscription boundary is missing.

- [ ] **Step 3: Implement listener boundary**

Add `subscribeToFinalAssistantMessage()` to `ISessionManager` and `SessionManager`. In `onProcessingStopped`, after computing `didReceiveNewFinalMessage`, await listener notification only for `reason === 'complete'`. Catch each listener failure with `sessionRuntimeHooks.captureException`, then continue normal completion cleanup.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
bun test packages/server-core/src/sessions/final-assistant-message-listener.test.ts
cd packages/server-core; bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/server-core/src/handlers/session-manager-interface.ts packages/server-core/src/sessions
git commit -m "Expose final assistant completion events"
```

### Task 4: Coordinate automatic persistence and retry

**Files:**
- Create: `packages/server-core/src/stock/research-persistence.ts`
- Create: `packages/server-core/src/stock/research-persistence.test.ts`
- Modify: `packages/server-core/src/stock/index.ts`

- [ ] **Step 1: Write failing coordinator tests**

Cover:

- unknown session is ignored;
- valid final message saves completion;
- invalid message marks failure;
- retry reparses latest final message and completes without sending;
- retry sends `buildStockResearchRepairPrompt()` when parsing still fails;
- retry does not send while session is processing;
- send failure returns run to failed.

Inject only:

```ts
{
  storage,
  sessionManager: {
    getSession,
    sendMessage,
    subscribeToFinalAssistantMessage,
  },
  logger,
}
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
bun test packages/server-core/src/stock/research-persistence.test.ts
```

Expected: FAIL because the coordinator does not exist.

- [ ] **Step 3: Implement coordinator**

Implement:

```ts
class StockResearchPersistenceCoordinator {
  start(): () => void
  handleFinalAssistantMessage(event: FinalAssistantMessageEvent): Promise<void>
  retry(sessionId: string): Promise<{ status: 'completed' | 'regenerating' | 'running' }>
}
```

Read the latest final non-intermediate assistant message from `getSession()`. Parse and save, or mark a concise persistence error. Before sending repair, mark the run running; on send failure mark it failed again.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
bun test packages/server-core/src/stock/research-persistence.test.ts
cd packages/server-core; bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/server-core/src/stock
git commit -m "Coordinate automatic research persistence"
```

### Task 5: Wire create order, status, retry RPCs, and hosts

**Files:**
- Modify: `packages/shared/src/protocol/channels.ts`
- Modify: `packages/shared/src/protocol/dto.ts`
- Modify: `packages/shared/src/protocol/routing.ts`
- Modify: `packages/server-core/src/handlers/handler-deps.ts`
- Modify: `packages/server-core/src/handlers/rpc/stock-research.ts`
- Modify: `packages/server-core/src/handlers/rpc/stock-research.test.ts`
- Modify: `apps/electron/src/shared/types.ts`
- Modify: `apps/electron/src/transport/channel-map.ts`
- Modify: `apps/electron/src/main/index.ts`
- Modify: `packages/server/src/index.ts`
- Modify: `apps/electron/src/shared/__tests__/ipc-channels.test.ts`

- [ ] **Step 1: Write failing RPC and channel tests**

Assert create call order is:

```ts
['createSession', 'createResearchRun', 'markResearchRunRunning', 'sendMessage']
```

Assert send failure marks the run failed. Add handlers:

```ts
getStockResearchRunBySession(workspaceId, sessionId)
retryStockResearchPersistence(workspaceId, sessionId)
```

and expected stable channel strings.

- [ ] **Step 2: Verify RED**

Run:

```powershell
bun test packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts packages/shared/src/protocol/__tests__/routing.test.ts
```

Expected: FAIL because channels, handlers, and ordering are missing.

- [ ] **Step 3: Implement contracts and host wiring**

Add coordinator to `HandlerDeps`. Construct it once beside each host's `StockStorageService`, call `start()` after SessionManager creation, and inject it into handlers. Register status/retry handlers. Update create ordering and failure recording.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
bun test packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts packages/shared/src/protocol/__tests__/routing.test.ts
bun run typecheck:shared
cd packages/server-core; bun run typecheck
cd ..\..\apps\electron; bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared/src/protocol packages/server-core/src/handlers apps/electron/src/shared apps/electron/src/transport apps/electron/src/main/index.ts packages/server/src/index.ts
git commit -m "Wire stock persistence status and retry"
```

### Task 6: Add stale-safe persistence status and retry UI

**Files:**
- Create: `apps/electron/src/renderer/stock-research/persistence-state.ts`
- Create: `apps/electron/src/renderer/stock-research/__tests__/persistence-state.test.ts`
- Create: `apps/electron/src/renderer/stock-research/StockResearchPersistenceBanner.tsx`
- Modify: `apps/electron/src/renderer/pages/ChatPage.tsx`
- Modify: `packages/shared/src/i18n/locales/de.json`
- Modify: `packages/shared/src/i18n/locales/en.json`
- Modify: `packages/shared/src/i18n/locales/es.json`
- Modify: `packages/shared/src/i18n/locales/hu.json`
- Modify: `packages/shared/src/i18n/locales/ja.json`
- Modify: `packages/shared/src/i18n/locales/pl.json`
- Modify: `packages/shared/src/i18n/locales/zh-Hans.json`

- [ ] **Step 1: Write failing renderer helper tests**

Test a generation guard for session switches and a pure view-state mapper:

```ts
expect(toPersistenceBannerState({
  status: 'failed',
  errorMessage: 'Missing section: 报告生成',
})).toEqual({
  visible: true,
  canRetry: true,
  message: 'Missing section: 报告生成',
})
```

Completed/running/unknown states must hide the failure banner.

- [ ] **Step 2: Verify RED**

Run:

```powershell
bun test apps/electron/src/renderer/stock-research/__tests__/persistence-state.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement helper, banner, and ChatPage wiring**

Load run status only for Stock Research sessions. Refresh when `session.isProcessing` changes from true to false and after retry. Use a generation token keyed by workspace/session. The banner invokes `retryStockResearchPersistence`; show loading for the call and a regenerating message for `regenerating`.

Add these i18n keys in every locale with natural translations:

```json
"stockResearch.persistence.failed": "Research completed, but the report could not be saved.",
"stockResearch.persistence.regenerating": "Regenerating a complete report…",
"stockResearch.persistence.retry": "Retry save",
"stockResearch.persistence.retrying": "Retrying…"
```

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
bun test apps/electron/src/renderer/stock-research/__tests__/persistence-state.test.ts apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts
cd apps/electron; bun run typecheck
cd ..\..
bun run sort-locales
bun run lint:i18n:sorted
bun run lint:i18n:parity
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/electron/src/renderer packages/shared/src/i18n/locales
git commit -m "Show stock report persistence recovery"
```

### Task 7: Final verification and persistent records

**Files:**
- Modify: `feature_list.json`
- Modify: `claude-progress.md`
- Modify: `session-handoff.md`

- [ ] **Step 1: Run focused tests**

```powershell
bun test packages/shared/src/stock/__tests__/research-report.test.ts packages/shared/src/stock/__tests__/research-run.test.ts packages/shared/src/stock/__tests__/symbols.test.ts packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/stock/research-persistence.test.ts packages/server-core/src/sessions/final-assistant-message-listener.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/renderer/stock-research/__tests__/persistence-state.test.ts apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts
bun test apps/electron/src/main/handlers/__tests__/registration.test.ts
bun test apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts
```

Expected: zero failures.

- [ ] **Step 2: Run typechecks and repository validation**

```powershell
bun run typecheck:shared
cd packages/server-core; bun run typecheck
cd ..\..\apps\electron; bun run typecheck
cd ..\..
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
bun run lint:i18n:sorted
bun run lint:i18n:parity
python -m json.tool feature_list.json
git diff --check
```

Expected: all exit 0.

- [ ] **Step 3: Update persistent records**

Set `stock-005.status` to `passing` only after verification. Record exact test counts, typechecks, startup, i18n, JSON, known registration isolation note, branch, and push state.

- [ ] **Step 4: Re-run record validation**

```powershell
python -m json.tool feature_list.json
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add feature_list.json claude-progress.md session-handoff.md docs/superpowers/plans/2026-06-21-stock-005-auto-persistence.md
git commit -m "Record automatic persistence verification"
```

## Plan Self-Review

- Spec coverage: parser contract, disclaimer rejection, pre-send run creation, instance completion hook, atomic/idempotent storage, visible failure, parse-first retry, regeneration fallback, Electron/headless wiring, and verification are each assigned to a task.
- TDD ordering: every production slice starts with a focused failing test and an explicit RED command.
- Type consistency: `FinalAssistantMessageEvent`, `SaveCompletedStockResearchInput`, `StockResearchPersistenceCoordinator`, `getStockResearchRunBySession`, and `retryStockResearchPersistence` are used consistently across tasks.
- Scope: no Agent tool, queue system, cloud sync, or general free-form transcript recovery is introduced.
- No placeholders remain.
