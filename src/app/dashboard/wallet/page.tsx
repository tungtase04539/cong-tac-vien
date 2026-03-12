'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
    pending: 'bg-yellow-500/20 text-yellow-300',
    confirmed: 'bg-blue-500/20 text-blue-300',
    paid: 'bg-green-500/20 text-green-300',
  }

  const walletCards = [
    { title: 'Tổng điểm', value: profile.total_points.toString(), icon: TrendingUp, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10' },
    { title: 'Thu nhập ước tính', value: `${estimatedEarnings.toLocaleString()}đ`, subtitle: `${profile.total_points} điểm x ${PRICE_PER_POINT.toLocaleString()}đ x ${LEVEL_MULTIPLIER[profile.level]}`, icon: Wallet, color: 'text-green-400', bg: 'from-green-500/20 to-green-600/10' },
    { title: 'Số dư ví', value: `${profile.wallet_balance.toLocaleString()}đ`, icon: CreditCard, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Ví điểm</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {walletCards.map((card) => (
          <div key={card.title} className="glass-card glass-card-hover p-5 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/60">{card.title}</p>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-white/40 mt-1">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Lịch sử thanh toán</h2>
        {loading ? (
          <p className="text-white/50">Đang tải...</p>
        ) : payments.length === 0 ? (
          <p className="text-white/50">Chưa có thanh toán nào</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                <div>
                  <p className="font-medium text-white">Tháng {p.month}</p>
                  <p className="text-sm text-white/50">
                    {p.points} điểm · x{p.quality_multiplier}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{p.amount.toLocaleString()}đ</p>
                  <Badge className={statusColors[p.status]}>
                    {statusLabels[p.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
