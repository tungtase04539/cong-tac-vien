'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PRICE_PER_POINT, LEVEL_MULTIPLIER } from '@/lib/constants'
import type { Payment } from '@/types'
import { Wallet, TrendingUp, CreditCard } from 'lucide-react'

export default function WalletPage() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return

    async function load() {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', profile!.id)
        .order('month', { ascending: false })

      setPayments(data ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  if (!profile) return null

  const estimatedEarnings = profile.total_points * PRICE_PER_POINT * LEVEL_MULTIPLIER[profile.level]

  const statusLabels: Record<string, string> = {
    pending: 'Chờ duyệt',
    confirmed: 'Đã xác nhận',
    paid: 'Đã thanh toán',
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ví điểm</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tổng điểm</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{profile.total_points}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Thu nhập ước tính</CardTitle>
            <Wallet className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{estimatedEarnings.toLocaleString()}đ</p>
            <p className="text-xs text-gray-500 mt-1">
              {profile.total_points} điểm x {PRICE_PER_POINT.toLocaleString()}đ x {LEVEL_MULTIPLIER[profile.level]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Số dư ví</CardTitle>
            <CreditCard className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{profile.wallet_balance.toLocaleString()}đ</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử thanh toán</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Đang tải...</p>
          ) : payments.length === 0 ? (
            <p className="text-gray-500">Chưa có thanh toán nào</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">Tháng {p.month}</p>
                    <p className="text-sm text-gray-500">
                      {p.points} điểm · x{p.quality_multiplier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{p.amount.toLocaleString()}đ</p>
                    <Badge className={statusColors[p.status]} variant="secondary">
                      {statusLabels[p.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
