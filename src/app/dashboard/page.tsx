'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ClipboardList, FileCheck, Trophy, Wallet } from 'lucide-react'

const supabase = createClient()

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ myTasks: 0, submitted: 0, approved: 0 })

  const loadStats = useCallback(async () => {
    if (!profile) return

    const [myTasks, submitted, approved] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .eq('assignee_id', profile.id)
        .in('status', ['claimed', 'in_progress']),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .eq('assignee_id', profile.id)
        .eq('status', 'submitted'),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .eq('assignee_id', profile.id)
        .in('status', ['approved', 'published', 'paid']),
    ])

    setStats({
      myTasks: myTasks.count ?? 0,
      submitted: submitted.count ?? 0,
      approved: approved.count ?? 0,
    })
  }, [profile])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { loadStats() }, [loadStats])

  if (!profile) return null

  const cards = [
    { title: 'Task đang làm', value: stats.myTasks, icon: ClipboardList, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10' },
    { title: 'Đã nộp', value: stats.submitted, icon: FileCheck, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-600/10' },
    { title: 'Đã duyệt', value: stats.approved, icon: Trophy, color: 'text-green-400', bg: 'from-green-500/20 to-green-600/10' },
    { title: 'Tổng điểm', value: profile.total_points, icon: Wallet, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">
        Xin chào, {profile.name}!
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.title} className="glass-card glass-card-hover p-5 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/60">{card.title}</p>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Thông tin tài khoản</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/50">Vai trò</p>
            <p className="font-medium text-white capitalize">{profile.role}</p>
          </div>
          <div>
            <p className="text-white/50">Cấp độ</p>
            <p className="font-medium text-white">{profile.level}</p>
          </div>
          <div>
            <p className="text-white/50">QA Score</p>
            <p className="font-medium text-white">{profile.qa_score}%</p>
          </div>
          <div>
            <p className="text-white/50">Số dư ví</p>
            <p className="font-medium text-white">{profile.wallet_balance.toLocaleString()}đ</p>
          </div>
        </div>
      </div>
    </div>
  )
}
