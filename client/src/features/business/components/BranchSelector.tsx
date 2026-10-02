import { useIsMutating } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import { useCurrentUser } from '@/features/auth'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBranchAccess } from '../hooks/useBranchAccess'
import { selectBranch, useBranchSelectionStore } from '../stores/branch-selection.store'
import { cn } from '@/lib/utils'

export interface BranchSelectorProps {
  compact?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function BranchSelector({ compact = false, align, className }: BranchSelectorProps = {}) {
  const { t } = useTranslation(['business', 'common'])
  const { data: user } = useCurrentUser()
  const branches = useBranchAccess()
  const { userId, branchId, switching } = useBranchSelectionStore()
  const pendingMutations = useIsMutating()
  const selected = userId === user?.id ? branches.data?.find(branch => branch.id === branchId) : undefined

  const tooltip = branches.isError
    ? t('business:selector.tooltips.couldNotLoad')
    : branches.data?.length === 0
      ? t('business:selector.tooltips.noActive')
      : pendingMutations > 0
        ? t('business:selector.tooltips.finishSaving')
        : selected
          ? `${selected.code} — ${selected.name}`
          : t('business:selector.selectBranch')


  if (compact) {
    return (
      <div className={cn('relative inline-flex items-center gap-1.5', className)}>
        <label id="branch-selector-label" className="sr-only">{t('business:selector.currentBranch')}</label>
        <Select
          value={selected?.id ?? null}
          onValueChange={value => { if (user && value) void selectBranch(user.id, value) }}
          disabled={branches.isPending || branches.isError || switching || pendingMutations > 0 || !branches.data?.length}
        >
          <SelectTrigger
            aria-labelledby="branch-selector-label"
            title={tooltip}
            className="h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border border-border/70 bg-card hover:bg-neutral-100 dark:hover:bg-neutral-800 text-foreground transition-all cursor-pointer shadow-2xs min-w-[130px] sm:min-w-[170px] max-w-[210px] gap-2"
          >
            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
            <SelectValue>
              {selected ? `${selected.code} — ${selected.name}` : branches.isPending ? t('business:selector.loading') : t('business:selector.selectBranch')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align={align ?? 'end'}>
            {branches.data?.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.code} — {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {branches.isError && (
          <div role="alert" className="text-xs text-destructive flex items-center gap-1">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" onClick={() => void branches.refetch()}>
              {t('business:selector.retry')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label id="branch-selector-label" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Building2 className="size-4" />
        {t('business:selector.currentBranch')}
      </label>
      <Select
        value={selected?.id ?? null}
        onValueChange={value => { if (user && value) void selectBranch(user.id, value) }}
        disabled={branches.isPending || branches.isError || switching || pendingMutations > 0 || !branches.data?.length}
      >
        <SelectTrigger aria-labelledby="branch-selector-label" className="w-full" title={tooltip}>
          <SelectValue>{selected ? `${selected.code} — ${selected.name}` : branches.isPending ? t('business:selector.loading') : t('business:selector.selectBranch')}</SelectValue>
        </SelectTrigger>
        <SelectContent align={align}>
          {branches.data?.map(branch => <SelectItem key={branch.id} value={branch.id}>{branch.code} — {branch.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {branches.isError && <div role="alert" className="text-xs text-destructive">{t('business:selector.tooltips.couldNotLoad')}. <Button variant="link" size="sm" onClick={() => void branches.refetch()}>{t('business:selector.retry')}</Button></div>}
      {branches.data?.length === 0 && <p className="text-xs text-muted-foreground">{t('business:selector.noActiveBranches')}</p>}
      {pendingMutations > 0 && <p className="text-xs text-muted-foreground">{t('business:selector.finishSaving')}</p>}
    </div>
  )
}
