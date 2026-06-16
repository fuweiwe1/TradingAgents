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
