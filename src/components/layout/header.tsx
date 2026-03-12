'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { LEVEL_LABELS } from '@/lib/constants'

export function Header() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {profile && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{profile.name}</p>
              <p className="text-xs text-white/50">
                {LEVEL_LABELS[profile.level]} · {profile.total_points} điểm
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-9 w-9 rounded-full cursor-pointer ring-2 ring-violet-500/50 hover:ring-violet-400 transition-all outline-none">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-semibold">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-white/20">
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                  <User className="mr-2 h-4 w-4" />
                  Hồ sơ
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleSignOut} className="text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </header>
  )
}
