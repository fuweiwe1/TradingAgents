import type { ParsedStockSymbol, StockResearchStep } from './types'

export const STOCK_RESEARCH_STEPS: StockResearchStep[] = [
  { key: 'data_collection', title: '数据收集' },
  { key: 'analyst_views', title: '分析师观点' },
  { key: 'bull_bear_debate', title: '牛熊辩论' },
  { key: 'risk_review', title: '风险审查' },
  { key: 'report_generation', title: '报告生成' },
]

export const STOCK_RESEARCH_DISCLAIMER = '本内容仅供研究参考，不构成投资建议。'

export function buildResearchSessionName(symbol: ParsedStockSymbol): string {
  return `Stock Research: ${symbol.displaySymbol}`
}

export function buildStockResearchPrompt(symbol: ParsedStockSymbol): string {
  return [
    `请对股票 ${symbol.displaySymbol} 进行一次 StockCraft v1 单股研究。`,
    '',
    '请完成数据收集、分析师观点、牛熊辩论、风险审查和报告生成。',
    '最终回复不要补充过程说明，必须严格使用以下固定 Markdown 结构，五个章节按顺序出现且正文不能为空：',
    '',
    ...buildCanonicalReportTemplate(),
    '',
    `标的信息：市场=${symbol.market}，交易所=${symbol.exchange}，代码=${symbol.symbol}，币种=${symbol.currency}。`,
    '',
    `最终一行必须保留完整免责声明：${STOCK_RESEARCH_DISCLAIMER}`,
  ].join('\n')
}

export function buildCanonicalReportTemplate(): string[] {
  return [
    '## 数据收集',
    '<公司信息、新闻、财报、关键指标、行业背景、来源与不确定性>',
    '',
    '## 分析师观点',
    '<基本面、估值、行业、事件驱动的看多、看空和中性观点>',
    '',
    '## 牛熊辩论',
    '<Bull thesis、Bear thesis、双方反驳和未解决问题>',
    '',
    '## 风险审查',
    '风险等级：<低|中|高>',
    '<市场、财务、监管、治理、流动性和数据质量风险>',
    '',
    '## 报告生成',
    '<一句话结论、核心观点、关键事实、牛熊分歧、风险因素和后续观察指标>',
    '',
    STOCK_RESEARCH_DISCLAIMER,
  ]
}
