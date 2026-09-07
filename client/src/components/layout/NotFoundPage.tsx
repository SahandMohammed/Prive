import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft, LayoutDashboard, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NotFoundPageProps {
  standalone?: boolean
}

export function NotFoundPage({ standalone = false }: NotFoundPageProps) {
  const navigate = useNavigate()

  const quickLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'POS Terminal', path: '/pos' },
    { label: 'Sales Invoices', path: '/sales/invoices' },
    { label: 'Expenses', path: '/expenses' },
    { label: 'Inventory', path: '/inventory' },
  ]

  const content = (
    <div className="max-w-lg w-full text-center space-y-6">
      {/* Icon Emblem */}
      <div className="relative mx-auto size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
        <FileQuestion className="size-10 text-primary" />
        <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-amber-500 ring-4 ring-background flex items-center justify-center">
          <span className="size-1.5 rounded-full bg-white animate-ping" />
        </span>
      </div>

      {/* Heading and copy */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
          <span>Error 404</span>
          <span>•</span>
          <span>Not Found</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          The page or resource you are looking for does not exist, was moved, or is temporarily unavailable.
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/dashboard')
            }
          }}
          className="w-full sm:w-auto gap-2 border-border shadow-2xs"
        >
          <ArrowLeft className="size-4" />
          <span>Go Back</span>
        </Button>

        <Button
          onClick={() => navigate('/dashboard')}
          className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          <LayoutDashboard className="size-4" />
          <span>Go to Dashboard</span>
        </Button>
      </div>

      {/* Quick Navigation Suggestions */}
      <div className="pt-4 border-t border-border/80">
        <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1.5 font-medium">
          <Search className="size-3 text-muted-foreground" />
          <span>Common destinations:</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.path}
              type="button"
              onClick={() => navigate(link.path)}
              className="text-xs px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (standalone) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-xs max-w-xl w-full flex justify-center">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-4">
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-xs max-w-xl w-full flex justify-center">
        {content}
      </div>
    </div>
  )
}
