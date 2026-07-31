import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WalletIcon, FileTextIcon, RefreshCcwIcon } from 'lucide-react'

export function FinanceDashboard() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Finance & Treasury</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <WalletIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Treasury (Safes & Banks)</CardTitle>
            <CardDescription>Manage your cash boxes and bank accounts.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <FileTextIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Vouchers (Receipts & Payments)</CardTitle>
            <CardDescription>Record money moving in and out of the business.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <RefreshCcwIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Internal Transfers & Exchange</CardTitle>
            <CardDescription>Transfer funds between safes and exchange currencies.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
