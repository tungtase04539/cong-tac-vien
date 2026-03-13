'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { PRICE_PER_POINT } from '@/lib/constants'
import {
  ClipboardList, FileCheck, Shield, CheckCircle,
  BookOpen, Users, DollarSign, TrendingUp
} from 'lucide-react'

interface DashboardStats {
  totalTasks: number
  newTasks: number
  inProgress: number
  waitingQA: number
  approved: number
  published: number
  totalContributors: number
  totalPoints: number
}

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [total, newT, inProg, waitQA, approved, published, contribs, points] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['claimed', 'in_progress']),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'qa_review']),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('profiles').select('total_points').neq('role', 'admin'),
    ])

    const totalPts = (points.data ?? []).reduce((sum: number, p: { total_points: number }) => sum + p.total_points, 0)

    setStats({
      totalTasks: total.count ?? 0,
      newTasks: newT.count ?? 0,
      inProgress: inProg.count ?? 0,
      waitingQA: waitQA.count ?? 0,
      approved: approved.count ?? 0,
      published: published.count ?? 0,
      totalContributors: contribs.count ?? 0,
      totalPoints: totalPts,
    })
    setLoading(false)
  }, [supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { load() }, [load])

  if (!profile || profile.role !== 'admin') {
    return <p className="text-white/50">Bạn không có quyền truy cập.</p>
  }

  if (loading || !stats) return <p className="text-white/50">Đang tải...</p>

  const cards = [
    { title: 'Tổng task', value: stats.totalTasks, icon: ClipboardList, color: 'text-gray-300', bg: 'from-gray-500/20 to-gray-600/10' },
    { title: 'Task mới', value: stats.newTasks, icon: FileCheck, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10' },
    { title: 'Đang xử lý', value: stats.inProgress, icon: TrendingUp, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10' },
    { title: 'Chờ QA', value: stats.waitingQA, icon: Shield, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-600/10' },
    { title: 'Đã duyệt', value: stats.approved, icon: CheckCircle, color: 'text-green-400', bg: 'from-green-500/20 to-green-600/10' },
    { title: 'Đã xuất bản', value: stats.published, icon: BookOpen, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10' },
    { title: 'Cộng tác viên', value: stats.totalContributors, icon: Users, color: 'text-indigo-400', bg: 'from-indigo-500/20 to-indigo-600/10' },
    { title: 'Chi phí ước tính', value: `${(stats.totalPoints * PRICE_PER_POINT).toLocaleString()}đ`, icon: DollarSign, color: 'text-red-400', bg: 'from-red-500/20 to-red-600/10' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="glass-card glass-card-hover p-5 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/60">{card.title}</p>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
