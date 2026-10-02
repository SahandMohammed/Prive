import { Navigate, Outlet } from 'react-router-dom'
import { hasCapability, useCurrentUser, type Capability } from '@/features/auth'

export function CapabilityRoute({ capability }: { capability: Capability }) {
  const user = useCurrentUser()
  if (user.isPending) return null
  if (!hasCapability(user.data?.role, capability)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
