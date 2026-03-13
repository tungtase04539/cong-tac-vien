'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { QA_SCORE_LABELS, QUALITY_MULTIPLIER } from '@/lib/constants'
import type { Submission } from '@/types'
import { ExternalLink } from 'lucide-react'

export default function SubmissionsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  const loadSubmissions = useCallback(async () => {
    if (!profile) return

    const { data } = await supabase
      .from('submissions')
      .select('*, task:tasks(title, difficulty, points)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    setSubmissions(data ?? [])
    setLoading(false)
  }, [profile, supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  if (!profile) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Lịch sử nộp bài</h1>

      {loading ? (
        <p className="text-white/50">Đang tải...</p>
      ) : submissions.length === 0 ? (
        <p className="text-white/50">Chưa có bài nộp nào</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div key={sub.id} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">
                    {(sub.task as unknown as { title: string })?.title ?? 'Task'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Nộp lúc: {new Date(sub.created_at).toLocaleString('vi-VN')}
                    {sub.revision_count > 0 && ` · Sửa ${sub.revision_count} lần`}
                  </p>
                  {sub.content_link && (
                    <a
                      href={sub.content_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> Xem bài
                    </a>
                  )}
                </div>
                <div className="text-right">
                  {sub.qa_score ? (
                    <Badge className={sub.qa_score === 'reject' ? 'bg-red-500/20 text-red-300' : 'bg-violet-500/20 text-violet-300'}>
                      {QA_SCORE_LABELS[sub.qa_score]} (x{QUALITY_MULTIPLIER[sub.qa_score]})
                    </Badge>
                  ) : (
                    <Badge className="bg-white/10 text-white/60 border border-white/20">Chờ QA</Badge>
                  )}
                </div>
              </div>
              {sub.qa_notes && (
                <p className="mt-3 text-sm text-white/60 bg-white/5 rounded-lg p-3">
                  QA: {sub.qa_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
