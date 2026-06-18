# StockCraft Lightweight Watchlist Design

## Goal

Build a standalone Watchlist page where users can add A-share, Hong Kong, and US stock symbols, organize the same symbol into multiple lightweight groups, edit notes and group membership, remove entries safely, and start a Stock Research run directly from a selected entry.

## Scope

### In Scope

- Add a top-level Watchlist route and left-sidebar entry.
- Show watchlist entries grouped by `groupName`.
- Add a symbol with either an existing group or a newly typed group.
- Store an optional note while adding an entry.
- Display an omitted group as `未分组`.
- Allow the same stock symbol to appear in multiple groups.
- Edit an existing entry's group and note.
- Remove an entry after explicit confirmation.
- Start Stock Research directly from an entry and navigate to the created Craft session.
- Keep renderer access behind ElectronAPI/RPC; renderer code does not access SQLite directly.

### Out of Scope

- A separate groups table or independent group CRUD screen.
- Group rename or delete operations that affect multiple entries.
- Drag-and-drop ordering.
- Live prices, daily change, charts, alerts, or market data.
- Bulk add, bulk delete, import, or export.
- Watchlist synchronization between devices or users.
- Editing the stock symbol of an existing entry.

## Product Decisions

- The Watchlist is a standalone top-level page, parallel to Reports.
- The page uses a two-pane layout:
  - Left pane: search, add action, grouped entry list.
  - Right pane: selected entry details, editable group and note, research and remove actions.
- Adding an entry allows selecting an existing group or typing a new group name.
- The same symbol may exist in multiple groups.
- Starting research is immediate; there is no confirmation dialog or symbol-edit step.
- Removing an entry requires a confirmation dialog.
- Notes are optional during creation and editable afterward.
- If no group is supplied, storage keeps the existing canonical `Default` value and the UI displays it as localized `未分组`.
- Groups sort by name. Entries inside each group sort by `createdAt` descending.

## Information Architecture

### Navigation

Add `watchlist` as a top-level navigation state and route:

- Route: `watchlist`
- Navigator: `watchlist`
- Details: `null`

The left app sidebar places Watchlist near Reports and Stock Research. Selecting it renders `WatchlistPage` in the main content panel.

### Watchlist Page

The left pane contains:

- Page title and total symbol/group counts.
- `Add` button.
- Search input matching display symbol, raw symbol, market, group, and note.
- Group headings with entry counts.
- Entry rows showing display symbol, market, and note preview.

The right pane contains:

- Display symbol, market, currency, and added date.
- `Start Research` action.
- `Remove` action.
- Editable group selector/input.
- Editable optional note.
- `Save changes` and `Cancel` actions when local edits differ from persisted data.

When there is no selection, the right pane shows a neutral empty state. When the Watchlist itself is empty, the list pane explains how to add the first symbol.

## Data Model

Continue using the existing `watchlist_items` table:

- `id`
- `symbol_id`
- `group_name`
- `note`
- `created_at`
- `updated_at`

Groups remain derived strings rather than first-class records. The UI derives existing group options by trimming, de-duplicating, and sorting the current entries' `groupName` values.

For backward compatibility, `Default` remains the canonical stored value for entries without a user-selected group. Renderer helpers treat that value as the special ungrouped bucket and render the localized `未分组` label. The Add and Edit controls present it as an empty group selection rather than as a user-created group named `Default`.

`StockWatchlistItem` remains the renderer-facing read model:

```ts
export interface StockWatchlistItem {
  id: string
  symbol: ParsedStockSymbol
  groupName: string
  note: string | null
  createdAt: number
  updatedAt: number
}
```

Add an update request:

```ts
export interface UpdateStockWatchlistItemRequest {
  groupName?: string | null
  note?: string | null
}
```

The stock symbol is intentionally not editable. Changing the symbol requires adding another entry and removing the old one.

## Storage and RPC Boundary

### Storage

Extend `StockStorage` with:

```ts
updateWatchlistItem(
  id: string,
  input: {
    groupName?: string | null
    note?: string | null
  },
): StockWatchlistItem
```

The update operation:

1. Loads the existing item or throws a not-found error.
2. Normalizes `groupName`, mapping blank or omitted input to the existing canonical `Default` storage value.
3. Checks whether another entry already has the same `symbol_id` and normalized target group.
4. If a conflicting entry exists, throws a clear duplicate-target error without changing either entry.
5. Updates `group_name`, `note`, and `updated_at` in one SQL statement.
6. Returns the updated read model.

The existing unique constraint on `(symbol_id, group_name)` remains the final integrity guard.

### Protocol

Add:

```ts
RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM
```

Wire it through:

- Shared protocol DTO exports.
- Electron channel map.
- Electron API type.
- RPC routing classification.
- Server-core stock research handler registration.
- Electron handler registration coverage.

The Electron API shape is:

```ts
updateStockWatchlistItem(
  workspaceId: string,
  id: string,
  request: UpdateStockWatchlistItemRequest,
): Promise<StockWatchlistItem>
```

## Renderer Architecture

Keep page behavior split into focused modules:

- `watchlist-grouping.ts`
  - Normalize UI group labels.
  - Derive sorted group options.
  - Group entries by group name.
  - Sort groups by name and entries by newest first.
  - Filter entries by search query.
- `watchlist-page-state.ts`
  - Choose the initial/current selection.
  - Choose the next selection after deletion.
  - Detect whether editable fields are dirty.
