# Stock 001 Single Stock Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first backend slice for StockCraft single-stock research: parse A/HK/US symbols, define the five-step research prompt, and expose an RPC handler that creates one Craft session per research run.

**Architecture:** Add stock-domain pure logic under `packages/shared/src/stock`, then add a `stockResearch:createRun` RPC handler in `packages/server-core`. The handler calls the existing `sessionManager.createSession(workspaceId, options)` without passing `model` or `llmConnection`, so Craft Agents keeps using the current default LLM connection system.

**Tech Stack:** Bun test, TypeScript, `@craft-agent/shared/protocol`, `@craft-agent/server-core/handlers/rpc`, existing `ISessionManager`.

---

## File Structure

- Create `packages/shared/src/stock/types.ts`: stock market, parsed symbol, research step, create-run DTO types.
- Create `packages/shared/src/stock/symbols.ts`: pure symbol parsing and normalization.
- Create `packages/shared/src/stock/research-run.ts`: five-step definitions, session name builder, initial research prompt builder.
- Create `packages/shared/src/stock/index.ts`: stock module exports.
- Modify `packages/shared/package.json`: export `./stock`.
- Modify `packages/shared/src/protocol/channels.ts`: add `stockResearch.CREATE_RUN`.
- Modify `packages/shared/src/protocol/dto.ts`: re-export stock DTO types for protocol consumers.
- Create `packages/shared/src/stock/__tests__/symbols.test.ts`: parser tests for `600519`, `00700.HK`, `AAPL`.
- Create `packages/shared/src/stock/__tests__/research-run.test.ts`: prompt/session option tests.
- Create `packages/server-core/src/handlers/rpc/stock-research.ts`: RPC handler.
- Create `packages/server-core/src/handlers/rpc/stock-research.test.ts`: handler tests with mocked session manager.
- Modify `packages/server-core/src/handlers/rpc/index.ts`: register stock research handlers.

---

### Task 1: Stock Symbol Parsing

**Files:**
- Create: `packages/shared/src/stock/types.ts`
- Create: `packages/shared/src/stock/symbols.ts`
- Create: `packages/shared/src/stock/index.ts`
- Modify: `packages/shared/package.json`
- Test: `packages/shared/src/stock/__tests__/symbols.test.ts`

- [x] **Step 1: Write failing parser tests**

```ts
import { describe, expect, test } from 'bun:test'
import { parseStockSymbol } from '../symbols'

describe('parseStockSymbol', () => {
  test('normalizes bare A-share code to Shanghai market when it starts with 6', () => {
    expect(parseStockSymbol('600519')).toEqual({
      input: '600519',
      symbol: '600519',
      market: 'CN',
      exchange: 'SH',
      displaySymbol: '600519.SH',
      currency: 'CNY',
    })
  })

  test('normalizes Hong Kong code with HK suffix', () => {
    expect(parseStockSymbol('00700.HK')).toEqual({
      input: '00700.HK',
      symbol: '00700',
      market: 'HK',
      exchange: 'HK',
      displaySymbol: '00700.HK',
      currency: 'HKD',
    })
  })

  test('normalizes US ticker to uppercase', () => {
    expect(parseStockSymbol('aapl')).toEqual({
      input: 'aapl',
      symbol: 'AAPL',
      market: 'US',
      exchange: 'US',
      displaySymbol: 'AAPL',
      currency: 'USD',
    })
  })

  test('rejects unsupported symbol text', () => {
    expect(() => parseStockSymbol('not a symbol')).toThrow('Unsupported stock symbol')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared/src/stock/__tests__/symbols.test.ts`

Expected: FAIL because `packages/shared/src/stock/symbols.ts` does not exist.

- [x] **Step 3: Implement minimal parser**

```ts
export type StockMarket = 'CN' | 'HK' | 'US'
export type StockExchange = 'SH' | 'SZ' | 'BJ' | 'HK' | 'US'

export interface ParsedStockSymbol {
  input: string
  symbol: string
  market: StockMarket
  exchange: StockExchange
  displaySymbol: string
  currency: 'CNY' | 'HKD' | 'USD'
}
```

Implement `parseStockSymbol(input: string): ParsedStockSymbol` with:

- `600000`-style A-share defaults to `.SH` when first digit is `6`.
- `000001` / `300001`-style A-share defaults to `.SZ`.
- `8xxxxx` / `4xxxxx` / `9xxxxx` defaults to `.BJ`.
- Explicit `.SH`, `.SZ`, `.BJ`, `.HK` suffixes are honored.
- Hong Kong numeric symbols are padded to five digits.
- US tickers allow 1-5 letters, uppercase output.

- [x] **Step 4: Run parser test to verify it passes**

Run: `bun test packages/shared/src/stock/__tests__/symbols.test.ts`

Expected: PASS.

---

### Task 2: Research Run Prompt Contract

**Files:**
- Create: `packages/shared/src/stock/research-run.ts`
- Test: `packages/shared/src/stock/__tests__/research-run.test.ts`

- [x] **Step 1: Write failing prompt tests**

```ts
import { describe, expect, test } from 'bun:test'
import { parseStockSymbol } from '../symbols'
import { buildResearchSessionName, buildStockResearchPrompt, STOCK_RESEARCH_STEPS } from '../research-run'

describe('stock research run helpers', () => {
  test('defines the v1 five-step research flow in order', () => {
    expect(STOCK_RESEARCH_STEPS.map(step => step.key)).toEqual([
      'data_collection',
      'analyst_views',
      'bull_bear_debate',
      'risk_review',
      'report_generation',
    ])
  })

  test('builds a session name from the display symbol', () => {
    expect(buildResearchSessionName(parseStockSymbol('AAPL'))).toBe('Stock Research: AAPL')
  })

  test('builds an initial prompt that tells the agent to run all five steps', () => {
    const prompt = buildStockResearchPrompt(parseStockSymbol('00700.HK'))
    expect(prompt).toContain('00700.HK')
    expect(prompt).toContain('数据收集')
    expect(prompt).toContain('分析师观点')
    expect(prompt).toContain('牛熊辩论')
    expect(prompt).toContain('风险审查')
    expect(prompt).toContain('报告生成')
    expect(prompt).toContain('不构成投资建议')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared/src/stock/__tests__/research-run.test.ts`

