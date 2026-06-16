import type { ParsedStockSymbol, StockExchange } from './types'

const A_SHARE_RE = /^(\d{6})(?:\.(SH|SZ|BJ))?$/
const HK_RE = /^(\d{1,5})\.HK$/
const US_RE = /^[A-Z]{1,5}$/

function inferAshareExchange(symbol: string): StockExchange {
  const first = symbol[0]
  if (first === '6') return 'SH'
  if (first === '0' || first === '3') return 'SZ'
  if (first === '4' || first === '8' || first === '9') return 'BJ'
  throw new Error(`Unsupported stock symbol: ${symbol}`)
}

export function parseStockSymbol(input: string): ParsedStockSymbol {
  const raw = input.trim()
  const normalized = raw.toUpperCase()

  const hkMatch = normalized.match(HK_RE)
  if (hkMatch) {
    const symbol = hkMatch[1]!.padStart(5, '0')
    return {
      input,
      symbol,
      market: 'HK',
      exchange: 'HK',
      displaySymbol: `${symbol}.HK`,
      currency: 'HKD',
    }
  }

  const aShareMatch = normalized.match(A_SHARE_RE)
  if (aShareMatch) {
    const symbol = aShareMatch[1]!
    const exchange = (aShareMatch[2] as StockExchange | undefined) ?? inferAshareExchange(symbol)
    return {
      input,
      symbol,
      market: 'CN',
      exchange,
      displaySymbol: `${symbol}.${exchange}`,
      currency: 'CNY',
    }
  }

  if (US_RE.test(normalized)) {
    return {
      input,
      symbol: normalized,
      market: 'US',
      exchange: 'US',
      displaySymbol: normalized,
      currency: 'USD',
    }
  }

  throw new Error(`Unsupported stock symbol: ${input}`)
}
