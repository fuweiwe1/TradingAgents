import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRegisterModal } from '@/context/ModalContext'
import type { StockWatchlistItem } from '../../shared/types'

interface RemoveWatchlistItemDialogProps {
  open: boolean
  workspaceId: string
  item: StockWatchlistItem | null
  onOpenChange: (open: boolean) => void
  onRemoved: (id: string) => void
}

export function RemoveWatchlistItemDialog({
  open,
  workspaceId,
  item,
  onOpenChange,
  onRemoved,
}: RemoveWatchlistItemDialogProps) {
  const { t } = useTranslation()
  const mountedRef = React.useRef(true)
  const itemId = item?.id ?? null
  const requestContextRef = React.useRef({
    open,
    workspaceId,
    itemId,
    version: 0,
  })
  const [submitting, setSubmitting] = React.useState(false)
  const submittingRef = React.useRef(submitting)
  const [error, setError] = React.useState<string | null>(null)

  React.useLayoutEffect(() => {
    submittingRef.current = submitting
  }, [submitting])

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (submittingRef.current && !nextOpen) return
    onOpenChange(nextOpen)
  }, [onOpenChange])
  const handleRegisteredClose = React.useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  useRegisterModal(open, handleRegisteredClose)

  React.useLayoutEffect(() => {
    const requestContext = requestContextRef.current
    if (
      requestContext.open !== open
      || requestContext.workspaceId !== workspaceId
      || requestContext.itemId !== itemId
    ) {
      requestContextRef.current = {
        open,
        workspaceId,
        itemId,
        version: requestContext.version + 1,
      }
    }
  }, [itemId, open, workspaceId])

  React.useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    setSubmitting(false)
    setError(null)
  }, [open, workspaceId, item?.id])

  const handleRemove = React.useCallback(async () => {
    if (submitting || !item) return

    const removingItemId = item.id
    const requestVersion = requestContextRef.current.version
    const isCurrentRequest = () => (
      mountedRef.current
      && requestContextRef.current.version === requestVersion
      && requestContextRef.current.open
    )
    setSubmitting(true)
    setError(null)

    try {
      const result = await window.electronAPI.removeStockWatchlistItem(
        workspaceId,
        removingItemId,
      )
      if (!result.success) {
        throw new Error(t('watchlist.removeError'))
      }
    } catch (removeError) {
      if (isCurrentRequest()) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : t('watchlist.removeError'),
        )
        setSubmitting(false)
      }
      return
    }

    if (!isCurrentRequest()) return

    setSubmitting(false)
    try {
      onRemoved(removingItemId)
    } finally {
      onOpenChange(false)
    }
  }, [item, onOpenChange, onRemoved, submitting, t, workspaceId])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>{t('watchlist.removeTitle')}</DialogTitle>
          <DialogDescription>
            {t('watchlist.confirmRemove', {
              symbol: item?.symbol.displaySymbol ?? t('watchlist.thisStock'),
            })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            {t('watchlist.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemove}
            disabled={submitting || !item}
          >
            {submitting ? t('watchlist.removing') : t('watchlist.remove')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
