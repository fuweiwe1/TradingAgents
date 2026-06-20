import * as React from 'react'

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
  useRegisterModal(open, () => onOpenChange(false))

  const dialogStateVersionRef = React.useRef(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    dialogStateVersionRef.current += 1
    setSubmitting(false)
    setError(null)
  }, [open, item?.id])

  const handleRemove = React.useCallback(async () => {
    if (submitting || !item) return

    const itemId = item.id
    const dialogStateVersion = dialogStateVersionRef.current
    setSubmitting(true)
    setError(null)
    try {
      const result = await window.electronAPI.removeStockWatchlistItem(
        workspaceId,
        itemId,
      )
      if (!result.success) {
        throw new Error('Failed to remove watchlist item.')
      }
      onRemoved(itemId)
      if (dialogStateVersionRef.current === dialogStateVersion) {
        onOpenChange(false)
      }
    } catch (removeError) {
      if (dialogStateVersionRef.current === dialogStateVersion) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : 'Failed to remove watchlist item.',
        )
      }
    } finally {
      if (dialogStateVersionRef.current === dialogStateVersion) {
        setSubmitting(false)
      }
    }
  }, [item, onOpenChange, onRemoved, submitting, workspaceId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Remove from Watchlist</DialogTitle>
          <DialogDescription>
            Remove {item?.symbol.displaySymbol ?? 'this stock'} from your watchlist?
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
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemove}
            disabled={submitting || !item}
          >
            {submitting ? 'Removing...' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
