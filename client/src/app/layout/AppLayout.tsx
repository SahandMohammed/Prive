import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, Sparkles } from 'lucide-react'
import { BranchWorkspace, resetBranchSelection } from '@/features/business'
import { Sidebar } from './Sidebar'
import { DynamicBreadcrumb } from '@/components/layout/DynamicBreadcrumb'

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => () => resetBranchSelection(), [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-200/60 dark:bg-zinc-950 p-2 sm:p-2.5 md:p-3 gap-2.5 md:gap-3">
      {/* Desktop Sidebar Island (Rounded container, locked scroll inside) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar for small viewports */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="h-full w-[280px] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Workspace Rounded Island */}
      <main className="flex-1 flex flex-col min-w-0 h-full rounded-2xl md:rounded-[1.25rem] bg-background border border-border/80 shadow-xs overflow-hidden">
        {/* Sticky Architectural Header */}
        <header className="h-13 sm:h-14 shrink-0 px-4 sm:px-6 md:px-8 border-b border-border/60 flex items-center justify-between bg-card z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" />
            </button>

            {/* Breadcrumb path */}
            <DynamicBreadcrumb />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="size-3 text-amber-500" />
              <span>Privé Studio</span>
            </span>
          </div>
        </header>

        {/* Locked Scroll Container Viewport */}
        <div
          className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 md:p-8 overscroll-contain custom-scrollbar focus:outline-none bg-background"
          tabIndex={-1}
        >
          <BranchWorkspace>
            <Outlet />
          </BranchWorkspace>
        </div>
      </main>
    </div>
  )
}
