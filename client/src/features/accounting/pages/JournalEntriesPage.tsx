import { useLedger } from '@/features/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { JournalEntryDto, JournalEntryLineDto } from '@/features/finance'

export function JournalEntriesPage() {
  const { data: ledger, isLoading } = useLedger()

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
        <p className="text-sm text-muted-foreground">
          Double-entry general ledger containing all posted transactions (Debits == Credits).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Ledger</CardTitle>
          <CardDescription>Review journal vouchers, system transactions, and balances.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading ledger entries...</p>
          ) : ledger && ledger.length > 0 ? (
            <div className="space-y-6">
              {ledger.map((entry: JournalEntryDto) => (
                <div key={entry.id} className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                  <div className="p-4 bg-muted/30 border-b border-border flex flex-wrap justify-between items-center gap-2">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">Ref ID: {entry.referenceId || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-muted-foreground">
                        {formatDate(entry.entryDateUtc)}
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Code / Name</TableHead>
                        <TableHead className="text-right">Debit (Tx)</TableHead>
                        <TableHead className="text-right">Credit (Tx)</TableHead>
                        <TableHead className="text-right">Debit (Base)</TableHead>
                        <TableHead className="text-right">Credit (Base)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((line: JournalEntryLineDto) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono text-xs">
                            <span className="font-semibold text-secondary-foreground">{line.account?.code}</span> - {line.account?.name}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-600 font-semibold">
                            {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-rose-600 font-semibold">
                            {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-600/70">
                            {line.baseDebit > 0 ? line.baseDebit.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-rose-600/70">
                            {line.baseCredit > 0 ? line.baseCredit.toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No general ledger transactions posted. Output an Invoice or Voucher to generate entries.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
