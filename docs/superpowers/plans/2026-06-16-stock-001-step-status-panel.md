# Stock 001 Step Status Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a compact five-step StockCraft progress panel inside stock research sessions.

**Architecture:** Keep status derivation as pure renderer logic under `apps/electron/src/renderer/stock-research`, then render a small banner above `ChatDisplay` only for sessions named `Stock Research: ...`. The first slice uses session messages as the source of truth and avoids SQLite/report persistence.

**Tech Stack:** Bun test, TypeScript, React 18, existing Tailwind/shadcn-style renderer components.

---

## File Structure

- Create `apps/electron/src/renderer/stock-research/step-status.ts`: pure helpers to identify stock sessions and derive per-step status from messages.
- Create `apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts`: TDD coverage for stock-session detection and status derivation.
- Create `apps/electron/src/renderer/stock-research/StockResearchStepPanel.tsx`: compact banner component.
- Modify `apps/electron/src/renderer/pages/ChatPage.tsx`: render the banner above `ChatDisplay` for loaded stock research sessions.
- Update `claude-progress.md`, `feature_list.json`, and `session-handoff.md` during closeout.

### Task 1: Status Derivation Helper

- [x] **Step 1: Write failing helper tests**

Create `apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { deriveStockResearchStepStatuses, isStockResearchSession } from '../step-status'

const message = (role: 'user' | 'assistant', content: string, isStreaming = false) => ({
  id: `${role}-${content.length}`,
  role,
  content,
  timestamp: 1,
  isStreaming,
})

describe('isStockResearchSession', () => {
  test('detects sessions created by StockCraft stock research', () => {
    expect(isStockResearchSession({ name: 'Stock Research: AAPL' })).toBe(true)
    expect(isStockResearchSession({ name: 'Regular chat' })).toBe(false)
  })
})

describe('deriveStockResearchStepStatuses', () => {
  test('marks all steps pending when only the user prompt exists', () => {
    const steps = deriveStockResearchStepStatuses([message('user', '请对股票 AAPL 进行一次 StockCraft v1 单股研究。')])
    expect(steps.map(step => step.status)).toEqual(['pending', 'pending', 'pending', 'pending', 'pending'])
  })

  test('marks completed steps from assistant headings', () => {
    const steps = deriveStockResearchStepStatuses([
      message('assistant', '## 数据收集\n已完成。\n\n## 分析师观点\n已完成。'),
    ])
    expect(steps.map(step => step.status)).toEqual(['completed', 'completed', 'pending', 'pending', 'pending'])
  })

  test('marks the last streaming heading as in progress', () => {
    const steps = deriveStockResearchStepStatuses([
      message('assistant', '## 数据收集\n已完成。\n\n## 分析师观点\n正在分析。', true),
    ])
    expect(steps.map(step => step.status)).toEqual(['completed', 'in_progress', 'pending', 'pending', 'pending'])
  })
})
```

- [x] **Step 2: Run helper test to verify RED**

Run: `bun test apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts`

Expected: FAIL because `step-status.ts` does not exist.

- [x] **Step 3: Implement minimal helper**

Create `step-status.ts` with:

```ts
import { STOCK_RESEARCH_STEPS } from '@craft-agent/shared/stock'
import type { Message } from '../../shared/types'

export type StockResearchStepStatus = 'pending' | 'in_progress' | 'completed'

export interface StockResearchStepStatusItem {
  key: string
  title: string
  status: StockResearchStepStatus
}

export function isStockResearchSession(session: { name?: string | null } | null | undefined): boolean {
  return !!session?.name?.startsWith('Stock Research: ')
}

export function deriveStockResearchStepStatuses(messages: Pick<Message, 'role' | 'content' | 'isStreaming'>[]): StockResearchStepStatusItem[] {
  const assistantMessages = messages.filter(message => message.role === 'assistant' || message.role === 'plan')
  const completedTitles = new Set<string>()
  let streamingTitle: string | null = null

  for (const message of assistantMessages) {
    for (const step of STOCK_RESEARCH_STEPS) {
      if (message.content.includes(step.title)) {
        completedTitles.add(step.title)
        if (message.isStreaming) streamingTitle = step.title
      }
    }
  }

  return STOCK_RESEARCH_STEPS.map(step => {
    const isCompleted = completedTitles.has(step.title)
    return {
      ...step,
      status: streamingTitle === step.title ? 'in_progress' : isCompleted ? 'completed' : 'pending',
    }
  })
}
```

- [x] **Step 4: Run helper test to verify GREEN**

Run: `bun test apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts`

Expected: PASS.

### Task 2: Step Panel UI

- [x] **Step 1: Create panel component**

Create `apps/electron/src/renderer/stock-research/StockResearchStepPanel.tsx`. It accepts `steps: StockResearchStepStatusItem[]` and renders one compact row of five status pills with accessible labels.

- [x] **Step 2: Wire ChatPage**

In `apps/electron/src/renderer/pages/ChatPage.tsx`, import the helper and component. When `session` is loaded and `isStockResearchSession(session)` is true, render `StockResearchStepPanel` above `ChatDisplay`.

- [x] **Step 3: Verify focused tests and typecheck**

Run:

```bash
bun test apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts
cd apps/electron && bun run typecheck
```

Expected: PASS.

### Task 3: Closeout

- [x] **Step 1: Update progress files**

Record that `stock-001` now has a visible five-step progress panel, but remains `in_progress` because report persistence is still out of scope for this slice.

- [x] **Step 2: Run final verification**

Run:

```bash
python -m json.tool feature_list.json
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
bun test apps/electron/src/renderer/stock-research/__tests__/step-status.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts
cd apps/electron && bun run typecheck
git diff --check
```

Expected: PASS, aside from known Windows LF/CRLF warnings.

- [x] **Step 3: Commit**

Run:

```bash
git add apps/electron/src/renderer/stock-research apps/electron/src/renderer/pages/ChatPage.tsx docs/superpowers/plans/2026-06-16-stock-001-step-status-panel.md claude-progress.md feature_list.json session-handoff.md
git commit -m "展示股票研究步骤状态"
```
