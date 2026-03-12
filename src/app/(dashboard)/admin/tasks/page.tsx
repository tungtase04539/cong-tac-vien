'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  STATUS_LABELS, STATUS_COLORS, DIFFICULTY_LABELS,
  DIFFICULTY_COLORS, LOCALIZER_POINTS
} from '@/lib/constants'
import type { Task, TaskDifficulty } from '@/types'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function AdminTasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium')
  const [deadline, setDeadline] = useState('')

  const supabase = createClient()

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_id_fkey(name)')
      .order('created_at', { ascending: false })

    setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [])

  function resetForm() {
    setTitle('')
    setDescription('')
    setSourceUrl('')
    setDifficulty('medium')
    setDeadline('')
    setEditingTask(null)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setSourceUrl(task.source_url ?? '')
    setDifficulty(task.difficulty)
    setDeadline(task.deadline ? task.deadline.split('T')[0] : '')
    setDialogOpen(true)
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
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id)

      if (error) toast.error('Lỗi khi cập nhật task')
      else toast.success('Đã cập nhật task')
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert({ ...taskData, created_by: profile.id, status: 'new' })

      if (error) toast.error('Lỗi khi tạo task')
      else toast.success('Đã tạo task mới')
    }

    setDialogOpen(false)
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
    return <p className="text-gray-500">Bạn không có quyền truy cập.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý Task</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tạo task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Sửa task' : 'Tạo task mới'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tiêu đề *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Link nguồn</Label>
                <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Độ khó</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as TaskDifficulty)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v} (+{LOCALIZER_POINTS[k as TaskDifficulty]} điểm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hạn nộp</Label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
                {saving ? 'Đang lưu...' : editingTask ? 'Cập nhật' : 'Tạo task'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={DIFFICULTY_COLORS[task.difficulty]} variant="secondary">
                        {DIFFICULTY_LABELS[task.difficulty]}
                      </Badge>
                      <Badge className={STATUS_COLORS[task.status]} variant="secondary">
                        {STATUS_LABELS[task.status]}
                      </Badge>
                      <span className="text-sm text-gray-500">+{task.points} điểm</span>
                    </div>
                    {task.assignee && (
                      <p className="text-xs text-gray-500 mt-1">
                        CTV: {(task.assignee as unknown as { name: string }).name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {task.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => handlePublish(task.id)}>
                        Publish
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(task)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {task.status === 'new' && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
