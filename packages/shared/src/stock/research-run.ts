import type { ParsedStockSymbol, StockResearchStep } from './types'

export const STOCK_RESEARCH_STEPS: StockResearchStep[] = [
  { key: 'data_collection', title: '数据收集' },
  { key: 'analyst_views', title: '分析师观点' },
  { key: 'bull_bear_debate', title: '牛熊辩论' },
  { key: 'risk_review', title: '风险审查' },
  { key: 'report_generation', title: '报告生成' },
]

export function buildResearchSessionName(symbol: ParsedStockSymbol): string {
  return `Stock Research: ${symbol.displaySymbol}`
}

export function buildStockResearchPrompt(symbol: ParsedStockSymbol): string {
  return [
    `请对股票 ${symbol.displaySymbol} 进行一次 StockCraft v1 单股研究。`,
    '',
    '请严格按以下五步输出，并保留每一步的标题：',
    '1. 数据收集：收集公司基本信息、近期新闻、财报摘要、关键指标、行业背景，并标注数据来源和不确定性。',
    '2. 分析师观点：分别从基本面、估值、行业、事件驱动视角给出看多、看空和中性观察。',
    '3. 牛熊辩论：组织 bull thesis 与 bear thesis，列出双方反驳和未解决的问题。',
    '4. 风险审查：从市场、财务、监管、治理、流动性、数据质量角度审查风险。',
    '5. 报告生成：生成完整研究报告，包含一句话结论、核心观点、关键事实、牛熊分歧、风险因素和后续观察指标。',
    '',
    `标的信息：市场=${symbol.market}，交易所=${symbol.exchange}，代码=${symbol.symbol}，币种=${symbol.currency}。`,
    '',
    '请在最终报告中明确写出：本内容仅供研究参考，不构成投资建议。',
  ].join('\n')
}
