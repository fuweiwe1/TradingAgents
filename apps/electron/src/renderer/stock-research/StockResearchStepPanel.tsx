import * as React from 'react'
import { CheckCircle2, Circle, LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { StockResearchStepStatusItem } from './step-status'

interface StockResearchStepPanelProps {
  steps: StockResearchStepStatusItem[]
}

const statusClassName = {
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  in_progress: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  pending: 'border-border bg-muted/50 text-muted-foreground',
} satisfies Record<StockResearchStepStatusItem['status'], string>

const statusLabel = {
  completed: '已完成',
  in_progress: '进行中',
  pending: '等待中',
} satisfies Record<StockResearchStepStatusItem['status'], string>

function StepIcon({ status }: { status: StockResearchStepStatusItem['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
  if (status === 'in_progress') return <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
  return <Circle className="h-3.5 w-3.5" aria-hidden="true" />
}

export function StockResearchStepPanel({ steps }: StockResearchStepPanelProps) {
  return (
    <div className="border-b border-border/60 bg-background/95 px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          StockCraft
        </span>
        <div className="flex min-w-max items-center gap-1.5">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              {index > 0 && <div className="h-px w-3 bg-border" aria-hidden="true" />}
              <div
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium',
                  statusClassName[step.status],
                )}
                aria-label={`${step.title}: ${statusLabel[step.status]}`}
              >
                <StepIcon status={step.status} />
                <span className="whitespace-nowrap">{step.title}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
