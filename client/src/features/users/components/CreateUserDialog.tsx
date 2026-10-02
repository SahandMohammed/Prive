// Placeholder — will use shadcn Dialog once the users page is built.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { createUserSchema, type CreateUserFormValues } from '../schemas/users.schemas'
import { useCreateUser } from '../hooks/useCreateUser'

export function CreateUserDialog() {
  const { t } = useTranslation(['users', 'common'])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { mustChangePassword: true }
  })
  const createUser = useCreateUser()

  const onSubmit = (values: CreateUserFormValues) =>
    createUser.mutate(values, { onSuccess: () => reset() })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register('username')}
          placeholder={t('users:createDialog.usernamePlaceholder')}
          className="w-full border rounded px-3 py-2 text-sm text-start"
        />
        {errors.username && <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>}
      </div>
      <div>
        <input
          {...register('password')}
          type="password"
          placeholder={t('users:createDialog.tempPasswordPlaceholder')}
          className="w-full border rounded px-3 py-2 text-sm text-start"
        />
        {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
      </div>
      <div>
        <select {...register('role')} className="w-full border rounded px-3 py-2 text-sm text-start">
          <option value="">{t('users:createDialog.selectRole')}</option>
          <option value="Manager">{t('users:roles.Manager')}</option>
          <option value="Owner">{t('users:roles.Owner')}</option>
          <option value="Professional">{t('users:roles.Professional')}</option>
          <option value="Cashier">{t('users:roles.Cashier')}</option>
          <option value="SuperAdmin">{t('users:roles.SuperAdmin')}</option>
          <option value="Unassigned">{t('users:roles.Unassigned')}</option>
        </select>
        {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>}
      </div>
      <button
        type="submit"
        disabled={createUser.isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {createUser.isPending ? t('users:createDialog.creating') : t('users:createDialog.submit')}
      </button>
      {createUser.isError && (
        <p className="text-sm text-red-600 mt-1">{createUser.error.message}</p>
      )}
    </form>
  )
}
