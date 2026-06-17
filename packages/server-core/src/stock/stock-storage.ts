import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Database } from 'bun:sqlite'
import {
  STOCK_RESEARCH_STEPS,
  type ParsedStockSymbol,
  type StockResearchReport,
  type StockResearchRunRecord,
  type StockResearchRunStatus,
  type StockResearchStepKey,
  type StockResearchStepRecord,
  type StockResearchStepStatus,
  type StockWatchlistItem,
} from '@craft-agent/shared/stock'

export interface StockStorageServiceOptions {
  databasePath: string
}

export interface StockStorage {
  addWatchlistItem(input: {
    symbol: ParsedStockSymbol
    groupName?: string | null
    note?: string | null
  }): StockWatchlistItem
  listWatchlistItems(): StockWatchlistItem[]
  removeWatchlistItem(id: string): boolean
  createResearchRun(input: {
    sessionId: string
    symbol: ParsedStockSymbol
  }): StockResearchRunRecord
  listResearchSteps(runId: string): StockResearchStepRecord[]
  saveResearchReport(input: {
    runId: string
    title: string
    rating?: string | null
    riskLevel?: string | null
    summary: string
    contentMarkdown: string
  }): StockResearchReport
  listResearchReports(): StockResearchReport[]
  getResearchReport(id: string): StockResearchReport
}

interface SymbolRow {
  id: string
  input: string
  symbol: string
  market: ParsedStockSymbol['market']
  exchange: ParsedStockSymbol['exchange']
  display_symbol: string
  currency: ParsedStockSymbol['currency']
}

interface WatchlistRow extends SymbolRow {
  watchlist_id: string
  group_name: string
  note: string | null
  watchlist_created_at: number
  watchlist_updated_at: number
}

interface ResearchRunRow extends SymbolRow {
  run_id: string
  session_id: string
  status: StockResearchRunStatus
  started_at: number | null
  completed_at: number | null
  error_message: string | null
  run_created_at: number
  run_updated_at: number
}

interface ResearchStepRow {
  id: string
  run_id: string
  step_key: StockResearchStepKey
  status: StockResearchStepStatus
  input_json: string | null
  output_markdown: string | null
  output_json: string | null
  started_at: number | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

interface ResearchReportRow extends SymbolRow {
  report_id: string
  run_id: string
  session_id: string
  title: string
  rating: string | null
  risk_level: string | null
  summary: string
  content_markdown: string
  report_created_at: number
  report_updated_at: number
}

export class StockStorageService {
  private readonly db: Database

  constructor(options: StockStorageServiceOptions) {
    mkdirSync(dirname(options.databasePath), { recursive: true })
    this.db = new Database(options.databasePath)
    this.db.exec('PRAGMA foreign_keys = ON')
    this.initializeSchema()
  }

  close(): void {
    this.db.close()
  }

