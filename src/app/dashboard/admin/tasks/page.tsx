'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  STATUS_LABELS, STATUS_COLORS, DIFFICULTY_LABELS,
  DIFFICULTY_COLORS, LOCALIZER_POINTS
} from '@/lib/constants'
import type { Task, TaskDifficulty } from '@/types'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

export default function AdminTasksPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium')
  const [deadline, setDeadline] = useState('')

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_id_fkey(name)')
      .order('created_at', { ascending: false })

    setTasks(data ?? [])
    setLoading(false)
  }, [supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { loadTasks() }, [loadTasks])

  function resetForm() {
    setTitle('')
    setDescription('')
    setSourceUrl('')
    setDifficulty('medium')
    setDeadline('')
    setEditingTask(null)
    setShowForm(false)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setSourceUrl(task.source_url ?? '')
    setDifficulty(task.difficulty)
    setDeadline(task.deadline ? task.deadline.split('T')[0] : '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!profile || !title.trim()) return
    setSaving(true)

    const points = LOCALIZER_POINTS[difficulty]
    const taskData = {
      title,
      description: description || null,
      source_url: sourceUrl || null,
      difficulty,
      points,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    }

    if (editingTask) {
      const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTask.id)
      if (error) toast.error('Lỗi khi cập nhật task')
      else toast.success('Đã cập nhật task')
    } else {
      const { error } = await supabase.from('tasks').insert({ ...taskData, created_by: profile.id, status: 'new' })
      if (error) toast.error('Lỗi khi tạo task')
      else toast.success('Đã tạo task mới')
    }

    resetForm()
    setSaving(false)
    loadTasks()
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Xác nhận xóa task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) toast.error('Lỗi khi xóa task')
    else {
      toast.success('Đã xóa task')
      loadTasks()
    }
  }

  async function handlePublish(taskId: string) {
    await supabase.from('tasks').update({
      status: 'published',
      published_at: new Date().toISOString(),
    }).eq('id', taskId)
    toast.success('Đã xuất bản bài')
    loadTasks()
  }

  if (!profile || profile.role !== 'admin') {
    return <p className="text-white/50">Bạn không có quyền truy cập.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Quản lý Task</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gradient-btn">
            <Plus className="h-4 w-4 mr-1" /> Tạo task
          </Button>
        )}
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{editingTask ? 'Sửa task' : 'Tạo task mới'}</h2>
            <button onClick={resetForm} className="text-white/40 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Tiêu đề *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Mô tả</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Link nguồn</Label>
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." className="glass-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">Độ khó</Label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as TaskDifficulty)}
                className="w-full rounded-lg px-3 py-2 text-sm glass-input"
              >
                {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v} (+{LOCALIZER_POINTS[k as TaskDifficulty]} điểm)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Hạn nộp</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="glass-input" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full gradient-btn">
            {saving ? 'Đang lưu...' : editingTask ? 'Cập nhật' : 'Tạo task'}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-white/50">Đang tải...</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">{task.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={DIFFICULTY_COLORS[task.difficulty]}>
                      {DIFFICULTY_LABELS[task.difficulty]}
                    </Badge>
                    <Badge className={STATUS_COLORS[task.status]}>
                      {STATUS_LABELS[task.status]}
                    </Badge>
                    <span className="text-sm text-white/50">+{task.points} điểm</span>
                  </div>
                  {task.assignee && (
                    <p className="text-xs text-white/40 mt-1">
                      CTV: {(task.assignee as unknown as { name: string }).name}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {task.status === 'approved' && (
                    <Button size="sm" onClick={() => handlePublish(task.id)} className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30">
                      Publish
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(task)} className="text-white/60 hover:text-white hover:bg-white/10">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {task.status === 'new' && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
