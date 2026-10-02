import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/features/auth'
import { BranchAccessDialog } from '@/features/business'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUsers } from '../hooks/useUsers'
import type { User } from '../types/users.types'

export function UsersPage() {
  const { t } = useTranslation(['users', 'common'])
  const { data: currentUser } = useCurrentUser()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const users = useUsers(page, pageSize, search)
  const canManageAccess = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Owner'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('users:title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('users:description')}
        </p>
      </div>

      <Input
        aria-label={t('users:searchPlaceholder')}
        placeholder={t('users:searchPlaceholder')}
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(1) }}
        className="max-w-sm"
      />

      {users.isPending ? (
        <p role="status" className="text-sm text-slate-500">{t('users:loading')}</p>
      ) : users.isError ? (
        <p role="alert" className="text-sm text-destructive">{users.error.message}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users:th.username')}</TableHead>
                <TableHead>{t('users:th.role')}</TableHead>
                <TableHead>{t('users:th.status')}</TableHead>
                <TableHead>{t('users:th.branchAccess')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{t(`users:roles.${user.role}`, { defaultValue: user.role })}</TableCell>
                  <TableCell>
                    <span className={user.isActive ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800'}>
                      {user.isActive ? t('users:status.active') : t('users:status.inactive')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.role === 'SuperAdmin' || user.role === 'Owner' ? (
                      t('users:branchAccess.allActiveBranches')
                    ) : canManageAccess ? (
                      <Button variant="outline" size="sm" onClick={() => setEditing(user)}>
                        {t('users:branchAccess.manageBranches')}
                      </Button>
                    ) : (
                      t('users:branchAccess.managedByOwner')
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.data.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">
                    {t('users:noUsers')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalItems={users.data.meta.totalCount}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </>
      )}

      {editing && (
        <BranchAccessDialog
          userId={editing.id}
          username={editing.username}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
