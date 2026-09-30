import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas'
import { useLogin } from '../hooks/useLogin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiRequestError } from '@/lib/apiError'
import { Loader2, User, KeyRound, Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
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
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-focus-within:text-foreground transition-colors"
        >
          Username
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-prive-champagne transition-colors">
            <User className="h-4 w-4" />
          </div>
          <Input
            id="username"
            {...register('username')}
            autoComplete="username"
            placeholder="Enter your username"
            className="h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-background/60 dark:bg-muted/30 hover:border-prive-champagne/40 focus:border-prive-champagne focus-visible:border-prive-champagne focus:ring-2 focus:ring-prive-champagne/25 focus-visible:ring-2 focus-visible:ring-prive-champagne/25 focus:outline-none focus-visible:outline-none transition-all duration-200"
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
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-focus-within:text-foreground transition-colors"
          >
            Password
          </Label>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-prive-champagne transition-colors">
            <KeyRound className="h-4 w-4" />
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="h-11 pl-10 pr-11 rounded-xl border border-border/60 bg-background/60 dark:bg-muted/30 hover:border-prive-champagne/40 focus:border-prive-champagne focus-visible:border-prive-champagne focus:ring-2 focus:ring-prive-champagne/25 focus-visible:ring-2 focus-visible:ring-prive-champagne/25 focus:outline-none focus-visible:outline-none transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] cursor-pointer"
        disabled={login.isPending}
      >
        {login.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in to Privé'
        )}
      </Button>

      {login.isError && (
        <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-xl border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
          {login.error instanceof ApiRequestError
            ? login.error.message
            : 'An unexpected error occurred. Please try again.'}
        </div>
      )}
    </form>
  )
}
