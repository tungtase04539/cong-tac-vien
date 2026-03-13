'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AccountsTab } from './components/accounts-tab'
import { ArticlesTab } from './components/articles-tab'
import type { WeChatAccount } from '@/types'

export default function WeChatCrawlerPage() {
  const supabase = useMemo(() => createClient(), [])
  const [activeTab, setActiveTab] = useState<'articles' | 'accounts'>('articles')
  const [accounts, setAccounts] = useState<WeChatAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    const { data } = await supabase
      .from('wechat_accounts')
      .select('*')
      .order('created_at', { ascending: false })
    setAccounts(data ?? [])
    setLoadingAccounts(false)
  }, [supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAccounts() }, [loadAccounts])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">WeChat Crawler</h1>
          <p className="text-white/50 text-sm mt-0.5">
            Track and sync WeChat public account articles via WeWe-RSS
          </p>
        </div>
        <Link
          href="/dashboard/apps/wechat-crawler/settings"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'articles'
              ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          Bai viet
          {accounts.length > 0 && (
            <span className="ml-2 text-xs text-white/40">
              ({accounts.reduce((s, a) => s + (a.article_count ?? 0), 0)})
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'accounts'
              ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          Tai khoan
          {!loadingAccounts && (
            <span className="ml-2 text-xs text-white/40">({accounts.length})</span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'articles' ? (
        <ArticlesTab accounts={accounts} />
      ) : (
        <AccountsTab accounts={accounts} onRefresh={loadAccounts} />
      )}
    </div>
  )
}
