'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAppSettings } from '@/hooks/use-app-settings'
import type { WeChatCrawlerSettings } from '@/types'

export default function WeChatCrawlerSettingsPage() {
  const { settings, loading, saving, saveSettings } = useAppSettings('wechat-crawler')

  const [weweRssUrl, setWeweRssUrl] = useState('')
  const [weweRssAuthCode, setWeweRssAuthCode] = useState('')

  useEffect(() => {
    if (settings) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setWeweRssUrl(settings.wewe_rss_url ?? '')
      setWeweRssAuthCode(settings.wewe_rss_auth_code ?? '')
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const newSettings: WeChatCrawlerSettings = {
      wewe_rss_url: weweRssUrl.trim(),
      wewe_rss_auth_code: weweRssAuthCode.trim(),
    }
    const error = await saveSettings(newSettings)
    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved successfully')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white/60">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/apps/wechat-crawler"
          className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          title="Back to WeChat Crawler"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">WeChat Crawler Settings</h1>
          <p className="text-white/50 text-sm mt-0.5">Configure your WeWe-RSS connection</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* WeWe-RSS Config */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📡</span>
            <span>WeWe-RSS Connection</span>
          </h2>
          <p className="text-sm text-white/50">
            Connect to your self-hosted{' '}
            <a
              href="https://github.com/cooderl/wewe-rss"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              WeWe-RSS
            </a>{' '}
            instance to fetch WeChat public account articles.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">WeWe-RSS URL</label>
              <input
                type="url"
                value={weweRssUrl}
                onChange={(e) => setWeweRssUrl(e.target.value)}
                placeholder="https://your-wewe-rss-instance.com"
                className="glass-input w-full text-sm"
              />
              <p className="text-xs text-white/40 mt-1">
                Base URL of your WeWe-RSS instance. Feed URLs will be constructed as{' '}
                <code className="text-purple-400/70">{'{url}'}/feed/{'{feed_id}'}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Auth Code</label>
              <input
                type="password"
                value={weweRssAuthCode}
                onChange={(e) => setWeweRssAuthCode(e.target.value)}
                placeholder="Optional authentication code"
                className="glass-input w-full text-sm"
              />
              <p className="text-xs text-white/40 mt-1">
                If your WeWe-RSS requires authentication, enter the auth code here. It will be sent as a{' '}
                <code className="text-purple-400/70">Bearer</code> token.
              </p>
            </div>
          </div>
        </div>

        {/* How to use */}
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💡</span>
            <span>How to use</span>
          </h2>
          <ol className="space-y-2 text-sm text-white/60 list-decimal list-inside">
            <li>Deploy a WeWe-RSS instance and add your WeChat accounts there.</li>
            <li>Enter your WeWe-RSS URL above and save settings.</li>
            <li>Go to the <strong className="text-white/80">Tai khoan</strong> tab and add each WeChat account with its Feed ID from WeWe-RSS.</li>
            <li>Click <strong className="text-white/80">Sync</strong> to fetch the latest articles.</li>
            <li>Browse and export articles in the <strong className="text-white/80">Bai viet</strong> tab.</li>
          </ol>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="gradient-btn px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
