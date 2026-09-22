import { useMemo, useState } from 'react'
import { useAccountTree } from '@/features/accounting'
import { MoneyAccountType } from '@/features/finance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreatePosDrawerMovement, usePosDrawerMovements, usePosSession, usePosSetup } from '../hooks/usePos'
import { PosDrawerAdjustmentDirection, PosDrawerMovementType } from '../types/pos.types'

export function DrawerMovementDialog({ sessionId, open, onOpenChange }: { sessionId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const session = usePosSession(sessionId)
  const setup = usePosSetup()
  const movements = usePosDrawerMovements(open ? sessionId : undefined)
  const accounts = useAccountTree()
  const create = useCreatePosDrawerMovement()
  const [type, setType] = useState<PosDrawerMovementType>(PosDrawerMovementType.CashIn)
  const [direction, setDirection] = useState<PosDrawerAdjustmentDirection>(PosDrawerAdjustmentDirection.In)
  const [cashboxId, setCashboxId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [offsetId, setOffsetId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const allowedCurrencyIds = useMemo(() => new Set(session.data?.openingCounts.map((count) => count.currencyId) ?? []), [session.data])
  const cashboxes = (setup.data?.moneyAccounts ?? []).filter((account) => account.type === MoneyAccountType.Cashbox && allowedCurrencyIds.has(account.currencyId) && account.currentExchangeRate !== null)
  const selectedCashbox = cashboxes.find((account) => account.id === cashboxId)
  const destinations = (setup.data?.moneyAccounts ?? []).filter((account) => account.id !== cashboxId && selectedCashbox?.currencyId === account.currencyId && account.currentExchangeRate !== null)
  const postingAccounts = (accounts.data ?? []).filter((account) => account.isActive && !account.isGroup)
  const cashDrop = type === PosDrawerMovementType.CashDrop
  const adjustment = type === PosDrawerMovementType.Adjustment

  const submit = () => {
    if (!cashboxId || !reason.trim() || !Number(amount) || (cashDrop ? !destinationId : !offsetId)) return
    create.mutate({ sessionId, body: { type, adjustmentDirection: adjustment ? direction : null, cashboxMoneyAccountId: cashboxId, destinationMoneyAccountId: cashDrop ? destinationId : null, offsetAccountId: cashDrop ? null : offsetId, amount: Number(amount), reason: reason.trim(), notes: notes.trim() || null } }, { onSuccess: () => { setAmount(''); setReason(''); setNotes(''); onOpenChange(false) } })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Drawer movement</DialogTitle><DialogDescription>Post an immutable, journal-backed movement against this open POS session.</DialogDescription></DialogHeader>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Type<select className="h-9 rounded-md border border-input bg-background px-3" value={type} onChange={(event) => setType(Number(event.target.value) as PosDrawerMovementType)}><option value={PosDrawerMovementType.CashIn}>Cash In</option><option value={PosDrawerMovementType.CashOut}>Cash Out</option><option value={PosDrawerMovementType.CashDrop}>Cash Drop</option><option value={PosDrawerMovementType.Adjustment}>Adjustment</option></select></label>
      {adjustment && <label className="grid gap-1 text-sm">Direction<select className="h-9 rounded-md border border-input bg-background px-3" value={direction} onChange={(event) => setDirection(Number(event.target.value) as PosDrawerAdjustmentDirection)}><option value={PosDrawerAdjustmentDirection.In}>In</option><option value={PosDrawerAdjustmentDirection.Out}>Out</option></select></label>}
      <label className="grid gap-1 text-sm">Cashbox<select className="h-9 rounded-md border border-input bg-background px-3" value={cashboxId} onChange={(event) => { setCashboxId(event.target.value); setDestinationId('') }}><option value="">Select Cashbox</option>{cashboxes.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.currencyCode}</option>)}</select></label>
      {cashDrop ? <label className="grid gap-1 text-sm">Destination<select className="h-9 rounded-md border border-input bg-background px-3" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}><option value="">Select destination</option>{destinations.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></label> : <label className="grid gap-1 text-sm">Offset account<select className="h-9 rounded-md border border-input bg-background px-3" value={offsetId} onChange={(event) => setOffsetId(event.target.value)}><option value="">Select posting account</option>{postingAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></label>}
      <label className="grid gap-1 text-sm">Amount<Input type="number" min="0.0001" step="0.0001" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">Reason<Input maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    </div>
    <label className="grid gap-1 text-sm">Notes<textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
    <div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">Session movement history</p>{movements.isPending ? <p className="text-sm text-muted-foreground">Loading movements…</p> : (movements.data?.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No movements posted.</p> : (movements.data?.data ?? []).map((movement) => <div key={movement.id} className="flex justify-between text-sm"><span>{movement.documentNumber} · {movement.type} · {movement.reason}</span><span className="font-mono">{movement.amount.toLocaleString()} {movement.currencyCode}</span></div>)}</div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Posting…' : 'Post movement'}</Button></DialogFooter>
  </DialogContent></Dialog>
}
