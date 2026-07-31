import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas'
import { useLogin } from '../hooks/useLogin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiRequestError } from '@/lib/apiError'
import { Loader2, User, KeyRound } from 'lucide-react'

export function LoginForm() {
  const navigate = useNavigate()
  // `from` is set by ProtectedRoute when it redirects an unauthenticated user.
  // After a successful login we send them back where they were going.
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const login = useLogin()

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2 group">
        <Label
          htmlFor="username"
          className="text-sm font-medium transition-colors group-focus-within:text-primary"
        >
          Username
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <User className="h-4 w-4" />
          </div>
          <Input
            id="username"
            {...register('username')}
            autoComplete="username"
            placeholder="admin"
            className="pl-10 transition-all duration-300 focus-visible:ring-primary focus-visible:ring-offset-2 border-border/60 bg-background hover:bg-background/80 hover:border-primary/30"
          />
        </div>
        {errors.username && (
          <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-sm font-medium transition-colors group-focus-within:text-primary"
          >
            Password
          </Label>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <KeyRound className="h-4 w-4" />
          </div>
          <Input
            id="password"
            type="password"
            {...register('password')}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-10 transition-all duration-300 focus-visible:ring-primary focus-visible:ring-offset-2 border-border/60 bg-background hover:bg-background/80 hover:border-primary/30"
          />
        </div>
        {errors.password && (
          <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:scale-[0.98]"
        disabled={login.isPending}
      >
        {login.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in to Prive'
        )}
      </Button>

      {login.isError && (
        <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
          {login.error instanceof ApiRequestError
            ? login.error.message
            : 'An unexpected error occurred. Please try again.'}
        </div>
      )}
    </form>
  )
}
