'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <h1 className="text-2xl font-bold mb-6">Hồ sơ cá nhân</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Thông tin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Họ tên</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Cập nhật'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thống kê</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Vai trò</p>
              <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            </div>
            <div>
              <p className="text-gray-500">Cấp độ</p>
              <Badge variant="secondary">{LEVEL_LABELS[profile.level]}</Badge>
            </div>
            <div>
              <p className="text-gray-500">QA Score</p>
              <p className="font-bold text-lg">{profile.qa_score}%</p>
            </div>
            <div>
              <p className="text-gray-500">Tổng điểm</p>
              <p className="font-bold text-lg">{profile.total_points}</p>
            </div>
            <div>
              <p className="text-gray-500">Số dư ví</p>
              <p className="font-bold text-lg">{profile.wallet_balance.toLocaleString()}đ</p>
            </div>
            <div>
              <p className="text-gray-500">Ngày tham gia</p>
              <p className="font-medium">{new Date(profile.created_at).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
