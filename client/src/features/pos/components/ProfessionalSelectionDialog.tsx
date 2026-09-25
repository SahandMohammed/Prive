import { Check, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { PosProfessional } from '../types/pos.types'

export function ProfessionalSelectionDialog({
  open,
  professionals,
  selectedProfessionalId,
  onSelect,
  onContinue,
  onOpenChange,
}: {
  open: boolean
  professionals: PosProfessional[]
  selectedProfessionalId: string | null
  onSelect: (professionalId: string) => void
  onContinue: () => void
  onOpenChange: (open: boolean) => void
}) {
  const hasProfessionals = professionals.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Master</DialogTitle>
          <DialogDescription>
            A Master is required for every service in this sale. Products are not assigned to a Master.
          </DialogDescription>
        </DialogHeader>

        {hasProfessionals ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {professionals.map((professional) => {
              const selected = professional.id === selectedProfessionalId
              return (
                <button
                  key={professional.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(professional.id)}
                  className={cn(
                    'flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-muted'
                  )}
                >
                  <UserRound className="size-5" />
                  <span className="min-w-0 flex-1 truncate">{professional.username}</span>
                  {selected && <Check className="size-5" aria-label="Selected" />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
            No eligible Masters are available for this branch. Add or assign a Professional before completing a service sale.
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="h-12" onClick={() => onOpenChange(false)}>Back to sale</Button>
          <Button type="button" className="h-12 min-w-36" disabled={!hasProfessionals || !selectedProfessionalId} onClick={onContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
