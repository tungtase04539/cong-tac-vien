'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { ROLE_LABELS, LEVEL_LABELS } from '@/lib/constants'
import type { Profile, UserRole, UserLevel } from '@/types'

export default function AdminUsersPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false })

    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function updateRole(userId: string, role: UserRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) toast.error('Lỗi cập nhật')
    else {
      toast.success('Đã cập nhật vai trò')
      loadUsers()
    }
  }

  async function updateLevel(userId: string, level: UserLevel) {
    const { error } = await supabase.from('profiles').update({ level }).eq('id', userId)
    if (error) toast.error('Lỗi cập nhật')
    else {
      toast.success('Đã cập nhật cấp độ')
      loadUsers()
    }
  }

  if (!profile || profile.role !== 'admin') {
    return <p className="text-white/50">Bạn không có quyền truy cập.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Quản lý cộng tác viên</h1>

      {loading ? (
        <p className="text-white/50">Đang tải...</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-sm text-white/40">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-white/50">
                    <span>{u.total_points} điểm</span>
                    <span>· QA: {u.qa_score}%</span>
                    <span>· Ví: {u.wallet_balance.toLocaleString()}đ</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                    className="rounded-lg px-3 py-1.5 text-sm glass-input"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <select
                    value={u.level}
                    onChange={(e) => updateLevel(u.id, e.target.value as UserLevel)}
                    className="rounded-lg px-3 py-1.5 text-sm glass-input"
                  >
                    {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
