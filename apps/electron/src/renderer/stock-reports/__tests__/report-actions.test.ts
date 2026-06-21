import { describe, expect, mock, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { downloadMarkdownFile, exportStockReportMarkdown, openStockReportSession } from '../report-actions'

function report(): StockResearchReport {
  return {
    id: 'report-1',
    runId: 'run-1',
    sessionId: 'session-1',
    title: 'AAPL Research Report',
    symbol: { input: 'AAPL', symbol: 'AAPL', market: 'US', exchange: 'US', displaySymbol: 'AAPL', currency: 'USD' },
    rating: 'Hold',
    riskLevel: 'Moderate',
    summary: 'Summary',
    contentMarkdown: '## Body',
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('openStockReportSession', () => {
  test('navigates to the linked session', () => {
    const navigateToSession = mock(() => {})
    openStockReportSession(report(), navigateToSession)
    expect(navigateToSession).toHaveBeenCalledWith('session-1')
  })
})

describe('exportStockReportMarkdown', () => {
  test('formats and downloads the selected report', () => {
    const download = mock(() => {})
    exportStockReportMarkdown(report(), download)
    expect(download).toHaveBeenCalledWith(
      'AAPL-aapl-research-report.md',
      expect.stringContaining('# AAPL Research Report'),
    )
  })
})

describe('downloadMarkdownFile', () => {
  test('downloads markdown and cleans up the object URL', () => {
    const dom = installDownloadDomStubs()

    try {
      downloadMarkdownFile('report.md', '# Report')

      expect(dom.blobParts).toEqual([['# Report']])
      expect(dom.blobOptions).toEqual([{ type: 'text/markdown;charset=utf-8' }])
      expect(dom.anchor.href).toBe('blob:report')
      expect(dom.anchor.download).toBe('report.md')
      expect(dom.appendChild).toHaveBeenCalledWith(dom.anchor)
      expect(dom.anchor.click).toHaveBeenCalled()
      expect(dom.anchor.remove).toHaveBeenCalled()
      expect(dom.revokeObjectURL).toHaveBeenCalledWith('blob:report')
      expect(dom.events).toEqual(['createObjectURL', 'appendChild', 'click', 'remove', 'revokeObjectURL'])
    } finally {
      dom.restore()
    }
  })

  test('removes the anchor and revokes the object URL when click throws', () => {
    const error = new Error('click failed')
    const dom = installDownloadDomStubs({ clickError: error })

    try {
      expect(() => downloadMarkdownFile('report.md', '# Report')).toThrow(error)
      expect(dom.anchor.remove).toHaveBeenCalled()
      expect(dom.revokeObjectURL).toHaveBeenCalledWith('blob:report')
      expect(dom.events).toEqual(['createObjectURL', 'appendChild', 'click', 'remove', 'revokeObjectURL'])
    } finally {
      dom.restore()
    }
  })
})

function installDownloadDomStubs(options: { clickError?: Error } = {}) {
  const blobDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Blob')
  const urlDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'URL')
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')

  const events: string[] = []
  const blobParts: unknown[] = []
  const blobOptions: unknown[] = []

  class FakeBlob {
    constructor(parts: BlobPart[], blobOptionsArg?: BlobPropertyBag) {
      blobParts.push(parts)
      blobOptions.push(blobOptionsArg)
    }
  }

  const anchor = {
    href: '',
    download: '',
    click: mock(() => {
      events.push('click')
      if (options.clickError) {
        throw options.clickError
      }
    }),
    remove: mock(() => {
      events.push('remove')
    }),
  }

  const appendChild = mock((element: unknown) => {
    expect(element).toBe(anchor)
    events.push('appendChild')
    return element
  })

  const createObjectURL = mock(() => {
    events.push('createObjectURL')
    return 'blob:report'
  })
  const revokeObjectURL = mock(() => {
    events.push('revokeObjectURL')
  })

  Object.defineProperty(globalThis, 'Blob', {
    configurable: true,
    value: FakeBlob,
  })
  Object.defineProperty(globalThis, 'URL', {
    configurable: true,
    value: { createObjectURL, revokeObjectURL },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: { appendChild },
      createElement: mock((tagName: string) => {
        expect(tagName).toBe('a')
        return anchor
      }),
    },
  })

  return {
    anchor,
    appendChild,
    blobOptions,
    blobParts,
    events,
    revokeObjectURL,
    restore() {
      restoreGlobalProperty('Blob', blobDescriptor)
      restoreGlobalProperty('URL', urlDescriptor)
      restoreGlobalProperty('document', documentDescriptor)
    },
  }
}

function restoreGlobalProperty(
  property: 'Blob' | 'URL' | 'document',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(globalThis, property, descriptor)
    return
  }
  delete (globalThis as Record<string, unknown>)[property]
}
