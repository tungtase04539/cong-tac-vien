'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { WeChatArticle, WeChatAccount } from '@/types'

interface ArticlesTabProps {
  accounts: WeChatAccount[]
}

export function ArticlesTab({ accounts }: ArticlesTabProps) {
  const supabase = useMemo(() => createClient(), [])
  const [articles, setArticles] = useState<WeChatArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const PAGE_SIZE = 20

  const loadArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      })
      if (search.trim()) params.set('search', search.trim())
      if (selectedAccountId) params.set('account_id', selectedAccountId)

      const res = await fetch(`/api/apps/wechat-crawler/articles?${params}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load articles')
        return
      }
      setArticles(data.articles ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.total_pages ?? 1)
    } catch {
      toast.error('Failed to load articles')
    } finally {
      setLoading(false)
    }
  }, [supabase, page, search, selectedAccountId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadArticles() }, [loadArticles])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  function handleAccountFilter(accountId: string) {
    setSelectedAccountId(accountId)
    setPage(1)
  }

  function handleExport(format: 'json' | 'csv') {
    const params = new URLSearchParams({ format })
    if (selectedAccountId) params.set('account_id', selectedAccountId)
    window.open(`/api/apps/wechat-crawler/export?${params}`, '_blank')
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function getAccountName(article: WeChatArticle) {
    const acc = article.account as WeChatAccount | undefined
    if (acc?.account_name) return acc.account_name
    const found = accounts.find((a) => a.id === article.account_id)
    return found?.account_name ?? '—'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-0 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search articles..."
            className="glass-input flex-1 text-sm"
          />
          <button type="submit" className="gradient-btn px-4 py-2 text-sm">
            Search
          </button>
        </form>

        {accounts.length > 0 && (
          <select
            value={selectedAccountId}
            onChange={(e) => handleAccountFilter(e.target.value)}
            className="glass-input text-sm w-48"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.account_name}</option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            title="Export as JSON"
            className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            title="Export as CSV"
            className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-white/50">
        <span>{total.toLocaleString()} article{total !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}</span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Article list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-white/60 text-sm">No articles found.</p>
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              className="mt-2 text-xs text-purple-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <div key={article.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                className="w-full p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm leading-snug line-clamp-2">
                      {article.title || 'Untitled'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-white/40">
                      <span className="text-purple-400/80">{getAccountName(article)}</span>
                      {article.author && <span>{article.author}</span>}
                      <span>{article.word_count?.toLocaleString() ?? 0} words</span>
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-white/40 flex-shrink-0 mt-0.5 transition-transform ${expandedId === article.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === article.id && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                  {article.summary && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-white/70">{article.summary}</p>
                    </div>
                  )}
                  {article.tags && article.tags.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {article.tags.map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {article.content && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Content Preview</p>
                      <p className="text-sm text-white/60 line-clamp-4">
                        {article.content.replace(/<[^>]*>/g, '').slice(0, 400)}
                        {article.content.length > 400 ? '...' : ''}
                      </p>
                    </div>
                  )}
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Read original
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number
              if (totalPages <= 5) {
                p = i + 1
              } else if (page <= 3) {
                p = i + 1
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i
              } else {
                p = page - 2 + i
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    p === page
                      ? 'bg-purple-500/40 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white/60'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
