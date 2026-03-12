'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, FileCheck, Trophy, Wallet } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ myTasks: 0, submitted: 0, approved: 0 })
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return

    async function loadStats() {
      const [myTasks, submitted, approved] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assignee_id', profile!.id)
          .in('status', ['claimed', 'in_progress']),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assignee_id', profile!.id)
          .eq('status', 'submitted'),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assignee_id', profile!.id)
          .in('status', ['approved', 'published', 'paid']),
      ])

      setStats({
        myTasks: myTasks.count ?? 0,
        submitted: submitted.count ?? 0,
        approved: approved.count ?? 0,
      })
    }

    loadStats()
  }, [profile])

  if (!profile) return null

  const cards = [
    { title: 'Task đang làm', value: stats.myTasks, icon: ClipboardList, color: 'text-blue-600' },
    { title: 'Đã nộp', value: stats.submitted, icon: FileCheck, color: 'text-purple-600' },
    { title: 'Đã duyệt', value: stats.approved, icon: Trophy, color: 'text-green-600' },
    { title: 'Tổng điểm', value: profile.total_points, icon: Wallet, color: 'text-orange-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Xin chào, {profile.name}!
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Vai trò</p>
              <p className="font-medium capitalize">{profile.role}</p>
            </div>
            <div>
              <p className="text-gray-500">Cấp độ</p>
              <p className="font-medium">{profile.level}</p>
            </div>
            <div>
              <p className="text-gray-500">QA Score</p>
              <p className="font-medium">{profile.qa_score}%</p>
            </div>
            <div>
              <p className="text-gray-500">Số dư ví</p>
              <p className="font-medium">{profile.wallet_balance.toLocaleString()}đ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
