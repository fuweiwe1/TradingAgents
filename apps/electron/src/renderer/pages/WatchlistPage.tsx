import * as React from 'react'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppShellContext } from '@/context/AppShellContext'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'
import { AddWatchlistItemDialog } from '@/stock-watchlist/AddWatchlistItemDialog'
import { RemoveWatchlistItemDialog } from '@/stock-watchlist/RemoveWatchlistItemDialog'
import { startWatchlistResearch } from '@/stock-watchlist/watchlist-actions'
import {
  filterWatchlistItems,
  getWatchlistGroupOptions,
  groupWatchlistItems,
  toEditableGroupName,
} from '@/stock-watchlist/watchlist-grouping'
import {
  chooseInitialWatchlistItemId,
  chooseSelectionAfterRemoval,
  isWatchlistDraftDirty,
} from '@/stock-watchlist/watchlist-page-state'
import {
  createWatchlistRequestGuard,
  type WatchlistRequestGuard,
} from '@/stock-watchlist/watchlist-request-guard'
import { classifyWatchlistError } from '@/stock-watchlist/watchlist-errors'
import type { StockWatchlistItem } from '../../shared/types'

interface WatchlistPageProps {
  workspaceId: string
}

function formatAddedDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
}

export default function WatchlistPage({ workspaceId }: WatchlistPageProps) {
  const { t, i18n } = useTranslation()
  const { navigateToSession } = useNavigation()
  const { refreshStockResearchSession } = useAppShellContext()
  const mountedRef = React.useRef(true)
  const workspaceIdRef = React.useRef(workspaceId)
  const requestGuardRef = React.useRef<WatchlistRequestGuard | null>(null)
  const savingRef = React.useRef(false)
  const researchingRef = React.useRef(false)
  const groupInputId = React.useId()
  const groupOptionsId = React.useId()
  const noteInputId = React.useId()
  const [items, setItems] = React.useState<StockWatchlistItem[]>([])
  const [itemsWorkspaceId, setItemsWorkspaceId] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [draftGroup, setDraftGroup] = React.useState('')
  const [draftNote, setDraftNote] = React.useState('')
  const [listLoading, setListLoading] = React.useState(false)
  const [listError, setListError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [researching, setResearching] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  React.useLayoutEffect(() => {
    if (requestGuardRef.current) {
      requestGuardRef.current.syncWorkspace(workspaceId)
    } else {
      requestGuardRef.current = createWatchlistRequestGuard(workspaceId)
    }
    workspaceIdRef.current = workspaceId
    savingRef.current = false
    researchingRef.current = false
  }, [workspaceId])

  React.useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    setItems([])
    setItemsWorkspaceId(null)
    setSelectedId(null)
    setQuery('')
    setDraftGroup('')
    setDraftNote('')
    setListError(null)
    setSaving(false)
    setResearching(false)
    setAddOpen(false)
    setRemoveOpen(false)

    if (!workspaceId) {
      setListLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    if (!workspaceId) return

    let stale = false
    setListLoading(true)
    setListError(null)

    window.electronAPI.listStockWatchlistItems(workspaceId)
      .then((nextItems) => {
        if (stale) return
        setItems(nextItems)
        setItemsWorkspaceId(workspaceId)
      })
      .catch((error) => {
        if (stale) return
        setItems([])
        setItemsWorkspaceId(workspaceId)
        setListError(error instanceof Error ? error.message : t('watchlist.loadError'))
      })
      .finally(() => {
        if (!stale) setListLoading(false)
      })

    return () => {
      stale = true
    }
  }, [refreshKey, t, workspaceId])

  const currentItems = React.useMemo(
    () => itemsWorkspaceId === workspaceId ? items : [],
    [items, itemsWorkspaceId, workspaceId],
  )
  const filteredItems = React.useMemo(
    () => filterWatchlistItems(currentItems, query),
    [currentItems, query],
  )
  const groups = React.useMemo(
    () => groupWatchlistItems(filteredItems, t('watchlist.ungrouped')),
    [filteredItems, t],
  )
  const allGroups = React.useMemo(
    () => groupWatchlistItems(currentItems, t('watchlist.ungrouped')),
    [currentItems, t],
  )
  const groupOptions = React.useMemo(
    () => getWatchlistGroupOptions(currentItems),
    [currentItems],
  )
  const selectedItem = currentItems.find(item => item.id === selectedId) ?? null

  React.useEffect(() => {
    const nextId = chooseInitialWatchlistItemId(groups, selectedId)
    if (nextId !== selectedId) {
      setSelectedId(nextId)
    }
  }, [groups, selectedId])

  React.useEffect(() => {
    setDraftGroup(selectedItem ? toEditableGroupName(selectedItem.groupName) : '')
    setDraftNote(selectedItem?.note ?? '')
  }, [selectedItem])

  const handleRefresh = React.useCallback(() => {
    setRefreshKey(current => current + 1)
  }, [])

  const handleAdded = React.useCallback((item: StockWatchlistItem) => {
    setItems(current => {
      const remaining = current.filter(candidate => candidate.id !== item.id)
      return [item, ...remaining]
    })
    setItemsWorkspaceId(workspaceIdRef.current)
    setSelectedId(item.id)
  }, [])

  const handleCancelEdit = React.useCallback(() => {
    if (!selectedItem) return
    setDraftGroup(toEditableGroupName(selectedItem.groupName))
    setDraftNote(selectedItem.note ?? '')
  }, [selectedItem])

  const handleSave = React.useCallback(async () => {
    if (!selectedItem || savingRef.current) return

    const requestGuard = requestGuardRef.current
    if (!requestGuard) return
    const requestToken = requestGuard.begin('save')
    const requestWorkspaceId = workspaceId
    const requestItemId = selectedItem.id
    const isCurrentRequest = () => (
      mountedRef.current && requestGuard.isCurrent(requestToken)
    )
    savingRef.current = true
    setSaving(true)

    try {
      const updated = await window.electronAPI.updateStockWatchlistItem(
        requestWorkspaceId,
        requestItemId,
        {
          groupName: draftGroup.trim() || null,
          note: draftNote.trim() || null,
        },
      )
      if (!isCurrentRequest() || updated.id !== requestItemId) {
        return
      }
      setItems(current => current.map(item => item.id === updated.id ? updated : item))
      toast.success(t('watchlist.saved'))
    } catch (error) {
      if (isCurrentRequest()) {
        const domainError = classifyWatchlistError(error)
        const message = domainError === 'conflict'
          ? t('watchlist.conflictError')
          : domainError === 'not-found'
            ? t('watchlist.notFoundError')
            : error instanceof Error
              ? error.message
              : t('watchlist.saveError')
        toast.error(message)
        if (domainError === 'not-found') {
          handleRefresh()
        }
      }
    } finally {
      if (isCurrentRequest()) {
        savingRef.current = false
        setSaving(false)
      }
    }
  }, [draftGroup, draftNote, handleRefresh, selectedItem, t, workspaceId])

  const handleRemoved = React.useCallback((removedId: string) => {
    const nextId = chooseSelectionAfterRemoval(allGroups, removedId)
    setItems(current => current.filter(item => item.id !== removedId))
    setSelectedId(nextId)
  }, [allGroups])

  const handleStartResearch = React.useCallback(async () => {
    if (!selectedItem || !refreshStockResearchSession || researchingRef.current) return

    const requestGuard = requestGuardRef.current
    if (!requestGuard) return
    const requestToken = requestGuard.begin('research')
    const requestWorkspaceId = workspaceId
    const isCurrentRequest = () => (
      mountedRef.current && requestGuard.isCurrent(requestToken)
    )
    researchingRef.current = true
    setResearching(true)
    try {
      await startWatchlistResearch({
        workspaceId: requestWorkspaceId,
        item: selectedItem,
        createStockResearchRun: (targetWorkspaceId, request) => (
          window.electronAPI.createStockResearchRun(targetWorkspaceId, request)
        ),
        refreshSessions: async (sessionId) => {
          if (isCurrentRequest()) {
            await refreshStockResearchSession(sessionId, isCurrentRequest)
          }
        },
        navigateToSession: (sessionId) => {
          if (isCurrentRequest()) {
            navigateToSession(sessionId)
          }
        },
      })
    } catch (error) {
      if (isCurrentRequest()) {
        toast.error(error instanceof Error ? error.message : t('watchlist.researchError'))
      }
    } finally {
      if (isCurrentRequest()) {
        researchingRef.current = false
        setResearching(false)
      }
    }
  }, [navigateToSession, refreshStockResearchSession, selectedItem, t, workspaceId])

  const dirty = selectedItem
    ? isWatchlistDraftDirty(selectedItem, draftGroup, draftNote)
    : false
  const listLoadingCurrentWorkspace = Boolean(workspaceId && itemsWorkspaceId !== workspaceId)
    || listLoading
  const listEmpty = !listLoadingCurrentWorkspace && !listError && currentItems.length === 0
  const filterEmpty = !listLoadingCurrentWorkspace
    && !listError
    && currentItems.length > 0
    && filteredItems.length === 0

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <section className="flex w-[340px] min-w-[280px] max-w-[420px] flex-col border-r border-border/70">
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{t('watchlist.title')}</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('watchlist.summary', {
                  items: t('watchlist.itemCount', { count: currentItems.length }),
                  groups: t('watchlist.groupCount', { count: allGroups.length }),
                })}
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)} disabled={!workspaceId}>
              <Plus className="h-4 w-4" />
              {t('watchlist.add')}
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('watchlist.search')}
              aria-label={t('watchlist.search')}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!workspaceId && (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {t('watchlist.selectWorkspace')}
            </div>
          )}
          {workspaceId && listLoadingCurrentWorkspace && (
            <div className="px-4 py-6 text-sm text-muted-foreground">{t('watchlist.loading')}</div>
          )}
          {workspaceId && listError && (
            <div className="px-4 py-6">
              <p className="text-sm text-destructive" role="alert">{listError}</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
                {t('watchlist.retry')}
              </Button>
            </div>
          )}
          {workspaceId && listEmpty && (
            <div className="px-4 py-6 text-sm text-muted-foreground">{t('watchlist.empty')}</div>
          )}
          {workspaceId && filterEmpty && (
            <div className="px-4 py-6 text-sm text-muted-foreground">{t('watchlist.noMatches')}</div>
          )}
          {workspaceId && groups.map(group => (
            <section key={group.storageName}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-y border-border/50 bg-background/95 px-4 py-2 backdrop-blur">
                <h2 className="truncate text-xs font-semibold text-muted-foreground">
                  {group.displayName}
                </h2>
                <span className="text-[11px] text-muted-foreground">{group.items.length}</span>
              </div>
              {group.items.map(item => {
                const selected = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={cn(
                      'block w-full border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/30',
                      selected && 'bg-foreground/[0.05]',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{item.symbol.displaySymbol}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.symbol.market}</span>
                    </div>
                    {item.note && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
                    )}
                  </button>
                )
              })}
            </section>
          ))}
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {!selectedItem && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {t('watchlist.emptyDetail')}
          </div>
        )}
        {selectedItem && (
          <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-7">
            <header className="border-b border-border/70 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    <span>{selectedItem.symbol.market}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="sr-only">, </span>
                    <span>{selectedItem.symbol.currency}</span>
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-semibold tracking-normal">
                    {selectedItem.symbol.displaySymbol}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('watchlist.addedDate', {
                      date: formatAddedDate(
                        selectedItem.createdAt,
                        i18n.resolvedLanguage ?? i18n.language,
                      ),
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveOpen(true)}
                    disabled={saving || researching}
                  >
                    {t('watchlist.remove')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartResearch}
                    disabled={!refreshStockResearchSession || saving || researching}
                  >
                    {researching ? t('watchlist.startingResearch') : t('watchlist.startResearch')}
                  </Button>
                </div>
              </div>
            </header>

            <div className="grid gap-2">
              <label htmlFor={groupInputId} className="text-sm font-medium">{t('watchlist.group')}</label>
              <Input
                id={groupInputId}
                list={groupOptionsId}
                value={draftGroup}
                onChange={(event) => setDraftGroup(event.target.value)}
                placeholder={t('watchlist.groupPlaceholder')}
                disabled={saving}
              />
              <datalist id={groupOptionsId}>
                {groupOptions.map(group => <option key={group} value={group} />)}
              </datalist>
            </div>

            <div className="grid gap-2">
              <label htmlFor={noteInputId} className="text-sm font-medium">{t('watchlist.note')}</label>
              <Textarea
                id={noteInputId}
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder={t('watchlist.notePlaceholder')}
                disabled={saving}
                className="min-h-32"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
              <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={!dirty || saving}>
                {t('watchlist.cancel')}
              </Button>
              <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
                {saving ? t('watchlist.saving') : t('watchlist.save')}
              </Button>
            </div>
          </article>
        )}
      </section>

      <AddWatchlistItemDialog
        open={addOpen}
        workspaceId={workspaceId}
        groupOptions={groupOptions}
        onOpenChange={setAddOpen}
        onAdded={handleAdded}
      />
      <RemoveWatchlistItemDialog
        open={removeOpen}
        workspaceId={workspaceId}
        item={selectedItem}
        onOpenChange={setRemoveOpen}
        onRemoved={handleRemoved}
      />
    </div>
  )
}