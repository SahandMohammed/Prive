import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpenIcon, ListIcon, CalculatorIcon } from 'lucide-react'

export function AccountingDashboard() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <ListIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>Manage the hierarchical structure of IFRS accounts.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <BookOpenIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>View the general ledger and all debits/credits.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <CalculatorIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Currencies & Exchange Rates</CardTitle>
            <CardDescription>Manage base and transaction currencies.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
