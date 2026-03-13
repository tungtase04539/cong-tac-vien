'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MarkdownEditor } from './components/markdown-editor'
import { MarkdownPreview } from './components/markdown-preview'
import { ThemeSelector } from './components/theme-selector'
import { allThemes } from '@/lib/apps/lark-publisher/themes'
import type { Theme } from '@/lib/apps/lark-publisher/themes/types'

const DEFAULT_CONTENT = `# Welcome to Lark Publisher

Start writing your article in **Markdown** on the left, and see a live preview on the right.

## Features

- Real-time markdown preview
- Multiple themes for Lark publishing
- AI-powered translation
- Direct publish to Lark Wiki

## Example

> This is a blockquote. Use it for important notes or citations.

\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

Happy writing! 🚀
`

export default function LarkPublisherPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [themeId, setThemeId] = useState('lark-default')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const selectedTheme: Theme = useMemo(
    () => allThemes.find((t) => t.id === themeId) ?? allThemes[0],
    [themeId],
  )

  async function handleTranslate() {
    if (!content.trim()) {
      toast.error('Nothing to translate')
      return
    }
    setIsTranslating(true)
    try {
      const res = await fetch('/api/apps/lark-publisher/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Translation failed')
      setContent(data.translated)
      toast.success('Content translated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  async function handlePublish() {
    if (!content.trim()) {
      toast.error('Nothing to publish')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a title before publishing')
      return
    }
    setIsPublishing(true)
    try {
      const res = await fetch('/api/apps/lark-publisher/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, themeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      toast.success(
        data.docUrl
          ? `Published! View at: ${data.docUrl}`
          : 'Published to Lark successfully',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
      {/* Top Bar */}
      <div className="glass-card px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title..."
          className="glass-input flex-1 text-sm"
        />

        {/* Theme Selector */}
        <ThemeSelector value={themeId} onChange={setThemeId} />

        {/* Actions */}
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating}
          className="gradient-btn text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isTranslating ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Translating...
            </span>
          ) : (
            '🌐 Translate'
          )}
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className="gradient-btn text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          {isPublishing ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Publishing...
            </span>
          ) : (
            '🚀 Publish'
          )}
        </button>

        <Link
          href="/dashboard/apps/lark-publisher/settings"
          className="text-white/60 hover:text-white/90 transition-colors p-2 rounded-lg hover:bg-white/10"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {/* Split Pane */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Editor Pane */}
        <div className="flex-1 glass-card overflow-hidden flex flex-col min-w-0">
          <div
            className="px-4 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider border-b flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            Editor
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Write your Markdown here..."
            />
          </div>
        </div>

        {/* Preview Pane */}
        <div className="flex-1 overflow-hidden rounded-xl border min-w-0" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div
            className="px-4 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider border-b flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            Preview — {selectedTheme.name}
          </div>
          <div className="flex-1 h-[calc(100%-37px)] overflow-hidden">
            <MarkdownPreview source={content} theme={selectedTheme} />
          </div>
        </div>
      </div>
    </div>
  )
}
