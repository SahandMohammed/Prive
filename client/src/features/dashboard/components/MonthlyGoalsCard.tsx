interface GoalItem {
  name: string
  percent: number
  color: string
  current?: string
  target?: string
}

interface MonthlyGoalsCardProps {
  isLoading?: boolean
}

export function MonthlyGoalsCard({ isLoading }: MonthlyGoalsCardProps) {
  const goals: GoalItem[] = [
    {
      name: 'Monthly Revenue',
      percent: 88,
      color: '#EA580C',
      current: '48,295',
      target: '55,000',
    },
    {
      name: 'New Customers',
      percent: 85,
      color: '#0D9488',
      current: '847',
    },
    {
      name: 'Conversion Rate',
      percent: 76,
      color: '#0284C7',
    },
  ]

  return (
    <div aria-busy={isLoading || undefined} className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div className="mb-4">
        <h2 className="text-base font-bold font-heading text-foreground">Monthly Goals</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Track progress toward targets</p>
      </div>

      <div className="space-y-4">
        {goals.map((goal, idx) => (
          <div key={idx} className="space-y-1.5">
            {/* Header row: Name & Percentage */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">{goal.name}</span>
              <span className="font-medium text-muted-foreground">{goal.percent}%</span>
            </div>

            {/* Progress track & fill */}
            <div className="h-2.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${goal.percent}%`,
                  backgroundColor: goal.color,
                }}
              />
            </div>

            {/* Subtext: Current & Target */}
            {(goal.current || goal.target) && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                {goal.current && <span>{goal.current}</span>}
                {goal.target && <span className="ml-auto">Target: {goal.target}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
