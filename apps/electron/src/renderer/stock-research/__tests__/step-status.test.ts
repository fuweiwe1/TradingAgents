import { describe, expect, test } from 'bun:test'
import { deriveStockResearchStepStatuses, isStockResearchSession } from '../step-status'

const message = (role: 'user' | 'assistant', content: string, isStreaming = false) => ({
  id: `${role}-${content.length}`,
  role,
  content,
  timestamp: 1,
  isStreaming,
})

describe('isStockResearchSession', () => {
  test('detects sessions created by StockCraft stock research', () => {
    expect(isStockResearchSession({ name: 'Stock Research: AAPL' })).toBe(true)
    expect(isStockResearchSession({ name: 'Regular chat' })).toBe(false)
  })
})

describe('deriveStockResearchStepStatuses', () => {
  test('marks all steps pending when only the user prompt exists', () => {
    const steps = deriveStockResearchStepStatuses([
      message('user', '请对股票 AAPL 进行一次 StockCraft v1 单股研究。'),
    ])

    expect(steps.map(step => step.status)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
    ])
  })

  test('marks completed steps from assistant headings', () => {
    const steps = deriveStockResearchStepStatuses([
      message('assistant', '## 数据收集\n已完成。\n\n## 分析师观点\n已完成。'),
    ])

    expect(steps.map(step => step.status)).toEqual([
      'completed',
      'completed',
      'pending',
      'pending',
      'pending',
    ])
  })

  test('marks the last streaming heading as in progress', () => {
    const steps = deriveStockResearchStepStatuses([
      message('assistant', '## 数据收集\n已完成。\n\n## 分析师观点\n正在分析。', true),
    ])

    expect(steps.map(step => step.status)).toEqual([
      'completed',
      'in_progress',
      'pending',
      'pending',
      'pending',
    ])
  })
})
