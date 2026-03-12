'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QA_SCORE_LABELS, QUALITY_MULTIPLIER } from '@/lib/constants'
import type { Submission } from '@/types'
import { ExternalLink } from 'lucide-react'

export default function SubmissionsPage() {
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return

    async function load() {
      const { data } = await supabase
        .from('submissions')
        .select('*, task:tasks(title, difficulty, points)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })

      setSubmissions(data ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  if (!profile) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Lịch sử nộp bài</h1>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : submissions.length === 0 ? (
        <p className="text-gray-500">Chưa có bài nộp nào</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {(sub.task as unknown as { title: string })?.title ?? 'Task'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Nộp lúc: {new Date(sub.created_at).toLocaleString('vi-VN')}
                      {sub.revision_count > 0 && ` · Sửa ${sub.revision_count} lần`}
                    </p>
                    {sub.content_link && (
                      <a
                        href={sub.content_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Xem bài
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    {sub.qa_score ? (
                      <Badge variant={sub.qa_score === 'reject' ? 'destructive' : 'secondary'}>
                        {QA_SCORE_LABELS[sub.qa_score]} (x{QUALITY_MULTIPLIER[sub.qa_score]})
                      </Badge>
                    ) : (
                      <Badge variant="outline">Chờ QA</Badge>
                    )}
                  </div>
                </div>
                {sub.qa_notes && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                    QA: {sub.qa_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
