'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ROLE_LABELS, LEVEL_LABELS } from '@/lib/constants'

export default function ProfilePage() {
  const { profile } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', profile.id)

    if (error) {
      toast.error('Lỗi khi cập nhật')
    } else {
      toast.success('Đã cập nhật hồ sơ')
    }
    setSaving(false)
  }

  if (!profile) return null

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Hồ sơ cá nhân</h1>

      <div className="glass-card p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Thông tin</h2>
        <div className="space-y-2">
          <Label className="text-white/80">Họ tên</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="glass-input" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Email</Label>
          <Input value={profile.email} disabled className="glass-input opacity-60" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-btn">
          {saving ? 'Đang lưu...' : 'Cập nhật'}
        </Button>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Thống kê</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/50">Vai trò</p>
            <Badge className="bg-violet-500/20 text-violet-300 mt-1">{ROLE_LABELS[profile.role]}</Badge>
          </div>
          <div>
            <p className="text-white/50">Cấp độ</p>
            <Badge className="bg-blue-500/20 text-blue-300 mt-1">{LEVEL_LABELS[profile.level]}</Badge>
          </div>
          <div>
            <p className="text-white/50">QA Score</p>
            <p className="font-bold text-lg text-white">{profile.qa_score}%</p>
          </div>
          <div>
            <p className="text-white/50">Tổng điểm</p>
            <p className="font-bold text-lg text-white">{profile.total_points}</p>
          </div>
          <div>
            <p className="text-white/50">Số dư ví</p>
            <p className="font-bold text-lg text-white">{profile.wallet_balance.toLocaleString()}đ</p>
          </div>
          <div>
            <p className="text-white/50">Ngày tham gia</p>
            <p className="font-medium text-white">{new Date(profile.created_at).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
