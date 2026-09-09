import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Menu,
  Search,
  Plus,
  Moon,
  Sun,
  Bell,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Languages,
} from 'lucide-react'
import { BranchWorkspace, resetBranchSelection, BranchSelector } from '@/features/business'
import { useCurrentUser } from '@/features/auth'
import { useThemeStore } from '@/lib/theme'
import { useTranslation } from 'react-i18next'
import { changeAppLanguage } from '@/lib/i18n'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: user } = useCurrentUser()
  const { theme, toggleTheme } = useThemeStore()
  const { t, i18n } = useTranslation()

  useEffect(() => () => resetBranchSelection(), [])

  const isRtl = i18n.language === 'ckb'
  const toggleLanguage = () => {
    changeAppLanguage(isRtl ? 'en' : 'ckb')
  }

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'AS'
  const isPosWorkspace = pathname === '/pos' || pathname.startsWith('/pos/')

  if (isPosWorkspace) {
    return (
      <div className="h-screen w-screen overflow-auto bg-background text-foreground">
        <BranchWorkspace>
          <Outlet />
        </BranchWorkspace>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar with Collapse Divider Button */}
      <div className="hidden md:flex h-full shrink-0 relative z-20">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Floating circular collapse toggle button directly on the dividing border */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute ${isRtl ? '-left-3' : '-right-3'} top-20 z-30 size-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground shadow-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer`}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            isRtl ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />
          ) : (
            isRtl ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Backdrop & Sidebar for small screens */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="h-full w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navigation Header matching reference */}
        <header className="h-16 shrink-0 px-4 sm:px-6 md:px-8 border-b border-border/80 flex items-center justify-between bg-card/70 backdrop-blur-md z-10 gap-4">
          {/* Left: Mobile trigger & Search Input */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.searchPlaceholder')}
                className="w-full h-9 ltr:pl-9 ltr:pr-12 rtl:pr-9 rtl:pl-12 rounded-lg bg-neutral-50/80 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
              />
              <span className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-muted-foreground bg-neutral-200/60 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-300/60 dark:border-neutral-700">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right Header Actions matching reference */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Branch Selector */}
            <BranchSelector compact align={isRtl ? 'start' : 'end'} />

            {/* Language Switcher Button (English / کوردی سۆرانی) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
              title={isRtl ? 'Switch to English' : 'گۆڕین بۆ کوردی سۆرانی'}
            >
              <Languages className="size-3.5 text-muted-foreground" />
              <span className="text-[11px]">{isRtl ? 'English' : 'کوردی'}</span>
            </button>

            {/* + New Order / Sale Button */}
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>{t('common.newOrder')}</span>
            </button>

            {/* Theme Toggle (Moon) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>

            {/* Notification Bell with red dot */}
            <button
              type="button"
              className="relative size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute top-2 ltr:right-2 rtl:left-2 size-2 rounded-full bg-rose-500 ring-2 ring-card" />
            </button>

            {/* User Avatar Circle */}
            <div
              onClick={() => navigate('/users')}
              className="size-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer shadow-xs hover:ring-2 hover:ring-neutral-400 transition-all"
              title={user?.username ?? 'Account'}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main
          className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-7 md:p-8 overscroll-contain custom-scrollbar focus:outline-none bg-background relative"
          tabIndex={-1}
        >
          <BranchWorkspace>
            <Outlet />
          </BranchWorkspace>

          {/* Floating Feedback Button in bottom right corner */}
          <button
            type="button"
            onClick={() => {}}
            className="fixed bottom-6 ltr:right-6 rtl:left-6 z-40 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <MessageSquare className="size-3.5 fill-current" />
            <span>{t('common.feedback')}</span>
          </button>
        </main>
      </div>
    </div>
  )
}
