'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { DIFFICULTY_LABELS, QA_SCORE_LABELS, QUALITY_MULTIPLIER, QA_POINTS } from '@/lib/constants'
import type { QAScore, Submission, TaskDifficulty } from '@/types'
import { ExternalLink, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

const supabase = createClient()

export default function QAPage() {
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [qaScore, setQaScore] = useState<QAScore>('good')
  const [qaNotes, setQaNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadSubmissions = useCallback(async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*, task:tasks(title, difficulty, points, status, id), user:profiles!submissions_user_id_fkey(name)')
      .is('qa_score', null)
      .order('created_at', { ascending: true })

    const filtered = (data ?? []).filter((s: Submission & { task: { status: string } }) =>
      s.task && ['submitted', 'qa_review'].includes((s.task as unknown as { status: string }).status)
    )

    setSubmissions(filtered)
    setLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  async function handleReview(sub: Submission, action: 'approve' | 'reject' | 'revision') {
    if (!profile) return
    setSaving(true)

    const task = sub.task as unknown as { id: string; difficulty: TaskDifficulty; points: number }

    await supabase.from('submissions').update({
      qa_score: action === 'revision' ? null : qaScore,
      qa_notes: qaNotes,
      reviewed_by: profile.id,
      revision_count: action === 'revision'
        ? (sub.revision_count + 1)
        : sub.revision_count,
    }).eq('id', sub.id)

    let newStatus: string
    if (action === 'approve') newStatus = 'approved'
    else if (action === 'reject') newStatus = 'rejected'
    else newStatus = 'revision_required'

    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)

    if (action === 'approve') {
      const multiplier = QUALITY_MULTIPLIER[qaScore]
      const earnedPoints = Math.round(task.points * multiplier)

      const { data: localizer } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', sub.user_id)
        .single()

      if (localizer) {
        await supabase.from('profiles').update({
          total_points: localizer.total_points + earnedPoints,
        }).eq('id', sub.user_id)
      }

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

    setReviewingId(null)
    setQaScore('good')
    setQaNotes('')
    setSaving(false)
    loadSubmissions()
  }

  if (!profile || !['qa', 'admin'].includes(profile.role)) {
    return <p className="text-white/50">Bạn không có quyền truy cập trang này.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">QA Review Panel</h1>

      {loading ? (
        <p className="text-white/50">Đang tải...</p>
      ) : submissions.length === 0 ? (
        <p className="text-white/50">Không có bài nào cần review</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const task = sub.task as unknown as { title: string; difficulty: TaskDifficulty; points: number }
            const user = sub.user as unknown as { name: string }
            const isReviewing = reviewingId === sub.id
            return (
              <div key={sub.id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{task?.title}</p>
                    <p className="text-sm text-white/50 mt-1">
                      CTV: {user?.name} · {DIFFICULTY_LABELS[task?.difficulty]} · +{task?.points} điểm
                    </p>
                    {sub.content_link && (
                      <a
                        href={sub.content_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Xem bài nộp
                      </a>
                    )}
                    {sub.notes && (
                      <p className="text-sm text-white/50 mt-1">Ghi chú: {sub.notes}</p>
                    )}
                  </div>

                  {!isReviewing && (
                    <Button size="sm" onClick={() => {
                      setReviewingId(sub.id)
                      setQaScore('good')
                      setQaNotes('')
                    }} className="gradient-btn">
                      Review
                    </Button>
                  )}
                </div>

                {isReviewing && (
                  <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-white">Review: {task?.title}</p>
                      <button
                        className="text-white/40 hover:text-white text-lg transition-colors"
                        onClick={() => setReviewingId(null)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Đánh giá chất lượng</Label>
                      <select
                        className="w-full rounded-lg px-3 py-2 text-sm glass-input"
                        value={qaScore}
                        onChange={(e) => setQaScore(e.target.value as QAScore)}
                      >
                        {Object.entries(QA_SCORE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label} (x{QUALITY_MULTIPLIER[key as QAScore]})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Ghi chú QA</Label>
                      <Textarea
                        value={qaNotes}
                        onChange={(e) => setQaNotes(e.target.value)}
                        placeholder="Nhận xét về chất lượng bài..."
                        className="glass-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(sub, 'approve')}
                        disabled={saving}
                        className="flex-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Duyệt
                      </Button>
                      <Button
                        onClick={() => handleReview(sub, 'revision')}
                        disabled={saving}
                        className="flex-1 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30"
                        size="sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Sửa lại
                      </Button>
                      <Button
                        onClick={() => handleReview(sub, 'reject')}
                        disabled={saving}
                        className="flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Từ chối
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
