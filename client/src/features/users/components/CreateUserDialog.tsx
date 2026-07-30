// Placeholder — will use shadcn Dialog once the users page is built.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserFormValues } from '../schemas/users.schemas'
import { useCreateUser } from '../hooks/useCreateUser'

export function CreateUserDialog() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
  })
  const createUser = useCreateUser()

  const onSubmit = (values: CreateUserFormValues) =>
    createUser.mutate(values, { onSuccess: () => reset() })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input {...register('username')} placeholder="Username" />
        {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
      </div>
      <div>
        <input {...register('email')} type="email" placeholder="Email" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <select {...register('role')} className="w-full border rounded px-3 py-2 text-sm">
          <option value="">Select role…</option>
          <option value="Admin">Admin</option>
          <option value="User">User</option>
        </select>
        {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
      </div>
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating…' : 'Create user'}
      </button>
      {createUser.isError && (
        <p className="text-sm text-red-600">{createUser.error.message}</p>
      )}
    </form>
  )
}
