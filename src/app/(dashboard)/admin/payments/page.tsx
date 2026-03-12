'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PRICE_PER_POINT, LEVEL_MULTIPLIER } from '@/lib/constants'
import type { Profile, Payment } from '@/types'
import { Calculator, Download, CheckCircle } from 'lucide-react'

export default function AdminPaymentsPage() {
  const { profile } = useAuth()
  const [contributors, setContributors] = useState<Profile[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const supabase = createClient()

  async function loadData() {
    const [contribRes, payRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin').gt('total_points', 0),
      supabase.from('payments').select('*, user:profiles!payments_user_id_fkey(name, email)')
        .eq('month', month)
        .order('amount', { ascending: false }),
    ])

    setContributors(contribRes.data ?? [])
    setPayments(payRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [month])

  async function calculatePayments() {
    setCalculating(true)

    for (const contrib of contributors) {
      const amount = contrib.total_points * PRICE_PER_POINT * LEVEL_MULTIPLIER[contrib.level]

      // Check if payment already exists
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', contrib.id)
        .eq('month', month)
        .single()

      if (existing) {
        await supabase.from('payments').update({
          points: contrib.total_points,
          quality_multiplier: LEVEL_MULTIPLIER[contrib.level],
          amount,
        }).eq('id', existing.id)
      } else {
        await supabase.from('payments').insert({
          user_id: contrib.id,
          month,
          points: contrib.total_points,
          quality_multiplier: LEVEL_MULTIPLIER[contrib.level],
          amount,
          status: 'pending',
        })
      }
    }

    toast.success('Đã tính lương cho tất cả CTV')
    setCalculating(false)
    loadData()
  }

  async function markPaid(paymentId: string) {
    await supabase.from('payments').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', paymentId)

    toast.success('Đã đánh dấu thanh toán')
    loadData()
  }

  function exportCSV() {
    const headers = 'Tên,Email,Điểm,Hệ số,Thành tiền,Trạng thái\n'
    const rows = payments.map((p) => {
      const user = p.user as unknown as { name: string; email: string }
      return `${user?.name},${user?.email},${p.points},${p.quality_multiplier},${p.amount},${p.status}`
    }).join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payments-${month}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!profile || profile.role !== 'admin') {
    return <p className="text-gray-500">Bạn không có quyền truy cập.</p>
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[180px]"
          />
          <Button onClick={calculatePayments} disabled={calculating}>
            <Calculator className="h-4 w-4 mr-1" />
            {calculating ? 'Đang tính...' : 'Tính lương'}
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={payments.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng chi tháng {month}</p>
              <p className="text-2xl font-bold">{totalAmount.toLocaleString()}đ</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Số CTV</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-500">Chưa có dữ liệu thanh toán cho tháng này. Nhấn "Tính lương" để tạo.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const user = p.user as unknown as { name: string; email: string }
            return (
              <Card key={p.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-gray-500">
                        {user?.email} · {p.points} điểm · x{p.quality_multiplier}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-lg">{p.amount.toLocaleString()}đ</p>
                      {p.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-800">Đã TT</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markPaid(p.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Thanh toán
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
