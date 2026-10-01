import type { UserRole } from '@/features/users'

export type Capability = 'pos' | 'managePos' | 'manageProfessionals' | 'salesTrace' | 'inventoryTrace' | 'financeTrace' | 'accountingTrace' | 'manageDollarRate' | 'editPostedInvoice' | 'deletePostedInvoice' | 'correctPosSettlement'

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
    case 'editPostedInvoice': return role === 'SuperAdmin' || role === 'Manager'
    case 'deletePostedInvoice': return role === 'SuperAdmin'
    case 'correctPosSettlement': return role === 'SuperAdmin' || role === 'Manager' || role === 'Owner'
    case 'financeTrace': return financeRoles.includes(role)
  }
}
