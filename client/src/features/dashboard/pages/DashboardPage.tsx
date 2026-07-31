import { useCurrentUser } from '@/features/auth'

export function DashboardPage() {
  const { data: user, isPending } = useCurrentUser()

  if (isPending) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold text-foreground">
        Welcome back, {user?.username}
      </h1>
      <p className="text-muted-foreground">
        Role: <span className="font-medium text-foreground">{user?.role}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Today's Revenue</h3>
          <p className="text-3xl font-bold mt-2 text-foreground">$0.00</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Appointments</h3>
          <p className="text-3xl font-bold mt-2 text-foreground">0</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Active Staff</h3>
          <p className="text-3xl font-bold mt-2 text-foreground">0</p>
        </div>
      </div>
    </div>
  )
}
