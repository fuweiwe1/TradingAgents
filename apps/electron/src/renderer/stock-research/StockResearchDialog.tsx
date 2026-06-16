import * as React from 'react'
import { LineChart } from 'lucide-react'
import { toast } from 'sonner'

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
import { useRegisterModal } from '@/context/ModalContext'
import { startStockResearch } from './start-stock-research'

interface StockResearchDialogProps {
  open: boolean
  workspaceId: string | null
  onOpenChange: (open: boolean) => void
  onRefreshSession: (sessionId: string) => Promise<void>
  onNavigateToSession: (sessionId: string) => void
}

export function StockResearchDialog({
  open,
  workspaceId,
  onOpenChange,
  onRefreshSession,
  onNavigateToSession,
}: StockResearchDialogProps) {
  useRegisterModal(open, () => onOpenChange(false))

  const inputRef = React.useRef<HTMLInputElement>(null)
  const [symbol, setSymbol] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setSymbol('')
      setError(null)
      setIsSubmitting(false)
      return
    }
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const handleSubmit = React.useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    if (!workspaceId) {
      setError('当前没有可用工作区')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await startStockResearch({
        workspaceId,
        symbol,
        createStockResearchRun: window.electronAPI.createStockResearchRun,
        refreshSessions: onRefreshSession,
        navigateToSession: onNavigateToSession,
      })
      onOpenChange(false)
      toast.success(`已开始研究 ${result.symbol.displaySymbol}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '启动股票研究失败'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, workspaceId, symbol, onRefreshSession, onNavigateToSession, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Stock Research
            </DialogTitle>
            <DialogDescription>
              输入 A股、港股或美股代码。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              ref={inputRef}
              value={symbol}
              onChange={(event) => {
                setSymbol(event.target.value)
                if (error) setError(null)
              }}
              placeholder="600519 / 00700.HK / AAPL"
              disabled={isSubmitting}
              aria-label="Stock symbol"
            />
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !symbol.trim()}>
              {isSubmitting ? 'Starting...' : 'Start'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