- `watchlist-actions.ts`
  - Start research using the existing `startStockResearch` helper.
  - Return errors to the page without swallowing them.
- `WatchlistPage.tsx`
  - Load and render workspace-scoped data.
  - Coordinate add, edit, delete, refresh, and research states.
- `AddWatchlistItemDialog.tsx`
  - Collect symbol, group, and optional note.
  - Offer existing groups while allowing a new group value.
- `RemoveWatchlistItemDialog.tsx`
  - Require explicit confirmation and retain the dialog on failure.

This division keeps pure behavior testable without introducing a new React DOM test harness.

## Data Flow

### Load

1. `WatchlistPage` receives the active `workspaceId`.
2. It immediately hides data tagged with the previous workspace.
3. It calls `listStockWatchlistItems(workspaceId)`.
4. Renderer helpers filter, group, and sort the returned entries.
5. Page-state helpers preserve the current selection when possible, otherwise select the first visible entry.

### Add

1. User opens the Add dialog.
2. The dialog submits symbol, group, and optional note through `addStockWatchlistItem`.
3. The server parses and validates the stock symbol.
4. Storage inserts the item or updates the note when the same symbol/group already exists, preserving current add semantics.
5. The page refreshes the list and selects the returned entry.

### Edit

1. User changes group or note in the right pane.
2. `Save changes` calls `updateStockWatchlistItem`.
3. Storage performs conflict checking and one-row update.
4. The page replaces the returned item locally and keeps it selected.
5. If the group changed, the item moves to the appropriate sorted group.

### Remove

1. User opens the confirmation dialog.
2. On confirmation, the page calls `removeStockWatchlistItem`.
3. On success, the page removes the entry locally.
4. Selection moves to the next entry in the same group when available, otherwise the next globally visible entry, otherwise `null`.

### Start Research

1. User clicks `Start Research`.
2. The page reuses `startStockResearch` with the selected entry's `displaySymbol`.
3. The existing research flow creates the run and Craft session.
4. Sessions refresh and navigation moves to the new session.

## State and Concurrency

- Tag loaded entries with the workspace they belong to and hide stale workspace data immediately.
- Disable Add submission while adding.
- Disable Save while saving or when fields are unchanged.
- Disable Remove confirmation while deleting.
- Disable Start Research while creating the run.
- Ignore stale async results after workspace changes or component cleanup.
- Refresh reloads the server list but preserves selection when the entry still exists.

## Error Handling

- List load failure: show the error in the list pane with a Retry action.
- Add failure: keep the dialog open and preserve all input values.
- Edit duplicate conflict: show that the stock already exists in the target group; keep the original item unchanged.
- Edit not found: show the server error and refresh the list.
- Delete failure: keep the confirmation dialog open and display the error.
- Research failure: remain on the selected item and show an error toast.
- Invalid symbol: surface the existing stock symbol parser error in the Add dialog.

## Internationalization

Add visible Watchlist labels through the existing locale system, including:

- Sidebar title.
- Add, edit, save, cancel, remove, and research actions.
- Group and note labels.
- Localized `未分组` display label for the canonical `Default` storage bucket.
- Empty, loading, confirmation, conflict, and error messages.

Locale sorted and parity checks remain mandatory. Internal storage continues using the existing stable `Default` value so current databases need no migration; the UI never exposes that implementation value and renders the localized ungrouped label instead.

## Testing Strategy

### Storage Tests

- Update note without changing group.
- Move an entry to another group.
- Normalize a blank group to canonical `Default` and expose it through the localized ungrouped bucket.
- Reject moving into an existing same-symbol target group.
- Preserve both records after a rejected conflict.
- Reject an unknown item id.

### RPC and API Tests

- Register the update channel.
- Forward workspace id, item id, and update request correctly.
- Return the updated item.
- Preserve channel-map and registration coverage.

### Pure Renderer Tests

- Group entries by name.
- Sort groups by name.
- Sort group entries by `createdAt` descending.
- Search symbol, market, group, and note.
- Preserve a valid selection.
- Choose a deterministic next selection after deletion.
- Detect dirty group/note fields.
- Start research with the selected display symbol and navigate to the created session.

### Route Tests

- Build and parse `watchlist`.
- Convert between route and navigation state.
- Round-trip compound route and history key.

### Page Wiring

Use Electron typecheck and focused helper/route tests for page wiring. Do not add a new DOM testing framework solely for this feature.

### Final Verification

- Focused storage, RPC, route, helper, and IPC tests.
- Shared typecheck.
- Server-core typecheck.
- Electron typecheck.
- `init.ps1`.
- i18n sorted and parity checks.
- `python -m json.tool feature_list.json`.
- `git diff --check`.

## Acceptance Criteria

- Users can add valid A-share, Hong Kong, and US symbols.
- Users can select an existing group or create a new group while adding.
- Users can leave the group blank and see the entry under the localized `未分组` bucket.
- The same stock can appear in multiple groups.
- Groups are name-sorted and entries are newest-first within each group.
- Users can edit group and note without recreating the entry.
- Duplicate symbol/group edits fail without corrupting either entry.
- Users can remove an entry only after confirmation.
- Users can start research from an entry and land in the created Craft session.
- Workspace changes never display another workspace's Watchlist data.
- Renderer code never accesses SQLite directly.
