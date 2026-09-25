import type { UserRole } from '@/features/users'

export type Capability = 'pos' | 'managePos' | 'manageProfessionals' | 'salesTrace' | 'inventoryTrace' | 'financeTrace' | 'accountingTrace' | 'manageDollarRate'

const managementRoles: UserRole[] = ['SuperAdmin', 'Manager', 'Owner']
const traceRoles: UserRole[] = ['SuperAdmin', 'Manager']
const financeRoles: UserRole[] = ['SuperAdmin', 'Manager', 'Owner', 'Cashier']

export function hasCapability(role: UserRole | undefined, capability: Capability) {
  if (!role) return false
  switch (capability) {
    case 'pos': return managementRoles.includes(role) || role === 'Cashier'
    case 'managePos':
    case 'manageProfessionals':
    case 'manageDollarRate': return managementRoles.includes(role)
    case 'salesTrace':
    case 'inventoryTrace':
    case 'accountingTrace': return traceRoles.includes(role)
    case 'financeTrace': return financeRoles.includes(role)
  }
}
