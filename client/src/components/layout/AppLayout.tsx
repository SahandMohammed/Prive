import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { DynamicBreadcrumb } from './DynamicBreadcrumb'

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <DynamicBreadcrumb />
          <Outlet />
        </div>
      </main>
    </div>
  )
}
