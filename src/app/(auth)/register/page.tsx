'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('localizer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ name, role }).eq('id', user.id)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', animation: 'float 20s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #d946ef, transparent)', animation: 'float-delayed 25s ease-in-out infinite' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold gradient-text">Đăng ký tài khoản</h1>
            <p className="text-white/50 mt-2">Tham gia Wiki Contributor OS</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/80">Họ tên</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Vai trò</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg px-3 py-2.5 text-sm glass-input"
              >
                <option value="scout">Scout — Tìm nguồn nội dung</option>
                <option value="localizer">Localizer — Dịch & biên tập</option>
                <option value="qa">QA — Kiểm tra chất lượng</option>
              </select>
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <Button type="submit" className="w-full gradient-btn h-11 text-base font-semibold" disabled={loading}>
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-white/50">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
