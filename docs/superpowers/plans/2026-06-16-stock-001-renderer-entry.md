# Stock 001 Renderer Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first renderer-visible entry point for StockCraft single-stock research.

**Architecture:** Expose the existing `stockResearch:createRun` RPC through `window.electronAPI`, then add a narrow renderer helper and a small sidebar dialog. The UI refreshes the created Craft session and navigates to it; step visualization and report persistence remain later `stock-001` / `stock-002` slices.

**Tech Stack:** Bun test, TypeScript, Electron preload channel map, React 18, Radix dialog, existing AppShell navigation.

---

## File Structure

- Modify `apps/electron/src/shared/types.ts`: add `createStockResearchRun` to `ElectronAPI`.
- Modify `apps/electron/src/transport/channel-map.ts`: map `createStockResearchRun` to `RPC_CHANNELS.stockResearch.CREATE_RUN`.
- Modify `apps/electron/src/shared/__tests__/ipc-channels.test.ts`: include the new wire-format channel.
- Create `apps/electron/src/renderer/stock-research/start-stock-research.ts`: pure renderer orchestration helper.
- Create `apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts`: TDD coverage for orchestration and blank input.
- Create `apps/electron/src/renderer/stock-research/StockResearchDialog.tsx`: small symbol input dialog.
- Modify `apps/electron/src/renderer/components/app-shell/AppShell.tsx`: add sidebar button and dialog wiring.

### Task 1: Renderer API Mapping

- [x] **Step 1: Run failing IPC channel test**

Run: `bun test apps/electron/src/shared/__tests__/ipc-channels.test.ts`

Expected: FAIL because `stockResearch:createRun` exists in `RPC_CHANNELS` but is not in the expected channel list.

- [x] **Step 2: Add ElectronAPI mapping**

Add `createStockResearchRun(workspaceId, request)` to the shared Electron API type and map it in `CHANNEL_MAP`.

- [x] **Step 3: Re-run IPC channel test**

Run: `bun test apps/electron/src/shared/__tests__/ipc-channels.test.ts`

Expected: PASS.

### Task 2: Start Stock Research Helper

- [x] **Step 1: Write failing helper tests**

The helper must trim the symbol, call `createStockResearchRun`, refresh the created session, and navigate to it. Blank input must be rejected before invoking the backend.

- [x] **Step 2: Run helper test to verify RED**

Run: `bun test apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts`

Expected: FAIL because `start-stock-research.ts` does not exist.

- [x] **Step 3: Implement helper**

Create `startStockResearch(options)` with injected dependencies for backend call, session refresh, and navigation.

- [x] **Step 4: Re-run helper test**

Run: `bun test apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts`

Expected: PASS.

### Task 3: Sidebar Dialog

- [x] **Step 1: Add dialog component**

Create `StockResearchDialog` with one symbol input and submit/cancel actions.

- [x] **Step 2: Wire AppShell**

Add a `Stock Research` sidebar button below `New Session`. On submit, call `startStockResearch`, hydrate the created session with `getSessionMessages`, store it with `replaceLoadedSessionAtom`, and navigate the focused panel to the new session.

- [x] **Step 3: Verify focused tests and Electron typecheck**

Run:

```bash
bun test apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts
cd apps/electron && bun run typecheck
```

Expected: PASS.
