import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas'
import { useLogin } from '../hooks/useLogin'

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })
  const login = useLogin()

  const onSubmit = (values: LoginFormValues) => login.mutate(values)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input {...register('username')} placeholder="Username" />
        {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
      </div>
      <div>
        <input {...register('password')} type="password" placeholder="Password" />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Signing in...' : 'Sign in'}
      </button>
      {login.isError && <p className="text-sm text-red-600">{login.error.message}</p>}
    </form>
  )
}
