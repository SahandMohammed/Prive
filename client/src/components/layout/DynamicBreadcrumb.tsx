import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { cn } from '@/lib/utils'

export function DynamicBreadcrumb({ className }: { className?: string } = {}) {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x)

  const formatName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
  }

  return (
    <Breadcrumb className={cn("px-1", className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/" />}>
            <Home className="w-4 h-4 mt-0.5" />
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1
          const to = `/${pathnames.slice(0, index + 1).join('/')}`
          
          return (
            <React.Fragment key={to}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{formatName(value)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={to} />}>
                    {formatName(value)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
