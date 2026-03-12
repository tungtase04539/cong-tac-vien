'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, STATUS_LABELS, STATUS_COLORS, LOCALIZER_POINTS } from '@/lib/constants'
import type { Task, TaskDifficulty } from '@/types'
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
        <h1 className="text-2xl font-bold">Task Market</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="available">Có thể nhận</SelectItem>
            <SelectItem value="short">Ngắn</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="long">Dài</SelectItem>
            <SelectItem value="complex">Phức tạp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">Không có task nào</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
                    <Badge className={STATUS_COLORS[task.status]} variant="secondary">
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={DIFFICULTY_COLORS[task.difficulty]} variant="secondary">
                      {DIFFICULTY_LABELS[task.difficulty]}
                    </Badge>
                    <span className="text-sm font-semibold text-orange-600">
                      +{task.points || LOCALIZER_POINTS[task.difficulty]} điểm
                    </span>
                  </div>
                  {task.source_url && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{task.source_url}</span>
                    </div>
                  )}
                  {task.deadline && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
