'use client'

import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/apps/lark-publisher/markdown'
import { applyTheme } from '@/lib/apps/lark-publisher/apply-theme'
import type { Theme } from '@/lib/apps/lark-publisher/themes/types'

interface MarkdownPreviewProps {
  source: string
  theme: Theme
}

export function MarkdownPreview({ source, theme }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    if (!source.trim()) return ''
    const rendered = renderMarkdown(source)
    return applyTheme(rendered, theme)
  }, [source, theme])

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: '#ffffff' }}
    >
      {html ? (
        <div
          className="min-h-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <p className="text-gray-400 text-sm italic">Preview will appear here...</p>
        </div>
      )}
    </div>
  )
}
