'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROLE_LABELS, LEVEL_LABELS } from '@/lib/constants'
import type { Profile } from '@/types'
import { Trophy, Medal, Award } from 'lucide-react'

export default function LeaderboardPage() {
  const [topPoints, setTopPoints] = useState<Profile[]>([])
  const [topQA, setTopQA] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [pointsRes, qaRes] = await Promise.all([
        supabase.from('profiles').select('*')
          .neq('role', 'admin')
          .order('total_points', { ascending: false })
          .limit(20),
        supabase.from('profiles').select('*')
          .neq('role', 'admin')
          .order('qa_score', { ascending: false })
          .limit(20),
      ])

      setTopPoints(pointsRes.data ?? [])
      setTopQA(qaRes.data ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const rankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Award className="h-5 w-5 text-orange-400" />
    return <span className="w-5 text-center text-sm text-gray-400">{index + 1}</span>
  }

  function renderTable(data: Profile[], valueKey: 'total_points' | 'qa_score', suffix: string) {
    if (loading) return <p className="text-gray-500">Đang tải...</p>
    if (data.length === 0) return <p className="text-gray-500">Chưa có dữ liệu</p>

    return (
      <div className="space-y-2">
        {data.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-gray-50">
            <div className="w-8 flex justify-center">{rankIcon(i)}</div>
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-gray-500">
                {ROLE_LABELS[p.role]} · {LEVEL_LABELS[p.level]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                {valueKey === 'qa_score' ? `${p[valueKey]}%` : p[valueKey]}
              </p>
              <p className="text-xs text-gray-500">{suffix}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bảng xếp hạng</h1>

      <Tabs defaultValue="points">
        <TabsList>
          <TabsTrigger value="points">Top Điểm</TabsTrigger>
          <TabsTrigger value="qa">Top QA Score</TabsTrigger>
        </TabsList>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Xếp hạng theo tổng điểm</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(topPoints, 'total_points', 'điểm')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Xếp hạng theo QA Score</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(topQA, 'qa_score', 'QA score')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
