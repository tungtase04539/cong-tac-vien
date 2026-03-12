'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
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
    }

    load()
  }, [])

  if (!profile || profile.role !== 'admin') {
    return <p className="text-gray-500">Bạn không có quyền truy cập.</p>
  }

  if (loading || !stats) return <p className="text-gray-500">Đang tải...</p>

  const cards = [
    { title: 'Tổng task', value: stats.totalTasks, icon: ClipboardList, color: 'text-gray-600' },
    { title: 'Task mới', value: stats.newTasks, icon: FileCheck, color: 'text-blue-600' },
    { title: 'Đang xử lý', value: stats.inProgress, icon: TrendingUp, color: 'text-orange-600' },
    { title: 'Chờ QA', value: stats.waitingQA, icon: Shield, color: 'text-purple-600' },
    { title: 'Đã duyệt', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Đã xuất bản', value: stats.published, icon: BookOpen, color: 'text-emerald-600' },
    { title: 'Cộng tác viên', value: stats.totalContributors, icon: Users, color: 'text-indigo-600' },
    { title: 'Chi phí ước tính', value: `${(stats.totalPoints * PRICE_PER_POINT).toLocaleString()}đ`, icon: DollarSign, color: 'text-red-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
