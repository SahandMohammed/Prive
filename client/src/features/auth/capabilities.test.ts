import { describe, expect, it } from 'vitest'
import { hasCapability } from './capabilities'

describe('posted invoice capabilities', () => {
  it('allows Manager and SuperAdmin to edit posted invoices', () => {
    expect(hasCapability('Manager', 'editPostedInvoice')).toBe(true)
    expect(hasCapability('SuperAdmin', 'editPostedInvoice')).toBe(true)
    expect(hasCapability('Owner', 'editPostedInvoice')).toBe(false)
  })

  it('allows only SuperAdmin to delete posted invoices', () => {
    expect(hasCapability('SuperAdmin', 'deletePostedInvoice')).toBe(true)
    expect(hasCapability('Manager', 'deletePostedInvoice')).toBe(false)
    expect(hasCapability('Owner', 'deletePostedInvoice')).toBe(false)
  })
})
