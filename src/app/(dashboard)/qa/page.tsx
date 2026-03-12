'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { DIFFICULTY_LABELS, QA_SCORE_LABELS, QUALITY_MULTIPLIER, QA_POINTS } from '@/lib/constants'
import type { QAScore, Submission, TaskDifficulty } from '@/types'
import { ExternalLink, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

export default function QAPage() {
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingSub, setReviewingSub] = useState<Submission | null>(null)
  const [qaScore, setQaScore] = useState<QAScore>('good')
  const [qaNotes, setQaNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadSubmissions() {
    const { data } = await supabase
      .from('submissions')
      .select('*, task:tasks(title, difficulty, points, status, id), user:profiles!submissions_user_id_fkey(name)')
      .or('task.status.eq.submitted,task.status.eq.qa_review')
      .is('qa_score', null)
      .order('created_at', { ascending: true })

    // Filter submissions where task status is submitted or qa_review
    const filtered = (data ?? []).filter((s: Submission & { task: { status: string } }) =>
      s.task && ['submitted', 'qa_review'].includes((s.task as unknown as { status: string }).status)
    )

    setSubmissions(filtered)
    setLoading(false)
  }

  useEffect(() => { loadSubmissions() }, [profile])

  async function handleReview(action: 'approve' | 'reject' | 'revision') {
    if (!reviewingSub || !profile) return
    setSaving(true)

    const task = reviewingSub.task as unknown as { id: string; difficulty: TaskDifficulty; points: number }

    // Update submission
    await supabase.from('submissions').update({
      qa_score: action === 'revision' ? null : qaScore,
      qa_notes: qaNotes,
      reviewed_by: profile.id,
      revision_count: action === 'revision'
        ? (reviewingSub.revision_count + 1)
        : reviewingSub.revision_count,
    }).eq('id', reviewingSub.id)

    // Update task status
    let newStatus: string
    if (action === 'approve') newStatus = 'approved'
    else if (action === 'reject') newStatus = 'rejected'
    else newStatus = 'revision_required'

    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)

    // If approved, add points to localizer
    if (action === 'approve') {
      const multiplier = QUALITY_MULTIPLIER[qaScore]
      const earnedPoints = Math.round(task.points * multiplier)

      // Update localizer points
      const { data: localizer } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', reviewingSub.user_id)
        .single()

      if (localizer) {
        await supabase.from('profiles').update({
          total_points: localizer.total_points + earnedPoints,
        }).eq('id', reviewingSub.user_id)
      }

      // Add QA points to reviewer
      const qaPoints = QA_POINTS[task.difficulty] || 2
      await supabase.from('profiles').update({
        total_points: profile.total_points + qaPoints,
      }).eq('id', profile.id)
    }

    toast.success(
      action === 'approve' ? 'Đã duyệt bài!' :
      action === 'reject' ? 'Đã từ chối bài.' :
      'Đã yêu cầu sửa lại.'
    )

    setReviewingSub(null)
    setQaScore('good')
    setQaNotes('')
    setSaving(false)
    loadSubmissions()
  }

  if (!profile || !['qa', 'admin'].includes(profile.role)) {
    return <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">QA Review Panel</h1>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : submissions.length === 0 ? (
        <p className="text-gray-500">Không có bài nào cần review</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const task = sub.task as unknown as { title: string; difficulty: TaskDifficulty; points: number }
            const user = sub.user as unknown as { name: string }
            return (
              <Card key={sub.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{task?.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        CTV: {user?.name} · {DIFFICULTY_LABELS[task?.difficulty]} · +{task?.points} điểm
                      </p>
                      {sub.content_link && (
                        <a
                          href={sub.content_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Xem bài nộp
                        </a>
                      )}
                      {sub.notes && (
                        <p className="text-sm text-gray-600 mt-1">Ghi chú: {sub.notes}</p>
                      )}
                    </div>

                    <Dialog open={reviewingSub?.id === sub.id} onOpenChange={(open) => {
                      if (!open) setReviewingSub(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setReviewingSub(sub)}>Review</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review: {task?.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Đánh giá chất lượng</Label>
                            <Select value={qaScore} onValueChange={(v) => setQaScore(v as QAScore)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(QA_SCORE_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>
                                    {label} (x{QUALITY_MULTIPLIER[key as QAScore]})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Ghi chú QA</Label>
                            <Textarea
                              value={qaNotes}
                              onChange={(e) => setQaNotes(e.target.value)}
                              placeholder="Nhận xét về chất lượng bài..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReview('approve')}
                              disabled={saving}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReview('revision')}
                              disabled={saving}
                              className="flex-1"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" /> Sửa lại
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleReview('reject')}
                              disabled={saving}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Từ chối
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
