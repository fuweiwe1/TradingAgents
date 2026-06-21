import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from 'node:sqlite'
import {
  StockStorageServiceBase,
  type StockStorageServiceOptions,
  type StockSqliteDatabase,
  type StockSqliteStatement,
} from './stock-storage'

class NodeSqliteDatabase implements StockSqliteDatabase {
  private readonly database: DatabaseSync

  constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath)
  }

  close(): void {
    this.database.close()
  }

  exec(sql: string): void {
    this.database.exec(sql)
  }

  query<TRow = unknown, TParams extends unknown[] = unknown[]>(
    sql: string,
  ): StockSqliteStatement<TRow, TParams> {
    return new NodeSqliteStatement<TRow, TParams>(
      this.database.prepare(sql),
    )
  }

  transaction<T>(callback: () => T): () => T {
    return () => {
      this.database.exec('BEGIN')
      try {
        const result = callback()
        this.database.exec('COMMIT')
        return result
      } catch (error) {
        this.database.exec('ROLLBACK')
        throw error
      }
    }
  }
}

class NodeSqliteStatement<TRow, TParams extends unknown[]>
implements StockSqliteStatement<TRow, TParams> {
  constructor(private readonly statement: StatementSync) {}

  all(...params: TParams): TRow[] {
    return this.statement.all(...toSqliteParams(params)) as TRow[]
  }

  get(...params: TParams): TRow | undefined {
    return this.statement.get(...toSqliteParams(params)) as TRow | undefined
  }

  run(...params: TParams): { changes: number | bigint } {
    return this.statement.run(...toSqliteParams(params))
  }
}

function toSqliteParams(params: unknown[]): SQLInputValue[] {
  return params as SQLInputValue[]
}

export class StockStorageService extends StockStorageServiceBase {
  constructor(options: StockStorageServiceOptions) {
    super(options, (databasePath) => new NodeSqliteDatabase(databasePath))
  }
}
