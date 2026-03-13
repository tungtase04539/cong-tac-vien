'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { WeChatAccount } from '@/types'

interface AccountsTabProps {
  accounts: WeChatAccount[]
  onRefresh: () => void
}

export function AccountsTab({ accounts, onRefresh }: AccountsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [feedId, setFeedId] = useState('')
  const [feedUrl, setFeedUrl] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!accountName.trim()) {
      toast.error('Account name is required')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/apps/wechat-crawler/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName.trim(),
          feed_id: feedId.trim() || undefined,
          feed_url: feedUrl.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to add account')
        return
      }
      toast.success(`Account "${accountName}" added`)
      setAccountName('')
      setFeedId('')
      setFeedUrl('')
      setDescription('')
      setShowAddForm(false)
      onRefresh()
    } catch {
      toast.error('Failed to add account')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(account: WeChatAccount) {
    if (!confirm(`Delete account "${account.account_name}"? This will also delete all its articles.`)) return
    setDeletingId(account.id)
    try {
      const res = await fetch(`/api/apps/wechat-crawler/accounts?id=${account.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete account')
        return
      }
      toast.success(`Account "${account.account_name}" deleted`)
      onRefresh()
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSync(accountId?: string) {
    if (accountId) {
      setSyncingId(accountId)
    } else {
      setSyncingAll(true)
    }
    try {
      const res = await fetch('/api/apps/wechat-crawler/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountId ? { account_id: accountId } : {}),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Sync failed')
        return
      }
      toast.success(
        `Sync complete: ${data.articles_fetched} fetched, ${data.articles_new} new${data.errors ? ` (${data.errors.length} errors)` : ''}`
      )
      onRefresh()
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncingId(null)
      setSyncingAll(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="gradient-btn px-4 py-2 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </button>
        {accounts.length > 0 && (
          <button
            onClick={() => handleSync()}
            disabled={syncingAll}
            className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {syncingAll ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync All
              </>
            )}
          </button>
        )}
      </div>

      {/* Add account form */}
      {showAddForm && (
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add WeChat Account
          </h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Account Name *</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. 人民日报"
                className="glass-input w-full text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">Feed ID (WeWe-RSS)</label>
                <input
                  type="text"
                  value={feedId}
                  onChange={(e) => setFeedId(e.target.value)}
                  placeholder="e.g. abc123"
                  className="glass-input w-full text-sm"
                />
                <p className="text-xs text-white/40 mt-1">Used with WeWe-RSS URL from settings</p>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Custom Feed URL</label>
                <input
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://..."
                  className="glass-input w-full text-sm"
                />
                <p className="text-xs text-white/40 mt-1">Overrides WeWe-RSS Feed ID</p>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="glass-input w-full text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="gradient-btn px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-white/60 text-sm">No WeChat accounts tracked yet.</p>
          <p className="text-white/40 text-xs mt-1">Add an account above to start tracking articles.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white truncate">{account.account_name}</span>
                    {!account.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">Inactive</span>
                    )}
                  </div>
                  {account.description && (
                    <p className="text-sm text-white/50 truncate">{account.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {account.article_count} articles
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Last sync: {formatDate(account.last_synced_at)}
                    </span>
                    {account.feed_id && (
                      <span className="font-mono text-white/30">ID: {account.feed_id}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncingId === account.id || syncingAll}
                    title="Sync this account"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 ${syncingId === account.id ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(account)}
                    disabled={deletingId === account.id}
                    title="Delete account"
                    className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/70 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
