// Placeholder — will render a proper data table once shadcn Table is wired in.
import { useUsers } from '../hooks/useUsers'

export function UserTable() {
  const { data: users, isPending, isError } = useUsers()

  if (isPending) return <p className="text-sm text-gray-500">Loading users…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load users.</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="py-2 pr-4">Username</th>
          <th className="py-2 pr-4">Role</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {users?.map((user) => (
          <tr key={user.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{user.username}</td>
            <td className="py-2 pr-4">{user.role}</td>
            <td className="py-2">
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