  listTables(): string[] {
    return this.db.query<{ name: string }, []>(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('stock_symbols', 'watchlist_items', 'research_runs', 'research_steps', 'research_reports')
      ORDER BY name
    `).all().map((row) => row.name)
  }

  addWatchlistItem(input: {
    symbol: ParsedStockSymbol
    groupName?: string | null
    note?: string | null
  }): StockWatchlistItem {
    const now = Date.now()
    const symbolId = this.upsertSymbol(input.symbol, now)
    const groupName = normalizeGroupName(input.groupName)
    const existing = this.db.query<{ id: string }, [string, string]>(`
      SELECT id FROM watchlist_items WHERE symbol_id = ? AND group_name = ?
    `).get(symbolId, groupName)

    if (existing) {
      this.db.query(`
        UPDATE watchlist_items
        SET note = ?, updated_at = ?
        WHERE id = ?
      `).run(input.note ?? null, now, existing.id)
      return this.getWatchlistItem(existing.id)
    }

    const id = randomUUID()
    this.db.query(`
      INSERT INTO watchlist_items (id, symbol_id, group_name, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, symbolId, groupName, input.note ?? null, now, now)
    return this.getWatchlistItem(id)
  }

  listWatchlistItems(): StockWatchlistItem[] {
    return this.db.query<WatchlistRow, []>(WATCHLIST_SELECT_SQL).all().map(mapWatchlistRow)
  }

  removeWatchlistItem(id: string): boolean {
    const result = this.db.query('DELETE FROM watchlist_items WHERE id = ?').run(id)
    return result.changes > 0
  }

  createResearchRun(input: {
    sessionId: string
    symbol: ParsedStockSymbol
  }): StockResearchRunRecord {
    const now = Date.now()
    const symbolId = this.upsertSymbol(input.symbol, now)
    const runId = randomUUID()

    const insert = this.db.transaction(() => {
      this.db.query(`
        INSERT INTO research_runs (id, session_id, symbol_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'created', ?, ?)
      `).run(runId, input.sessionId, symbolId, now, now)

      for (const step of STOCK_RESEARCH_STEPS) {
        this.db.query(`
          INSERT INTO research_steps (id, run_id, step_key, status, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, ?)
        `).run(randomUUID(), runId, step.key, now, now)
      }
    })
    insert()

    return this.getResearchRun(runId)
  }

  listResearchSteps(runId: string): StockResearchStepRecord[] {
    return this.db.query<ResearchStepRow, [string]>(`
      SELECT id, run_id, step_key, status, input_json, output_markdown, output_json,
             started_at, completed_at, created_at, updated_at
      FROM research_steps
      WHERE run_id = ?
      ORDER BY id
    `).all(runId).sort((left, right) =>
      getStepOrder(left.step_key) - getStepOrder(right.step_key)
    ).map(mapResearchStepRow)
  }

  saveResearchReport(input: {
    runId: string
    title: string
    rating?: string | null
    riskLevel?: string | null
    summary: string
    contentMarkdown: string
  }): StockResearchReport {
    const run = this.getResearchRun(input.runId)
    const now = Date.now()
    const id = randomUUID()

    this.db.query(`
      INSERT INTO research_reports (
        id, run_id, title, symbol_snapshot_json, rating, risk_level,
        summary, content_markdown, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.runId,
      input.title,
      JSON.stringify(run.symbol),
      input.rating ?? null,
      input.riskLevel ?? null,
      input.summary,
      input.contentMarkdown,
      now,
      now,
    )

    return this.getResearchReport(id)
  }

  listResearchReports(): StockResearchReport[] {
    return this.db.query<ResearchReportRow, []>(RESEARCH_REPORT_SELECT_SQL).all().map(mapResearchReportRow)
  }

  getResearchReport(id: string): StockResearchReport {
    const row = this.db.query<ResearchReportRow, [string]>(`
      ${RESEARCH_REPORT_SELECT_SQL}
      WHERE research_reports.id = ?
    `).get(id)
    if (!row) throw new Error(`Research report not found: ${id}`)
    return mapResearchReportRow(row)
  }

  private getWatchlistItem(id: string): StockWatchlistItem {
    const row = this.db.query<WatchlistRow, [string]>(`
      ${WATCHLIST_SELECT_SQL}
      WHERE watchlist_items.id = ?
    `).get(id)
    if (!row) throw new Error(`Watchlist item not found: ${id}`)
    return mapWatchlistRow(row)
  }

  private getResearchRun(id: string): StockResearchRunRecord {
    const row = this.db.query<ResearchRunRow, [string]>(`
      ${RESEARCH_RUN_SELECT_SQL}
      WHERE research_runs.id = ?
    `).get(id)
    if (!row) throw new Error(`Research run not found: ${id}`)
    return mapResearchRunRow(row)
  }

  private upsertSymbol(symbol: ParsedStockSymbol, now: number): string {
    const existing = this.db.query<{ id: string }, [string, string]>(`
      SELECT id FROM stock_symbols WHERE symbol = ? AND market = ?
    `).get(symbol.symbol, symbol.market)

    if (existing) {
      this.db.query(`
        UPDATE stock_symbols
        SET input = ?, exchange = ?, display_symbol = ?, currency = ?, updated_at = ?
        WHERE id = ?
      `).run(symbol.input, symbol.exchange, symbol.displaySymbol, symbol.currency, now, existing.id)
      return existing.id
    }

    const id = randomUUID()
    this.db.query(`
      INSERT INTO stock_symbols (
        id, input, symbol, market, exchange, display_symbol, currency, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      symbol.input,
      symbol.symbol,
      symbol.market,
      symbol.exchange,
      symbol.displaySymbol,
      symbol.currency,
      now,
      now,
    )
    return id
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stock_symbols (
        id TEXT PRIMARY KEY,
        input TEXT NOT NULL,
        symbol TEXT NOT NULL,
        market TEXT NOT NULL,
        exchange TEXT NOT NULL,
        display_symbol TEXT NOT NULL,
        currency TEXT NOT NULL,
        name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(symbol, market)
      );

      CREATE TABLE IF NOT EXISTS watchlist_items (
        id TEXT PRIMARY KEY,
        symbol_id TEXT NOT NULL REFERENCES stock_symbols(id) ON DELETE CASCADE,
        group_name TEXT NOT NULL,
        note TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(symbol_id, group_name)
      );

      CREATE TABLE IF NOT EXISTS research_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        symbol_id TEXT NOT NULL REFERENCES stock_symbols(id) ON DELETE RESTRICT,
        status TEXT NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS research_steps (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        step_key TEXT NOT NULL,
        status TEXT NOT NULL,
        input_json TEXT,
        output_markdown TEXT,
        output_json TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(run_id, step_key)
      );

      CREATE TABLE IF NOT EXISTS research_reports (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        symbol_snapshot_json TEXT NOT NULL,
        rating TEXT,
        risk_level TEXT,
        summary TEXT NOT NULL,
        content_markdown TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
  }
}

const WATCHLIST_SELECT_SQL = `
  SELECT
    watchlist_items.id AS watchlist_id,
    watchlist_items.group_name,
    watchlist_items.note,
    watchlist_items.created_at AS watchlist_created_at,
    watchlist_items.updated_at AS watchlist_updated_at,
    stock_symbols.id,
    stock_symbols.input,
    stock_symbols.symbol,
    stock_symbols.market,
    stock_symbols.exchange,
    stock_symbols.display_symbol,
    stock_symbols.currency
  FROM watchlist_items
  JOIN stock_symbols ON stock_symbols.id = watchlist_items.symbol_id
`

const RESEARCH_RUN_SELECT_SQL = `
  SELECT
    research_runs.id AS run_id,
    research_runs.session_id,
    research_runs.status,
    research_runs.started_at,
    research_runs.completed_at,
    research_runs.error_message,
    research_runs.created_at AS run_created_at,
    research_runs.updated_at AS run_updated_at,
    stock_symbols.id,
    stock_symbols.input,
    stock_symbols.symbol,
    stock_symbols.market,
    stock_symbols.exchange,
    stock_symbols.display_symbol,
    stock_symbols.currency
  FROM research_runs
  JOIN stock_symbols ON stock_symbols.id = research_runs.symbol_id
`

const RESEARCH_REPORT_SELECT_SQL = `
  SELECT
    research_reports.id AS report_id,
    research_reports.run_id,
    research_runs.session_id,
    research_reports.title,
    research_reports.rating,
    research_reports.risk_level,
    research_reports.summary,
    research_reports.content_markdown,
    research_reports.created_at AS report_created_at,
    research_reports.updated_at AS report_updated_at,
    stock_symbols.id,
    stock_symbols.input,
    stock_symbols.symbol,
    stock_symbols.market,
    stock_symbols.exchange,
    stock_symbols.display_symbol,
    stock_symbols.currency
  FROM research_reports
  JOIN research_runs ON research_runs.id = research_reports.run_id
  JOIN stock_symbols ON stock_symbols.id = research_runs.symbol_id
`

function mapSymbolRow(row: SymbolRow): ParsedStockSymbol {
  return {
    input: row.input,
    symbol: row.symbol,
    market: row.market,
    exchange: row.exchange,
    displaySymbol: row.display_symbol,
    currency: row.currency,
  }
}

function mapWatchlistRow(row: WatchlistRow): StockWatchlistItem {
  return {
    id: row.watchlist_id,
    symbol: mapSymbolRow(row),
    groupName: row.group_name,
    note: row.note,
    createdAt: row.watchlist_created_at,
    updatedAt: row.watchlist_updated_at,
  }
}

function mapResearchRunRow(row: ResearchRunRow): StockResearchRunRecord {
  return {
    id: row.run_id,
    sessionId: row.session_id,
    symbol: mapSymbolRow(row),
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    createdAt: row.run_created_at,
    updatedAt: row.run_updated_at,
  }
}

function mapResearchStepRow(row: ResearchStepRow): StockResearchStepRecord {
  return {
    id: row.id,
    runId: row.run_id,
    stepKey: row.step_key,
    status: row.status,
    inputJson: row.input_json,
    outputMarkdown: row.output_markdown,
    outputJson: row.output_json,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapResearchReportRow(row: ResearchReportRow): StockResearchReport {
  return {
    id: row.report_id,
    runId: row.run_id,
    sessionId: row.session_id,
    title: row.title,
    symbol: mapSymbolRow(row),
    rating: row.rating,
    riskLevel: row.risk_level,
    summary: row.summary,
    contentMarkdown: row.content_markdown,
    createdAt: row.report_created_at,
    updatedAt: row.report_updated_at,
  }
}

function normalizeGroupName(groupName: string | null | undefined): string {
  const normalized = groupName?.trim()
  return normalized || 'Default'
}

function getStepOrder(stepKey: StockResearchStepKey): number {
  return STOCK_RESEARCH_STEPS.findIndex((step) => step.key === stepKey)
}
