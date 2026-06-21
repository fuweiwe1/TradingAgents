import {
  buildCanonicalReportTemplate,
  STOCK_RESEARCH_DISCLAIMER,
  STOCK_RESEARCH_STEPS,
} from './research-run'
import type {
  ParsedStockResearchReport,
  ParsedStockSymbol,
  ParseStockResearchReportResult,
  StockResearchStepKey,
} from './types'

const SUMMARY_LIMIT = 240

export function parseStockResearchReport(input: {
  symbol: ParsedStockSymbol
  contentMarkdown: string
}): ParseStockResearchReportResult {
  const headings = collectStepHeadings(input.contentMarkdown)

  for (const step of STOCK_RESEARCH_STEPS) {
    if (!headings.has(step.key)) {
      return { ok: false, error: `缺少章节：${step.title}` }
    }
  }

  const ordered = STOCK_RESEARCH_STEPS.map(step => headings.get(step.key)!)
  if (ordered.some((heading, index) =>
    index > 0 && heading.start < ordered[index - 1]!.start
  )) {
    return { ok: false, error: '研究章节顺序不正确' }
  }

  const steps = {} as Record<StockResearchStepKey, string>
  for (let index = 0; index < STOCK_RESEARCH_STEPS.length; index += 1) {
    const step = STOCK_RESEARCH_STEPS[index]!
    const heading = ordered[index]!
    const nextHeading = ordered[index + 1]
    const body = input.contentMarkdown
      .slice(heading.end, nextHeading?.start ?? input.contentMarkdown.length)
      .trim()

    const meaningfulBody = body.replace(STOCK_RESEARCH_DISCLAIMER, '').trim()
    if (!meaningfulBody) {
      return { ok: false, error: `章节内容为空：${step.title}` }
    }
    steps[step.key] = body
  }

  if (!input.contentMarkdown.includes(STOCK_RESEARCH_DISCLAIMER)) {
    return { ok: false, error: '缺少免责声明' }
  }

  const summary = firstParagraph(
    steps.report_generation.replace(STOCK_RESEARCH_DISCLAIMER, '').trim(),
  ).slice(0, SUMMARY_LIMIT)
  const riskLevel = steps.risk_review.match(/风险等级[：:]\s*(低|中|高)(?:\s|$)/)?.[1] ?? null

  return {
    ok: true,
    value: {
      title: `${input.symbol.displaySymbol} 研究报告`,
      rating: null,
      riskLevel,
      summary,
      contentMarkdown: input.contentMarkdown,
      steps,
    },
  }
}

export function buildStockResearchRepairPrompt(symbol: ParsedStockSymbol): string {
  return [
    `请基于当前会话中已有的研究内容，重新生成 ${symbol.displaySymbol} 的完整最终研究报告。`,
    '不要补充过程说明，只输出以下固定 Markdown 结构，五个章节必须按顺序出现且正文不能为空：',
    '',
    ...buildCanonicalReportTemplate(),
  ].join('\n')
}

function collectStepHeadings(contentMarkdown: string): Map<
  StockResearchStepKey,
  { start: number; end: number }
> {
  const titleToKey = new Map(
    STOCK_RESEARCH_STEPS.map(step => [step.title, step.key] as const),
  )
  const headings = new Map<
    StockResearchStepKey,
    { start: number; end: number }
  >()
  const pattern = /^##[ \t]+(.+?)[ \t]*$/gm

  for (const match of contentMarkdown.matchAll(pattern)) {
    const title = match[1]
    const key = title ? titleToKey.get(title) : undefined
    if (!key || match.index === undefined || headings.has(key)) continue
    headings.set(key, {
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return headings
}

function firstParagraph(value: string): string {
  return value
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => paragraph.trim())
    .find(Boolean) ?? ''
}
