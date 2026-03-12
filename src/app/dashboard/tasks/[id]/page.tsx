'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DIFFICULTY_LABELS, DIFFICULTY_COLORS, STATUS_LABELS, STATUS_COLORS,
  LOCALIZER_POINTS, MAX_CLAIMS, MIN_QA_SCORE
} from '@/lib/constants'
import type { Task } from '@/types'
import { ArrowLeft, Clock, ExternalLink, User } from 'lucide-react'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [claimedCount, setClaimedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assignee_id_fkey(name)')
        .eq('id', id)
        .single()

      setTask(taskData)

      if (profile) {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', profile.id)
          .in('status', ['claimed', 'in_progress', 'submitted'])

        setClaimedCount(count ?? 0)
      }

      setLoading(false)
    }

    load()
  }, [id, profile])

  async function handleClaim() {
    if (!profile || !task) return

    if (claimedCount >= MAX_CLAIMS) {
      toast.error(`Bạn đã nhận tối đa ${MAX_CLAIMS} task. Hoàn thành task hiện tại trước.`)
      return
    }

    if (profile.qa_score < MIN_QA_SCORE) {
      toast.error(`QA score của bạn (${profile.qa_score}%) thấp hơn yêu cầu (${MIN_QA_SCORE}%).`)
      return
    }

    setClaiming(true)

    const { error } = await supabase
      .from('tasks')
      .update({
        assignee_id: profile.id,
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('status', 'new')

    if (error) {
      toast.error('Không thể nhận task. Vui lòng thử lại.')
      setClaiming(false)
      return
    }

    toast.success('Đã nhận task thành công!')
    router.push('/dashboard/my-tasks')
  }

  if (loading) return <p className="text-white/50">Đang tải...</p>
  if (!task) return <p className="text-white/50">Task không tồn tại</p>

  const canClaim = task.status === 'new' && profile && profile.role !== 'admin'

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white/60 hover:text-white hover:bg-white/10">
        <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
      </Button>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-bold text-white">{task.title}</h1>
          <Badge className={STATUS_COLORS[task.status]}>
            {STATUS_LABELS[task.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={DIFFICULTY_COLORS[task.difficulty]}>
            {DIFFICULTY_LABELS[task.difficulty]}
          </Badge>
          <span className="text-sm font-semibold text-orange-400">
            +{task.points || LOCALIZER_POINTS[task.difficulty]} điểm
          </span>
        </div>

        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-white/50 mb-1">Mô tả</h3>
            <p className="text-sm text-white/80 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {task.source_url && (
          <div>
            <h3 className="text-sm font-medium text-white/50 mb-1">Nguồn</h3>
            <a
              href={task.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {task.source_url}
            </a>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.deadline && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/40" />
                <div>
                  <p className="text-white/50">Hạn nộp</p>
                  <p className="font-medium text-white">{new Date(task.deadline).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            )}
            {task.assignee && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-white/40" />
                <div>
                  <p className="text-white/50">Người nhận</p>
                  <p className="font-medium text-white">{(task.assignee as unknown as { name: string }).name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {canClaim && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">
                Bạn đã nhận {claimedCount}/{MAX_CLAIMS} task
              </p>
              <Button onClick={handleClaim} disabled={claiming} className="gradient-btn">
                {claiming ? 'Đang nhận...' : 'Nhận task này'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
