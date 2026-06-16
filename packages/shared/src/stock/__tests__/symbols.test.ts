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
