import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'prive_theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // Ignore localStorage errors
  }
  return 'light' // Default to light mode as requested
}

function applyThemeToDocument(theme: Theme) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// Initial application
if (typeof window !== 'undefined') {
  applyThemeToDocument(getInitialTheme())
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore localStorage errors
    }
    applyThemeToDocument(theme)
    set({ theme })
  },
  toggleTheme: () => {
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Ignore localStorage errors
      }
      applyThemeToDocument(next)
      return { theme: next }
    })
  },
}))
