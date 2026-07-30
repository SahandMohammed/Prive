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
          <th className="py-2 pr-4">Email</th>
          <th className="py-2">Role</th>
        </tr>
      </thead>
      <tbody>
        {users?.map((user) => (
          <tr key={user.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{user.username}</td>
            <td className="py-2 pr-4">{user.email}</td>
            <td className="py-2">{user.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
