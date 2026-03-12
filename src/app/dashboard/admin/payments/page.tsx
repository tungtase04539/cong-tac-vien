'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { PRICE_PER_POINT, LEVEL_MULTIPLIER } from '@/lib/constants'
import type { Profile, Payment } from '@/types'
import { Calculator, Download, CheckCircle } from 'lucide-react'

const supabase = createClient()

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

  const loadData = useCallback(async () => {
    const [contribRes, payRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin').gt('total_points', 0),
      supabase.from('payments').select('*, user:profiles!payments_user_id_fkey(name, email)')
        .eq('month', month)
        .order('amount', { ascending: false }),
    ])

    setContributors(contribRes.data ?? [])
    setPayments(payRes.data ?? [])
    setLoading(false)
  }, [month])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { loadData() }, [loadData])

  async function calculatePayments() {
    setCalculating(true)

    for (const contrib of contributors) {
      const amount = contrib.total_points * PRICE_PER_POINT * LEVEL_MULTIPLIER[contrib.level]

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
    return <p className="text-white/50">Bạn không có quyền truy cập.</p>
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Quản lý thanh toán</h1>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[180px] glass-input"
          />
          <Button onClick={calculatePayments} disabled={calculating} className="gradient-btn">
            <Calculator className="h-4 w-4 mr-1" />
            {calculating ? 'Đang tính...' : 'Tính lương'}
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={payments.length === 0} className="border-white/20 text-white hover:bg-white/10">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">Tổng chi tháng {month}</p>
            <p className="text-2xl font-bold text-white">{totalAmount.toLocaleString()}đ</p>
          </div>
          <div>
            <p className="text-sm text-white/50">Số CTV</p>
            <p className="text-2xl font-bold text-white">{payments.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-white/50">Đang tải...</p>
      ) : payments.length === 0 ? (
        <p className="text-white/50">Chưa có dữ liệu thanh toán cho tháng này. Nhấn &quot;Tính lương&quot; để tạo.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const user = p.user as unknown as { name: string; email: string }
            return (
              <div key={p.id} className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{user?.name}</p>
                    <p className="text-sm text-white/50">
                      {user?.email} · {p.points} điểm · x{p.quality_multiplier}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-lg text-white">{p.amount.toLocaleString()}đ</p>
                    {p.status === 'paid' ? (
                      <Badge className="bg-green-500/20 text-green-300">Đã TT</Badge>
                    ) : (
                      <Button size="sm" onClick={() => markPaid(p.id)} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30">
                        <CheckCircle className="h-4 w-4 mr-1" /> Thanh toán
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
