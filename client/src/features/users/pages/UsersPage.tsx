import { useState } from 'react'
import { useCurrentUser } from '@/features/auth'
import { BranchAccessDialog } from '@/features/business'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUsers } from '../hooks/useUsers'
import type { User } from '../types/users.types'

export function UsersPage() {
  const { data: currentUser } = useCurrentUser()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const users = useUsers(page, pageSize, search)
  const canManageAccess = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Owner'
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Users</h1><p className="mt-1 text-sm text-muted-foreground">Manage access to branch workspaces. SuperAdmins and Owners have access to every active branch.</p></div>
    <Input aria-label="Search users" placeholder="Search users" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="max-w-sm" />
    {users.isPending ? <p role="status">Loading users…</p> : users.isError ? <p role="alert" className="text-destructive">{users.error.message}</p> : <>
      <Table><TableHeader><TableRow><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Branch access</TableHead></TableRow></TableHeader><TableBody>
        {users.data.data.map(user => <TableRow key={user.id}><TableCell>{user.username}</TableCell><TableCell>{user.role}</TableCell><TableCell>{user.isActive ? 'Active' : 'Inactive'}</TableCell><TableCell>{user.role === 'SuperAdmin' || user.role === 'Owner' ? 'All active branches' : canManageAccess ? <Button variant="outline" size="sm" onClick={() => setEditing(user)}>Manage branches</Button> : 'Managed by an Owner or SuperAdmin'}</TableCell></TableRow>)}
        {users.data.data.length === 0 && <TableRow><TableCell colSpan={4}>No users found.</TableCell></TableRow>}
      </TableBody></Table>
      <DataTablePagination page={page} pageSize={pageSize} totalItems={users.data.meta.totalCount} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1) }} />
    </>}
    {editing && <BranchAccessDialog userId={editing.id} username={editing.username} onClose={() => setEditing(null)} />}
  </div>
}
