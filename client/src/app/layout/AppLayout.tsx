import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { BranchWorkspace, resetBranchSelection } from '@/features/business'
import { Sidebar } from './Sidebar'
import { DynamicBreadcrumb } from '@/components/layout/DynamicBreadcrumb'

export function AppLayout() {
  useEffect(() => () => resetBranchSelection(), [])
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <DynamicBreadcrumb />
          <BranchWorkspace><Outlet /></BranchWorkspace>
        </div>
      </main>
    </div>
  )
}
