import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'

export function ChangePasswordDialog() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  })

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordFormValues) =>
      authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => reset(),
  })

  const onSubmit = (values: ChangePasswordFormValues) => mutation.mutate(values)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input {...register('currentPassword')} type="password" placeholder="Current password" />
        {errors.currentPassword && (
          <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>
      <div>
        <input {...register('newPassword')} type="password" placeholder="New password" />
        {errors.newPassword && (
          <p className="text-sm text-red-600">{errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <input {...register('confirmPassword')} type="password" placeholder="Confirm new password" />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Changing...' : 'Change password'}
      </button>
      {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600">Password changed successfully.</p>
      )}
    </form>
  )
}
