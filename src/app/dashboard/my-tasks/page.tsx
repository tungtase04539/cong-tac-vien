'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import type { Task } from '@/types'
import { Send, ExternalLink, X } from 'lucide-react'

const supabase = createClient()

export default function MyTasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [submitTaskId, setSubmitTaskId] = useState<string | null>(null)
  const [contentLink, setContentLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadTasks = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', profile.id)
      .in('status', ['claimed', 'in_progress', 'submitted', 'qa_review', 'revision_required'])
      .order('claimed_at', { ascending: false })

    setTasks(data ?? [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function handleSubmit(taskId: string) {
    if (!profile || !contentLink.trim()) return
    setSubmitting(true)

    const { error: subError } = await supabase.from('submissions').insert({
      task_id: taskId,
      user_id: profile.id,
      content_link: contentLink,
      notes,
    })

    if (subError) {
      toast.error('Lỗi khi nộp bài')
      setSubmitting(false)
      return
    }

    await supabase.from('tasks').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', taskId)

    toast.success('Đã nộp bài thành công!')
    setSubmitTaskId(null)
    setContentLink('')
    setNotes('')
    setSubmitting(false)
    loadTasks()
  }

  async function handleStartWork(taskId: string) {
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId)
    toast.success('Đã bắt đầu làm task')
    loadTasks()
  }

  if (!profile) return <p className="text-gray-500">Đang tải...</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Task của tôi</h1>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">Bạn chưa nhận task nào</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
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
                  <span className="text-sm text-orange-600 font-semibold">+{task.points} điểm</span>
                </div>

                {task.source_url && (
                  <a
                    href={task.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-3"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Mở nguồn
                  </a>
                )}

                <div className="flex gap-2 mt-2">
                  {task.status === 'claimed' && (
                    <Button size="sm" variant="outline" onClick={() => handleStartWork(task.id)}>
                      Bắt đầu làm
                    </Button>
                  )}

                  {['claimed', 'in_progress', 'revision_required'].includes(task.status) && submitTaskId !== task.id && (
                    <Button size="sm" onClick={() => setSubmitTaskId(task.id)}>
                      <Send className="h-3 w-3 mr-1" /> Nộp bài
                    </Button>
                  )}
                </div>

                {submitTaskId === task.id && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">Nộp bài: {task.title}</h3>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setSubmitTaskId(null)
                          setContentLink('')
                          setNotes('')
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Link nội dung</Label>
                        <Input
                          placeholder="https://..."
                          value={contentLink}
                          onChange={(e) => setContentLink(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ghi chú</Label>
                        <Textarea
                          placeholder="Ghi chú thêm (nếu có)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => handleSubmit(task.id)}
                        disabled={submitting || !contentLink.trim()}
                        className="w-full"
                      >
                        {submitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
