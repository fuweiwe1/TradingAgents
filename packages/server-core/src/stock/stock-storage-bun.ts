import { Database } from 'bun:sqlite'
import {
  StockStorageServiceBase,
  type StockStorageServiceOptions,
  type StockSqliteDatabase,
} from './stock-storage'

export class StockStorageService extends StockStorageServiceBase {
  constructor(options: StockStorageServiceOptions) {
    super(options, (databasePath) =>
      new Database(databasePath) as unknown as StockSqliteDatabase
    )
  }
}
