import { isValidElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { router } from './router'

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>()
  return {
    ...actual,
    changeAppLanguage: vi.fn(),
  }
})
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
  it('exposes the direct POS workspace without legacy session routes', () => {
    const workspace = findRoute(router.routes as RouteNode[], '/pos')

    expect(workspace).toBeDefined()
    expect(isValidElement(workspace?.element)).toBe(true)
    expect(findRoute(router.routes as RouteNode[], '/pos/workspace')).toBeUndefined()
    expect(findRoute(router.routes as RouteNode[], '/pos/sessions')).toBeUndefined()
    expect(findRoute(router.routes as RouteNode[], '/pos/z-reports/:id')).toBeUndefined()
  })
})