Expected: FAIL because `research-run.ts` does not exist.

- [x] **Step 3: Implement prompt helpers**

Define `STOCK_RESEARCH_STEPS`, `buildResearchSessionName(symbol)`, and `buildStockResearchPrompt(symbol)` using the exact five-step labels from the Spec.

- [x] **Step 4: Run prompt tests**

Run: `bun test packages/shared/src/stock/__tests__/research-run.test.ts`

Expected: PASS.

---

### Task 3: Stock Research RPC Handler

**Files:**
- Modify: `packages/shared/src/protocol/channels.ts`
- Modify: `packages/shared/src/protocol/dto.ts`
- Create: `packages/server-core/src/handlers/rpc/stock-research.ts`
- Create: `packages/server-core/src/handlers/rpc/stock-research.test.ts`
- Modify: `packages/server-core/src/handlers/rpc/index.ts`

- [x] **Step 1: Write failing handler tests**

```ts
import { describe, expect, test } from 'bun:test'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import type { HandlerFn, RpcServer } from '../../transport/types'
import { registerStockResearchHandlers } from './stock-research'

function createHarness() {
  const handlers = new Map<string, HandlerFn>()
  const calls: Array<{ method: string; args: unknown[] }> = []
  const sessionManager = {
    async createSession(workspaceId: string, options: unknown) {
      calls.push({ method: 'createSession', args: [workspaceId, options] })
      return { id: 'session-1', workspaceId, name: (options as { name?: string }).name }
    },
    async sendMessage(sessionId: string, message: string) {
      calls.push({ method: 'sendMessage', args: [sessionId, message] })
    },
  }
  const server: RpcServer = {
    handle(channel, handler) { handlers.set(channel, handler) },
    push() {},
    async invokeClient() { return undefined },
    hasClientCapability() { return false },
    findClientsWithCapability() { return [] },
  }

  registerStockResearchHandlers(server, {
    sessionManager,
    platform: { logger: console },
  } as any)

  const createRun = handlers.get(RPC_CHANNELS.stockResearch.CREATE_RUN)
  if (!createRun) throw new Error('stock research handler not registered')
  return { createRun, calls }
}

describe('stock research RPC handlers', () => {
  test('creates one Craft session and sends the five-step prompt', async () => {
    const { createRun, calls } = createHarness()
    const result = await createRun({ clientId: 'client-1' }, 'workspace-1', { symbol: 'AAPL' })

    expect(result).toMatchObject({
      sessionId: 'session-1',
      symbol: { displaySymbol: 'AAPL', market: 'US' },
      steps: [
        { key: 'data_collection' },
        { key: 'analyst_views' },
        { key: 'bull_bear_debate' },
        { key: 'risk_review' },
        { key: 'report_generation' },
      ],
    })
    expect(calls[0]).toEqual({
      method: 'createSession',
      args: ['workspace-1', { name: 'Stock Research: AAPL' }],
    })
    expect(calls[1]?.method).toBe('sendMessage')
    expect(String(calls[1]?.args[1])).toContain('报告生成')
  })

  test('rejects invalid stock symbols before creating a session', async () => {
    const { createRun, calls } = createHarness()
    await expect(createRun({ clientId: 'client-1' }, 'workspace-1', { symbol: 'bad input' })).rejects.toThrow('Unsupported stock symbol')
    expect(calls).toEqual([])
  })
})
```

- [x] **Step 2: Run handler test to verify it fails**

Run: `bun test packages/server-core/src/handlers/rpc/stock-research.test.ts`

Expected: FAIL because `stock-research.ts` and `RPC_CHANNELS.stockResearch` do not exist.

- [x] **Step 3: Implement handler and channel**

Add:

- `RPC_CHANNELS.stockResearch.CREATE_RUN = 'stockResearch:createRun'`.
- `registerStockResearchHandlers(server, deps)`.
- Handler flow: parse symbol, create session with `{ name }`, send the generated prompt, return `{ sessionId, symbol, steps }`.
- Register `registerStockResearchHandlers` from `registerCoreRpcHandlers`.

- [x] **Step 4: Run handler test**

Run: `bun test packages/server-core/src/handlers/rpc/stock-research.test.ts`

Expected: PASS.

---

### Task 4: Verification And Commit

**Files:**
- Modify: `feature_list.json`
- Modify: `claude-progress.md`
- Modify: `session-handoff.md`

- [x] **Step 1: Run focused tests**

Run:

```bash
bun test packages/shared/src/stock/__tests__/symbols.test.ts
bun test packages/shared/src/stock/__tests__/research-run.test.ts
bun test packages/server-core/src/handlers/rpc/stock-research.test.ts
```

Expected: all PASS.

- [x] **Step 2: Run typecheck**

Run: `bun run typecheck:shared`

Expected: PASS.

- [x] **Step 3: Update progress files**

Mark `stock-001` as `in_progress` unless UI integration is complete. Record evidence for backend parser and session-creation RPC.

- [x] **Step 4: Commit**

Run:

```bash
git add packages/shared packages/server-core docs/superpowers/plans feature_list.json claude-progress.md session-handoff.md
git commit -m "实现股票研究会话创建入口"
```
