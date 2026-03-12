'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, ClipboardList, FileCheck,
  Wallet, Trophy, User, Settings, Users, CreditCard, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/lib/constants'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Trang chủ', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Task Market', icon: ShoppingBag },
  { href: '/dashboard/my-tasks', label: 'Task của tôi', icon: ClipboardList },
  { href: '/dashboard/submissions', label: 'Submissions', icon: FileCheck },
  { href: '/dashboard/qa', label: 'QA Review', icon: Shield, roles: ['qa', 'admin'] },
  { href: '/dashboard/wallet', label: 'Ví điểm', icon: Wallet },
  { href: '/dashboard/leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
  { href: '/dashboard/profile', label: 'Hồ sơ', icon: User },
  // Admin
  { href: '/dashboard/admin', label: 'Dashboard Admin', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/dashboard/admin/tasks', label: 'Quản lý Task', icon: Settings, roles: ['admin'] },
  { href: '/dashboard/admin/users', label: 'Quản lý CTV', icon: Users, roles: ['admin'] },
  { href: '/dashboard/admin/payments', label: 'Thanh toán', icon: CreditCard, roles: ['admin'] },
]

interface SidebarProps {
  userRole: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  const mainItems = visibleItems.filter(i => !i.roles?.includes('admin'))
  const adminItems = visibleItems.filter(i => i.roles?.includes('admin'))

  return (
    <aside className="w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 min-h-screen p-4 flex flex-col relative z-10">
      <div className="mb-8">
        <h1 className="text-xl font-bold gradient-text">Wiki CTV OS</h1>
        <p className="text-xs text-white/50 mt-1">{ROLE_LABELS[userRole]}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {mainItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive && 'text-violet-400')} />
              {item.label}
            </Link>
          )
        })}

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Admin</p>
            </div>
            {adminItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className={cn('h-4 w-4', isActive && 'text-violet-400')} />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>
    </aside>
  )
}
