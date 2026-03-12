'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, STATUS_LABELS, STATUS_COLORS, LOCALIZER_POINTS } from '@/lib/constants'
import type { Task } from '@/types'
import { Clock, ExternalLink } from 'lucide-react'

export default function TaskMarketplacePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadTasks() {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

      if (filter === 'available') {
        query = query.eq('status', 'new')
      } else if (filter !== 'all') {
        query = query.eq('difficulty', filter)
      }

      const { data } = await query
      setTasks(data ?? [])
      setLoading(false)
    }

    loadTasks()
  }, [filter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Task Market</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm glass-input"
        >
          <option value="all">Tất cả</option>
          <option value="available">Có thể nhận</option>
          <option value="short">Ngắn</option>
          <option value="medium">Trung bình</option>
          <option value="long">Dài</option>
          <option value="complex">Phức tạp</option>
        </select>
      </div>

      {loading ? (
        <p className="text-white/50">Đang tải...</p>
      ) : tasks.length === 0 ? (
        <p className="text-white/50">Không có task nào</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
              <div className="glass-card glass-card-hover p-5 cursor-pointer h-full transition-all duration-300">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-base font-semibold text-white line-clamp-2">{task.title}</h3>
                  <Badge className={STATUS_COLORS[task.status]}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={DIFFICULTY_COLORS[task.difficulty]}>
                    {DIFFICULTY_LABELS[task.difficulty]}
                  </Badge>
                  <span className="text-sm font-semibold text-orange-400">
                    +{task.points || LOCALIZER_POINTS[task.difficulty]} điểm
                  </span>
                </div>
                {task.source_url && (
                  <div className="flex items-center gap-1 text-xs text-white/40 mb-2">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{task.source_url}</span>
                  </div>
                )}
                {task.deadline && (
                  <div className="flex items-center gap-1 text-xs text-white/40">
                    <Clock className="h-3 w-3" />
                    <span>Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
