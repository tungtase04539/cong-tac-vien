'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    return <p className="text-gray-500">Bạn không có quyền truy cập.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Quản lý cộng tác viên</h1>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">{u.total_points} điểm</span>
                      <span className="text-sm">· QA: {u.qa_score}%</span>
                      <span className="text-sm">· Ví: {u.wallet_balance.toLocaleString()}đ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={u.level} onValueChange={(v) => updateLevel(u.id, v as UserLevel)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
