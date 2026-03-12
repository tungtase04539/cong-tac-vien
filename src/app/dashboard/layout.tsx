'use client'

import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Đang tải...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Vui lòng đăng nhập</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Floating gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #8b5cf6, transparent)',
            animation: 'float 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-3/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #d946ef, transparent)',
            animation: 'float-delayed 25s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #06b6d4, transparent)',
            animation: 'float-slow 30s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content */}
      <Sidebar userRole={profile.role} />
      <div className="flex-1 flex flex-col relative z-10">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
