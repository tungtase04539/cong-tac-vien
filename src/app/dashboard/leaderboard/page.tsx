'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, LEVEL_LABELS } from '@/lib/constants'
import type { Profile } from '@/types'
import { Trophy, Medal, Award } from 'lucide-react'

export default function LeaderboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const [topPoints, setTopPoints] = useState<Profile[]>([])
  const [topQA, setTopQA] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'points' | 'qa'>('points')

  const load = useCallback(async () => {
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
  }, [supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern
  useEffect(() => { load() }, [load])

  const rankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
    if (index === 1) return <Medal className="h-5 w-5 text-gray-300 drop-shadow-[0_0_6px_rgba(209,213,219,0.5)]" />
    if (index === 2) return <Award className="h-5 w-5 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]" />
    return <span className="w-5 text-center text-sm text-white/40">{index + 1}</span>
  }

  function renderList(data: Profile[], valueKey: 'total_points' | 'qa_score', suffix: string) {
    if (loading) return <p className="text-white/50">Đang tải...</p>
    if (data.length === 0) return <p className="text-white/50">Chưa có dữ liệu</p>

    return (
      <div className="space-y-2">
        {data.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 flex justify-center">{rankIcon(i)}</div>
            <div className="flex-1">
              <p className="font-medium text-white">{p.name}</p>
              <p className="text-xs text-white/40">
                {ROLE_LABELS[p.role]} · {LEVEL_LABELS[p.level]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-white">
                {valueKey === 'qa_score' ? `${p[valueKey]}%` : p[valueKey]}
              </p>
              <p className="text-xs text-white/40">{suffix}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Bảng xếp hạng</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'points'
              ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          Top Điểm
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'qa'
              ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          Top QA Score
        </button>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {activeTab === 'points' ? 'Xếp hạng theo tổng điểm' : 'Xếp hạng theo QA Score'}
        </h2>
        {activeTab === 'points'
          ? renderList(topPoints, 'total_points', 'điểm')
          : renderList(topQA, 'qa_score', 'QA score')
        }
      </div>
    </div>
  )
}
