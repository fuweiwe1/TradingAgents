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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRegisterModal } from '@/context/ModalContext'
import type { StockWatchlistItem } from '../../shared/types'

interface AddWatchlistItemDialogProps {
  open: boolean
  workspaceId: string
  groupOptions: string[]
  onOpenChange: (open: boolean) => void
  onAdded: (item: StockWatchlistItem) => void
}

export function AddWatchlistItemDialog({
  open,
  workspaceId,
  groupOptions,
  onOpenChange,
  onAdded,
}: AddWatchlistItemDialogProps) {
  const symbolInputRef = React.useRef<HTMLInputElement>(null)
  const dialogStateVersionRef = React.useRef(0)
  const symbolId = React.useId()
  const groupId = React.useId()
  const groupOptionsId = React.useId()
  const noteId = React.useId()
  const [symbol, setSymbol] = React.useState('')
  const [groupName, setGroupName] = React.useState('')
  const [note, setNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (submitting && !nextOpen) return
    onOpenChange(nextOpen)
  }, [onOpenChange, submitting])

  useRegisterModal(open, () => handleOpenChange(false))

  React.useEffect(() => {
    dialogStateVersionRef.current += 1
    setSubmitting(false)
    setError(null)

    if (!open) {
      setSymbol('')
      setGroupName('')
      setNote('')
      return
    }

    const timeoutId = window.setTimeout(() => symbolInputRef.current?.focus(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [open, workspaceId])

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !symbol.trim()) return

    const dialogStateVersion = dialogStateVersionRef.current
    setSubmitting(true)
    setError(null)

    let item: StockWatchlistItem
    try {
      item = await window.electronAPI.addStockWatchlistItem(workspaceId, {
        symbol: symbol.trim(),
        groupName: groupName.trim() || null,
        note: note.trim() || null,
      })
    } catch (submitError) {
      if (dialogStateVersionRef.current === dialogStateVersion) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Failed to add watchlist item.',
        )
        setSubmitting(false)
      }
      return
    }

    if (dialogStateVersionRef.current !== dialogStateVersion) return

    setSubmitting(false)
    try {
      onAdded(item)
    } finally {
      onOpenChange(false)
    }
  }, [groupName, note, onAdded, onOpenChange, submitting, symbol, workspaceId])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
            <DialogDescription>
              Add an A-share, Hong Kong, or US stock.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <label htmlFor={symbolId} className="text-sm font-medium">
              Stock symbol
            </label>
            <Input
              ref={symbolInputRef}
              id={symbolId}
              value={symbol}
              onChange={(event) => {
                setSymbol(event.target.value)
                if (error) setError(null)
              }}
              placeholder="600519 / 00700.HK / AAPL"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor={groupId} className="text-sm font-medium">
              Group
            </label>
            <Input
              id={groupId}
              list={groupOptionsId}
              value={groupName}
              onChange={(event) => {
                setGroupName(event.target.value)
                if (error) setError(null)
              }}
              placeholder="Select or type a group"
              disabled={submitting}
            />
            <datalist id={groupOptionsId}>
              {groupOptions.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-2">
            <label htmlFor={noteId} className="text-sm font-medium">
              Note
            </label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                if (error) setError(null)
              }}
              placeholder="Optional research note"
              disabled={submitting}
            />
          </div>

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
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !symbol.trim()}>
              {submitting ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
