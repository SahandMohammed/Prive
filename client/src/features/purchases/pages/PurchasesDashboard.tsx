import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StoreIcon, PackageIcon, Undo2Icon } from 'lucide-react'

export function PurchasesDashboard() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <PackageIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Purchase Invoices</CardTitle>
            <CardDescription>Create and manage purchases from vendors.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <Undo2Icon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Purchase Returns</CardTitle>
            <CardDescription>Process returns to vendors and debit notes.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <StoreIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Vendors</CardTitle>
            <CardDescription>Manage supplier database and view statements.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Create Purchase Invoice</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Here we will implement the dedicated form specifically designed for Purchase Invoices (Items, Costs, Vendor selection, etc).
            </p>
            {/* Dedicated Purchase Invoice UI will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
