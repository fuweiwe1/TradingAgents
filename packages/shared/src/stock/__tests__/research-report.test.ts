import { describe, expect, test } from 'bun:test'
import {
  buildStockResearchRepairPrompt,
  parseStockResearchReport,
} from '../research-report'
import { parseStockSymbol } from '../symbols'

const VALID_REPORT = `## 数据收集

Apple Inc. 已公布最新财务数据，收入保持增长。

## 分析师观点

基本面稳健，但估值并不便宜。

## 牛熊辩论

Bull 认为服务收入持续增长；Bear 认为硬件需求承压。

## 风险审查

风险等级：中

主要风险包括监管、供应链和估值回撤。

## 报告生成

维持中性判断。

后续重点观察服务收入和毛利率。

本内容仅供研究参考，不构成投资建议。`

describe('parseStockResearchReport', () => {
  test('parses the canonical five-step report and derives report metadata', () => {
    const result = parseStockResearchReport({
      symbol: parseStockSymbol('AAPL'),
      contentMarkdown: VALID_REPORT,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        title: 'AAPL 研究报告',
        summary: '维持中性判断。',
        rating: null,
        riskLevel: '中',
        contentMarkdown: VALID_REPORT,
        steps: {
          data_collection: expect.stringContaining('Apple Inc.'),
          analyst_views: expect.stringContaining('基本面稳健'),
          bull_bear_debate: expect.stringContaining('Bull'),
          risk_review: expect.stringContaining('风险等级：中'),
          report_generation: expect.stringContaining('维持中性判断'),
        },
      },
    })
  })

  test('rejects a missing section', () => {
    const result = parseStockResearchReport({
      symbol: parseStockSymbol('AAPL'),
      contentMarkdown: VALID_REPORT.replace(/## 牛熊辩论[\s\S]*?(?=## 风险审查)/, ''),
    })

    expect(result).toEqual({
      ok: false,
      error: '缺少章节：牛熊辩论',
    })
  })

  test('rejects an empty section', () => {
    const result = parseStockResearchReport({
      symbol: parseStockSymbol('AAPL'),
      contentMarkdown: VALID_REPORT.replace(
        '## 分析师观点\n\n基本面稳健，但估值并不便宜。',
        '## 分析师观点\n\n',
      ),
    })

    expect(result).toEqual({
      ok: false,
      error: '章节内容为空：分析师观点',
    })
  })

  test('rejects sections in the wrong order', () => {
    const outOfOrder = VALID_REPORT
      .replace('## 分析师观点', '## __TEMP__')
      .replace('## 牛熊辩论', '## 分析师观点')
      .replace('## __TEMP__', '## 牛熊辩论')

    const result = parseStockResearchReport({
      symbol: parseStockSymbol('AAPL'),
      contentMarkdown: outOfOrder,
    })

    expect(result).toEqual({
      ok: false,
      error: '研究章节顺序不正确',
    })
  })

  test('rejects a report without the required disclaimer', () => {
    const result = parseStockResearchReport({
      symbol: parseStockSymbol('AAPL'),
      contentMarkdown: VALID_REPORT.replace(
        '本内容仅供研究参考，不构成投资建议。',
        '',
      ),
    })

    expect(result).toEqual({
      ok: false,
      error: '缺少免责声明',
    })
  })

  test('limits the summary to 240 characters', () => {
    const longSummary = '结论'.repeat(150)
    const result = parseStockResearchReport({
      symbol: parseStockSymbol('600519'),
      contentMarkdown: VALID_REPORT.replace('维持中性判断。', longSummary),
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('600519.SH 研究报告')
      expect(result.value.summary.length).toBe(240)
    }
  })
})

test('buildStockResearchRepairPrompt requests the exact canonical structure', () => {
  const prompt = buildStockResearchRepairPrompt(parseStockSymbol('AAPL'))

  expect(prompt).toContain('## 数据收集')
  expect(prompt).toContain('## 报告生成')
  expect(prompt).toContain('本内容仅供研究参考，不构成投资建议。')
  expect(prompt).toContain('AAPL')
})
