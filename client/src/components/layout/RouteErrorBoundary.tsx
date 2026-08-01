import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertCircle, Home, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  let title = 'An unexpected error occurred'
  let message = 'Something went wrong while trying to render this page.'

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`
    message = error.data?.message || error.data || 'We could not find the page you were looking for.'
  } else if (error instanceof Error) {
    title = 'Application Error'
    message = error.message
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="max-w-md w-full shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        
        {/* We can show stack trace in development, but keeping it clean for users usually */}
        {error instanceof Error && import.meta.env.DEV && (
          <CardContent>
            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-md overflow-x-auto text-left">
              <pre className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                {error.stack}
              </pre>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 pb-6 justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto gap-2 bg-white dark:bg-slate-900"
          >
            <RefreshCcw className="w-4 h-4" />
            Try again
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto gap-2 bg-[#e05d38] hover:bg-[#c94f2d] text-white"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
