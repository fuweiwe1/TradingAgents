import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { PersistenceBannerState } from './persistence-state'

interface StockResearchPersistenceBannerProps {
  state: PersistenceBannerState
  isRetrying: boolean
  onRetry: () => void
}

export function StockResearchPersistenceBanner({
  state,
  isRetrying,
  onRetry,
}: StockResearchPersistenceBannerProps) {
  const { t } = useTranslation()
  if (!state.visible) return null

  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-3 py-2">
      <div className="flex items-center gap-2">
        {state.regenerating
          ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-amber-600" aria-hidden="true" />
          : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">
            {state.regenerating
              ? t('stockResearch.persistence.regenerating')
              : t('stockResearch.persistence.failed')}
          </p>
          {state.message && (
            <p className="truncate text-xs text-muted-foreground">
              {state.message}
            </p>
          )}
        </div>
        {state.canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1.5 text-xs"
            disabled={isRetrying}
            onClick={onRetry}
          >
            {isRetrying
              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            {isRetrying
              ? t('stockResearch.persistence.retrying')
              : t('stockResearch.persistence.retry')}
          </Button>
        )}
      </div>
    </div>
  )
}
