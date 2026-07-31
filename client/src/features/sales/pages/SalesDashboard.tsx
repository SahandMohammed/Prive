import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersIcon, ShoppingCartIcon, Undo2Icon } from 'lucide-react'

export function SalesDashboard() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <ShoppingCartIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Sales Invoices</CardTitle>
            <CardDescription>Create and manage sales to customers.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <Undo2Icon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Sales Returns</CardTitle>
            <CardDescription>Process customer returns and credit notes.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <UsersIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Customers</CardTitle>
            <CardDescription>Manage customer database and view statements.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Create Sales Invoice</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Here we will implement the dedicated form specifically designed for Sales Invoices (Items, Quantities, Prices, Customer selection, etc).
            </p>
            {/* Dedicated Sales Invoice UI will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
