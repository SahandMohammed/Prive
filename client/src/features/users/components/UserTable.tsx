// Placeholder — will render a proper data table once shadcn Table is wired in.
import { useTranslation } from 'react-i18next'
import { useUsers } from '../hooks/useUsers'

export function UserTable() {
  const { t } = useTranslation(['users', 'common'])
  const { data: users, isPending, isError } = useUsers()

  if (isPending) return <p className="text-sm text-muted-foreground">{t('users:loading')}</p>
  if (isError) return <p className="text-sm text-destructive">{t('users:failedToLoad')}</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-start text-muted-foreground">
          <th className="py-2 pe-4">{t('users:th.username')}</th>
          <th className="py-2 pe-4">{t('users:th.role')}</th>
          <th className="py-2">{t('users:th.status')}</th>
        </tr>
      </thead>
      <tbody>
        {users?.data.map((user) => (
          <tr key={user.id} className="border-b last:border-0">
            <td className="py-2 pe-4">{user.username}</td>
            <td className="py-2 pe-4">{t(`users:roles.${user.role}`, { defaultValue: user.role })}</td>
            <td className="py-2">
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                {user.isActive ? t('users:status.active') : t('users:status.inactive')}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
