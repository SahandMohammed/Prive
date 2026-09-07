import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from './NotFoundPage'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage standalone />
  }

  let title = 'Application Error'
  let message = 'Something went wrong while trying to render this page.'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    message =
      error.data?.message ||
      (typeof error.data === 'string'
        ? error.data
        : 'We encountered an error processing your request.')
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs max-w-md w-full space-y-6 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shadow-xs">
          <AlertTriangle className="size-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {error instanceof Error && import.meta.env.DEV && (
          <div className="p-3 bg-muted/50 border border-border/60 rounded-lg overflow-x-auto text-left">
            <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-all">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto gap-2 border-border shadow-2xs"
          >
            <RefreshCcw className="size-4" />
            <span>Reload Page</span>
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Home className="size-4" />
            <span>Go to Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

