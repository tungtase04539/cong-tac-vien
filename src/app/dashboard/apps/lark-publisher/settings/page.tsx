'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAppSettings } from '@/hooks/use-app-settings'
import type { LarkPublisherSettings } from '@/types'

const AI_PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
] as const

const DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-1.5-pro',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
}

export default function LarkPublisherSettingsPage() {
  const { settings, loading, saving, saveSettings } = useAppSettings('lark-publisher')

  const [larkAppId, setLarkAppId] = useState('')
  const [larkAppSecret, setLarkAppSecret] = useState('')
  const [larkSpaceId, setLarkSpaceId] = useState('')
  const [aiProvider, setAiProvider] = useState<LarkPublisherSettings['ai_provider']>('gemini')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('')

  useEffect(() => {
    if (settings) {
      setLarkAppId(settings.lark_app_id ?? '')
      setLarkAppSecret(settings.lark_app_secret ?? '')
      setLarkSpaceId(settings.lark_space_id ?? '')
      setAiProvider(settings.ai_provider ?? 'gemini')
      setAiApiKey(settings.ai_api_key ?? '')
      setAiModel(settings.ai_model ?? '')
    }
  }, [settings])

  function handleProviderChange(provider: LarkPublisherSettings['ai_provider']) {
    setAiProvider(provider)
    if (!aiModel || Object.values(DEFAULT_MODELS).includes(aiModel)) {
      setAiModel(DEFAULT_MODELS[provider ?? 'gemini'])
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const newSettings: LarkPublisherSettings = {
      lark_app_id: larkAppId,
      lark_app_secret: larkAppSecret,
      lark_space_id: larkSpaceId,
      ai_provider: aiProvider,
      ai_api_key: aiApiKey,
      ai_model: aiModel,
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
          href="/dashboard/apps/lark-publisher"
          className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          title="Back to editor"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Lark Publisher Settings</h1>
          <p className="text-white/50 text-sm mt-0.5">Configure your Lark credentials and AI translation</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Lark Credentials */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🪶</span>
            <span>Lark Credentials</span>
          </h2>
          <p className="text-sm text-white/50">
            Create a Lark app at{' '}
            <a
              href="https://open.feishu.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              open.feishu.cn
            </a>{' '}
            to get your credentials.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">App ID</label>
              <input
                type="text"
                value={larkAppId}
                onChange={(e) => setLarkAppId(e.target.value)}
                placeholder="cli_xxxxxxxxxxxxxxxxxx"
                className="glass-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">App Secret</label>
              <input
                type="password"
                value={larkAppSecret}
                onChange={(e) => setLarkAppSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="glass-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Wiki Space ID</label>
              <input
                type="text"
                value={larkSpaceId}
                onChange={(e) => setLarkSpaceId(e.target.value)}
                placeholder="7xxxxxxxxxxxxxxxxxxxxxx"
                className="glass-input w-full text-sm"
              />
              <p className="text-xs text-white/40 mt-1">
                Found in your Lark Wiki URL: wiki.larksuite.com/wiki/<strong>spaceId</strong>
              </p>
            </div>
          </div>
        </div>

        {/* AI Translation */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🤖</span>
            <span>AI Translation</span>
          </h2>
          <p className="text-sm text-white/50">
            Configure an AI provider for the Translate button in the editor.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => handleProviderChange(e.target.value as LarkPublisherSettings['ai_provider'])}
                className="glass-input w-full text-sm"
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">API Key</label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="Your API key..."
                className="glass-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Model</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder={DEFAULT_MODELS[aiProvider ?? 'gemini']}
                className="glass-input w-full text-sm"
              />
              <p className="text-xs text-white/40 mt-1">
                Leave blank to use the default model for your provider.
              </p>
            </div>
          </div>
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
