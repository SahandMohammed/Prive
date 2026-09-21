import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { router } from './router'

vi.mock('@/lib/i18n', () => ({ changeAppLanguage: vi.fn() }))
vi.mock('@/lib/theme', () => ({
  useThemeStore: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

type RouteNode = {
  path?: string
  element?: ReactNode
  children?: RouteNode[]
}

function findRoute(routes: RouteNode[], path: string): RouteNode | undefined {
  for (const route of routes) {
    if (route.path === path) return route
    const child = route.children ? findRoute(route.children, path) : undefined
    if (child) return child
  }
  return undefined
}

describe('POS route contracts', () => {
  it('keeps the legacy sessions URL redirected to the POS dashboard', () => {
    const route = findRoute(router.routes as RouteNode[], '/pos/sessions')

    expect(route).toBeDefined()
    expect(isValidElement(route?.element)).toBe(true)
    const redirect = route?.element as ReactElement<{ to: string, replace: boolean }>
    expect(redirect.type).toBe(Navigate)
    expect(redirect.props).toMatchObject({ to: '/pos', replace: true })
  })
})
