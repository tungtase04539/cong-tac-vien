# Apps Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate VietTeamLarkPublisher and wexin-crawler into Wiki CTV OS as full Next.js rewrites under a new "Ung dung" sidebar section.

**Architecture:** New pages under `/dashboard/apps/` with API routes for server-side logic (Lark API, RSS fetching, AI translation). Data stored in Supabase with RLS. All UI follows existing glassmorphism theme.

**Tech Stack:** Next.js 16, TypeScript, Supabase, markdown-it, highlight.js, rss-parser, Tailwind CSS 4

---

## Chunk 1: Foundation (Database + Navigation + Shared Utils)

### Task 1: Database Schema — New Supabase Tables

**Files:**
- Create: `src/lib/supabase/migrations/001_apps_tables.sql`

- [ ] **Step 1: Create migration SQL file**

```sql
-- User app settings (API keys per user per app)
CREATE TABLE user_app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app_name)
);

ALTER TABLE user_app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings"
  ON user_app_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WeChat accounts being tracked
CREATE TABLE wechat_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  feed_id TEXT,
  feed_url TEXT,
  description TEXT,
  avatar_url TEXT,
  article_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wechat_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts"
  ON wechat_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Crawled WeChat articles
CREATE TABLE wechat_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES wechat_accounts(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  url TEXT,
  guid TEXT,
  content TEXT,
  content_html TEXT,
  summary TEXT,
  ai_summary TEXT,
  cover_image TEXT,
  images JSONB DEFAULT '[]',
  word_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, url)
);

ALTER TABLE wechat_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own articles"
  ON wechat_articles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sync history
CREATE TABLE wechat_sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES wechat_accounts(id) ON DELETE SET NULL,
  sync_type TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'running',
  articles_fetched INTEGER DEFAULT 0,
  articles_new INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds REAL
);

ALTER TABLE wechat_sync_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync history"
  ON wechat_sync_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Run the migration on Supabase**

Go to Supabase Dashboard → SQL Editor → paste and run the SQL. Verify all 4 tables are created with RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/migrations/001_apps_tables.sql
git commit -m "feat: add database tables for apps integration"
```

---

### Task 2: TypeScript Types for Apps

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types to the types file**

Add at the end of `src/types/index.ts`:

```ts
// ==================== Apps Types ====================

export interface UserAppSettings {
  id: string
  user_id: string
  app_name: 'lark-publisher' | 'wechat-crawler'
  settings: LarkPublisherSettings | WeChatCrawlerSettings
  created_at: string
  updated_at: string
}

export interface LarkPublisherSettings {
  lark_app_id?: string
  lark_app_secret?: string
  lark_space_id?: string
  ai_provider?: 'gemini' | 'openai' | 'anthropic'
  ai_api_key?: string
  ai_model?: string
}

export interface WeChatCrawlerSettings {
  wewe_rss_url?: string
  wewe_rss_auth_code?: string
}

export interface WeChatAccount {
  id: string
  user_id: string
  account_name: string
  feed_id: string | null
  feed_url: string | null
  description: string | null
  avatar_url: string | null
  article_count: number
  last_synced_at: string | null
  is_active: boolean
  created_at: string
}

export interface WeChatArticle {
  id: string
  user_id: string
  account_id: string
  title: string
  author: string | null
  url: string | null
  guid: string | null
  content: string | null
  content_html: string | null
  summary: string | null
  ai_summary: string | null
  cover_image: string | null
  images: string[]
  word_count: number
  tags: string[]
  published_at: string | null
  created_at: string
  // Joined
  account?: WeChatAccount
}

export interface WeChatSyncHistory {
  id: string
  user_id: string
  account_id: string | null
  sync_type: string
  status: 'running' | 'success' | 'failed' | 'partial'
  articles_fetched: number
  articles_new: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types for apps integration"
```

---

### Task 3: Sidebar Navigation — Add "UNG DUNG" Section

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add app navigation items**

In `sidebar.tsx`, import `BookOpen` and `Globe` from lucide-react. After the existing `navItems` array, add a new `appItems` array:

```ts
const appItems: NavItem[] = [
  { href: '/dashboard/apps/lark-publisher', label: 'Lark Publisher', icon: BookOpen },
  { href: '/dashboard/apps/wechat-crawler', label: 'WeChat Crawler', icon: Globe },
]
```

In the JSX, after rendering `mainItems` and before the ADMIN section, add:

```tsx
{/* Apps Section */}
<p className="px-4 pt-6 pb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
  Ung dung
</p>
{appItems.map((item) => {
  const Icon = item.icon
  const isActive = pathname.startsWith(item.href)
  return (
    <Link key={item.href} href={item.href}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg mx-2 transition-all duration-200 ${
        isActive
          ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
          : 'text-white/60 hover:bg-white/10 hover:text-white'
      }`}>
      <Icon className={`h-4 w-4 ${isActive ? 'text-violet-400' : ''}`} />
      {item.label}
    </Link>
  )
})}
```

Note: Use `pathname.startsWith(item.href)` instead of exact match, so sub-pages (like `/settings`) also highlight the parent.

- [ ] **Step 2: Verify sidebar renders correctly**

Run dev server, confirm "UNG DUNG" section appears between user nav and ADMIN section with both items.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Apps section to sidebar navigation"
```

---

### Task 4: App Settings Utility Hook

**Files:**
- Create: `src/hooks/use-app-settings.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import type { LarkPublisherSettings, WeChatCrawlerSettings } from '@/types'

type AppName = 'lark-publisher' | 'wechat-crawler'
type SettingsMap = {
  'lark-publisher': LarkPublisherSettings
  'wechat-crawler': WeChatCrawlerSettings
}

export function useAppSettings<T extends AppName>(appName: T) {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [settings, setSettings] = useState<SettingsMap[T] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('user_app_settings')
      .select('settings')
      .eq('user_id', profile.id)
      .eq('app_name', appName)
      .single()
    setSettings((data?.settings as SettingsMap[T]) ?? null)
    setLoading(false)
  }, [supabase, profile?.id, appName])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadSettings() }, [loadSettings])

  const saveSettings = useCallback(async (newSettings: SettingsMap[T]) => {
    if (!profile?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('user_app_settings')
      .upsert({
        user_id: profile.id,
        app_name: appName,
        settings: newSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,app_name' })
    if (!error) setSettings(newSettings)
    setSaving(false)
    return error
  }, [supabase, profile?.id, appName])

  return { settings, loading, saving, saveSettings, reload: loadSettings }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-app-settings.ts
git commit -m "feat: add useAppSettings hook for per-user app config"
```

---

### Task 5: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install markdown-it highlight.js rss-parser
npm install -D @types/markdown-it
```

- `markdown-it` — Markdown parsing for Lark Publisher editor
- `highlight.js` — Code syntax highlighting in preview
- `rss-parser` — Parse RSS feeds from WeWe-RSS for WeChat Crawler

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add markdown-it, highlight.js, rss-parser dependencies"
```

---

## Chunk 2: Lark Publisher — Editor + Preview

### Task 6: Markdown Rendering Library

**Files:**
- Create: `src/lib/apps/lark-publisher/markdown.ts`

- [ ] **Step 1: Create markdown rendering utility**

Port the markdown-it setup from VietTeamLarkPublisher's `src/lib/markdown.ts`:

```ts
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch { /* ignore */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

export function renderMarkdown(source: string): string {
  return md.render(source)
}

export { md }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/apps/lark-publisher/markdown.ts
git commit -m "feat: add markdown rendering utility for Lark Publisher"
```

---

### Task 7: Theme System

**Files:**
- Create: `src/lib/apps/lark-publisher/themes/types.ts`
- Create: `src/lib/apps/lark-publisher/themes/index.ts`
- Create: `src/lib/apps/lark-publisher/themes/classic.ts`
- Create: `src/lib/apps/lark-publisher/themes/modern.ts`
- Create: `src/lib/apps/lark-publisher/themes/lark.ts`
- Create: `src/lib/apps/lark-publisher/apply-theme.ts`

- [ ] **Step 1: Create theme type definition**

`src/lib/apps/lark-publisher/themes/types.ts`:
```ts
export interface Theme {
  id: string
  name: string
  description: string
  group: 'classic' | 'modern' | 'lark'
  styles: Record<string, string>  // CSS selector -> inline style string
}
```

- [ ] **Step 2: Port themes from VietTeamLarkPublisher**

Port the theme definitions from the original repo's `src/lib/themes/` files. Each theme file exports an array of `Theme` objects. The index file re-exports all themes as a flat array:

`src/lib/apps/lark-publisher/themes/index.ts`:
```ts
import type { Theme } from './types'
import { classicThemes } from './classic'
import { modernThemes } from './modern'
import { larkThemes } from './lark'

export const allThemes: Theme[] = [...larkThemes, ...classicThemes, ...modernThemes]
export const themeGroups = [
  { id: 'lark', label: 'Lark', themes: larkThemes },
  { id: 'classic', label: 'Classic', themes: classicThemes },
  { id: 'modern', label: 'Modern', themes: modernThemes },
]
export function getThemeById(id: string): Theme | undefined {
  return allThemes.find(t => t.id === id)
}
export type { Theme }
```

Port the actual theme definitions from the cloned repo at `C:\Users\Admin\AppData\Local\Temp\VietTeamLarkPublisher-explore\src\lib\themes\` — each classic.ts, modern.ts, lark.ts, extra.ts file contains theme objects. Copy them adapting imports.

- [ ] **Step 3: Create theme application utility**

`src/lib/apps/lark-publisher/apply-theme.ts`:
```ts
import type { Theme } from './themes/types'

export function applyTheme(html: string, theme: Theme): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement

  for (const [selector, style] of Object.entries(theme.styles)) {
    if (selector === 'container') {
      root.setAttribute('style', (root.getAttribute('style') || '') + ';' + style)
      continue
    }
    root.querySelectorAll(selector).forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.setAttribute('style', (htmlEl.getAttribute('style') || '') + ';' + style)
    })
  }

  return root.outerHTML
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/apps/lark-publisher/themes/ src/lib/apps/lark-publisher/apply-theme.ts
git commit -m "feat: add theme system for Lark Publisher"
```

---

### Task 8: Lark Publisher Editor Page

**Files:**
- Create: `src/app/dashboard/apps/lark-publisher/page.tsx`
- Create: `src/app/dashboard/apps/lark-publisher/components/markdown-editor.tsx`
- Create: `src/app/dashboard/apps/lark-publisher/components/markdown-preview.tsx`
- Create: `src/app/dashboard/apps/lark-publisher/components/theme-selector.tsx`

- [ ] **Step 1: Create MarkdownEditor component**

`src/app/dashboard/apps/lark-publisher/components/markdown-editor.tsx`:

A textarea with a toolbar for common Markdown formatting actions (bold, italic, heading, link, code, image). Uses glassmorphism styling. Accepts `value` and `onChange` props. Toolbar buttons insert markdown syntax at cursor position.

```tsx
'use client'

import { useRef } from 'react'
import { Bold, Italic, Heading1, Heading2, Link, Code, Image, List } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertAtCursor(before: string, after = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const newText = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(newText)
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
    }, 0)
  }

  const tools = [
    { icon: Bold, action: () => insertAtCursor('**', '**') },
    { icon: Italic, action: () => insertAtCursor('*', '*') },
    { icon: Heading1, action: () => insertAtCursor('# ') },
    { icon: Heading2, action: () => insertAtCursor('## ') },
    { icon: Link, action: () => insertAtCursor('[', '](url)') },
    { icon: Code, action: () => insertAtCursor('`', '`') },
    { icon: List, action: () => insertAtCursor('- ') },
    { icon: Image, action: () => insertAtCursor('![alt](', ')') },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-2 border-b border-white/10">
        {tools.map((t, i) => (
          <button key={i} onClick={t.action}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <t.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full p-4 bg-transparent text-white/90 font-mono text-sm resize-none outline-none placeholder:text-white/30"
        placeholder="Nhap Markdown tai day..."
        spellCheck={false}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create MarkdownPreview component**

`src/app/dashboard/apps/lark-publisher/components/markdown-preview.tsx`:

Renders the themed HTML output. Imports `renderMarkdown` and `applyTheme`.

```tsx
'use client'

import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/apps/lark-publisher/markdown'
import { applyTheme } from '@/lib/apps/lark-publisher/apply-theme'
import type { Theme } from '@/lib/apps/lark-publisher/themes'

interface Props {
  content: string
  theme: Theme | null
}

export function MarkdownPreview({ content, theme }: Props) {
  const html = useMemo(() => {
    const raw = renderMarkdown(content)
    return theme ? applyTheme(raw, theme) : raw
  }, [content, theme])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create ThemeSelector component**

`src/app/dashboard/apps/lark-publisher/components/theme-selector.tsx`:

Dropdown showing all themes grouped by category. Uses glassmorphism styling.

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, Palette } from 'lucide-react'
import { themeGroups, type Theme } from '@/lib/apps/lark-publisher/themes'

interface Props {
  selectedId: string
  onSelect: (theme: Theme) => void
}

export function ThemeSelector({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/15 transition-colors">
        <Palette className="h-4 w-4" />
        <span>{selectedId || 'Chon theme'}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 w-72 glass-card p-3 max-h-80 overflow-y-auto">
          {themeGroups.map((group) => (
            <div key={group.id} className="mb-3">
              <p className="text-xs font-semibold text-white/40 uppercase mb-1">{group.label}</p>
              <div className="grid grid-cols-2 gap-1">
                {group.themes.map((t) => (
                  <button key={t.id} onClick={() => { onSelect(t); setOpen(false) }}
                    className={`text-left px-2 py-1.5 rounded text-sm transition-colors ${
                      t.id === selectedId
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create the main Lark Publisher page**

`src/app/dashboard/apps/lark-publisher/page.tsx`:

Split-pane layout with editor left, preview right. Title input, theme selector, and action buttons in a top bar.

```tsx
'use client'

import { useState } from 'react'
import { Settings, Languages, Send } from 'lucide-react'
import Link from 'next/link'
import { MarkdownEditor } from './components/markdown-editor'
import { MarkdownPreview } from './components/markdown-preview'
import { ThemeSelector } from './components/theme-selector'
import { getThemeById, allThemes, type Theme } from '@/lib/apps/lark-publisher/themes'

const DEFAULT_CONTENT = `# Tieu de bai viet

Bat dau viet noi dung Markdown tai day...

## Muc luc

- Diem 1
- Diem 2

### Code

\`\`\`javascript
console.log('Hello World')
\`\`\`
`

export default function LarkPublisherPage() {
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [title, setTitle] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<Theme>(allThemes[0])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-3 border-b border-white/10">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tieu de bai viet..."
          className="glass-input flex-1 h-9 text-sm"
        />
        <ThemeSelector selectedId={selectedTheme.id} onSelect={setSelectedTheme} />
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/15 transition-colors">
          <Languages className="h-4 w-4" />
          Dich
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 gradient-btn text-sm">
          <Send className="h-4 w-4" />
          Publish
        </button>
        <Link href="/dashboard/apps/lark-publisher/settings"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* Editor + Preview split */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-white/10">
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <div className="w-1/2 bg-white/5">
          <MarkdownPreview content={content} theme={selectedTheme} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify editor renders correctly**

Run dev server, navigate to `/dashboard/apps/lark-publisher`. Verify:
- Split pane layout (editor left, preview right)
- Toolbar buttons work (bold, italic, etc.)
- Live preview updates on typing
- Theme selector dropdown works

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/apps/lark-publisher/
git commit -m "feat: add Lark Publisher editor page with live preview"
```

---

## Chunk 3: Lark Publisher — Settings + API Routes

### Task 9: Lark Publisher Settings Page

**Files:**
- Create: `src/app/dashboard/apps/lark-publisher/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Settings form with fields for Lark credentials and AI provider config. Uses `useAppSettings` hook.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useAppSettings } from '@/hooks/use-app-settings'
import type { LarkPublisherSettings } from '@/types'
import { toast } from 'sonner'

export default function LarkPublisherSettingsPage() {
  const { settings, loading, saving, saveSettings } = useAppSettings('lark-publisher')
  const [form, setForm] = useState<LarkPublisherSettings>({})

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  async function handleSave() {
    const error = await saveSettings(form)
    if (error) toast.error('Loi khi luu cai dat')
    else toast.success('Da luu cai dat')
  }

  if (loading) return <p className="text-white/50 p-8">Dang tai...</p>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/apps/lark-publisher"
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Cai dat Lark Publisher</h1>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Lark Credentials</h2>
        <div>
          <label className="text-sm text-white/50 block mb-1">App ID</label>
          <input className="glass-input w-full" value={form.lark_app_id || ''}
            onChange={(e) => setForm({ ...form, lark_app_id: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-white/50 block mb-1">App Secret</label>
          <input className="glass-input w-full" type="password" value={form.lark_app_secret || ''}
            onChange={(e) => setForm({ ...form, lark_app_secret: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-white/50 block mb-1">Wiki Space ID</label>
          <input className="glass-input w-full" value={form.lark_space_id || ''}
            onChange={(e) => setForm({ ...form, lark_space_id: e.target.value })}
            placeholder="URL hoac ID cua Wiki space" />
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">AI Translation</h2>
        <div>
          <label className="text-sm text-white/50 block mb-1">Provider</label>
          <select className="glass-input w-full" value={form.ai_provider || 'gemini'}
            onChange={(e) => setForm({ ...form, ai_provider: e.target.value as LarkPublisherSettings['ai_provider'] })}>
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-white/50 block mb-1">API Key</label>
          <input className="glass-input w-full" type="password" value={form.ai_api_key || ''}
            onChange={(e) => setForm({ ...form, ai_api_key: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-white/50 block mb-1">Model</label>
          <input className="glass-input w-full" value={form.ai_model || ''}
            onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
            placeholder="vd: gemini-2.0-flash, gpt-4o, claude-sonnet-4" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="gradient-btn flex items-center gap-2 px-6 py-2">
        <Save className="h-4 w-4" />
        {saving ? 'Dang luu...' : 'Luu cai dat'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/apps/lark-publisher/settings/
git commit -m "feat: add Lark Publisher settings page"
```

---

### Task 10: AI Translation API Route

**Files:**
- Create: `src/lib/apps/lark-publisher/ai-translate.ts`
- Create: `src/app/api/apps/lark-publisher/translate/route.ts`

- [ ] **Step 1: Create AI translation utility**

`src/lib/apps/lark-publisher/ai-translate.ts`:

Multi-provider translation — supports Gemini, OpenAI, Anthropic. Reads user's settings for provider/key/model.

```ts
import type { LarkPublisherSettings } from '@/types'

const SYSTEM_PROMPT = `You are a professional translator. Translate the following content to Vietnamese. Rules:
1. Keep all Markdown formatting intact
2. Do not translate code blocks, URLs, or image references
3. Keep technical terms in English with Vietnamese explanation in parentheses
4. Maintain the original tone and style
5. Translate naturally, not word-by-word`

export async function translateContent(
  content: string,
  settings: LarkPublisherSettings,
  from = 'Chinese',
  to = 'Vietnamese'
): Promise<string> {
  const provider = settings.ai_provider || 'gemini'
  const apiKey = settings.ai_api_key
  if (!apiKey) throw new Error('Chua cau hinh AI API Key. Vui long vao Settings de thiet lap.')

  const userPrompt = `Translate from ${from} to ${to}:\n\n${content}`

  switch (provider) {
    case 'gemini':
      return translateWithGemini(apiKey, settings.ai_model || 'gemini-2.0-flash', userPrompt)
    case 'openai':
      return translateWithOpenAI(apiKey, settings.ai_model || 'gpt-4o', userPrompt)
    case 'anthropic':
      return translateWithAnthropic(apiKey, settings.ai_model || 'claude-sonnet-4-20250514', userPrompt)
    default:
      throw new Error(`Provider khong duoc ho tro: ${provider}`)
  }
}

async function translateWithGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function translateWithOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error')
  return data.choices?.[0]?.message?.content || ''
}

async function translateWithAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error')
  return data.content?.[0]?.text || ''
}
```

- [ ] **Step 2: Create translate API route**

`src/app/api/apps/lark-publisher/translate/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateContent } from '@/lib/apps/lark-publisher/ai-translate'
import type { LarkPublisherSettings } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, from, to } = await req.json()
  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  // Get user's AI settings
  const { data: settingsRow } = await supabase
    .from('user_app_settings')
    .select('settings')
    .eq('user_id', user.id)
    .eq('app_name', 'lark-publisher')
    .single()

  const settings = (settingsRow?.settings || {}) as LarkPublisherSettings

  try {
    const translated = await translateContent(content, settings, from, to)
    return NextResponse.json({ translated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/apps/lark-publisher/ai-translate.ts src/app/api/apps/lark-publisher/translate/
git commit -m "feat: add AI translation API for Lark Publisher"
```

---

### Task 11: Lark Publish API Route

**Files:**
- Create: `src/lib/apps/lark-publisher/lark-api.ts`
- Create: `src/app/api/apps/lark-publisher/publish/route.ts`

- [ ] **Step 1: Create Lark API client**

`src/lib/apps/lark-publisher/lark-api.ts`:

Port the core Lark API flow from VietTeamLarkPublisher's `larkPublish.ts` and `larkInsert.ts`:

```ts
import type { LarkPublisherSettings } from '@/types'

const LARK_BASE = 'https://open.larksuite.com/open-apis'

async function getLarkToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch(`${LARK_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Lark auth failed: ${data.msg}`)
  return data.tenant_access_token
}

async function createDocument(token: string, title: string): Promise<{ documentId: string }> {
  const res = await fetch(`${LARK_BASE}/docx/v1/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  })
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Create doc failed: ${data.msg}`)
  return { documentId: data.data.document.document_id }
}

async function createBlock(
  token: string,
  documentId: string,
  blockId: string,
  children: object[]
): Promise<void> {
  const res = await fetch(
    `${LARK_BASE}/docx/v1/documents/${documentId}/blocks/${blockId}/children`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ children, index: -1 }),
    }
  )
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Insert block failed: ${data.msg}`)
}

export async function publishToLark(
  settings: LarkPublisherSettings,
  title: string,
  htmlContent: string
): Promise<{ docUrl: string }> {
  if (!settings.lark_app_id || !settings.lark_app_secret) {
    throw new Error('Chua cau hinh Lark credentials. Vui long vao Settings.')
  }

  const token = await getLarkToken(settings.lark_app_id, settings.lark_app_secret)
  const { documentId } = await createDocument(token, title)

  // Create a simple paragraph block with the content
  // For MVP, we insert HTML as text content
  // Full Lark block conversion can be added later
  const textBlock = {
    block_type: 2, // paragraph
    paragraph: {
      elements: [{ text_run: { content: htmlContent.replace(/<[^>]*>/g, '') } }],
    },
  }

  await createBlock(token, documentId, documentId, [textBlock])

  const docUrl = `https://larksuite.com/docx/${documentId}`
  return { docUrl }
}
```

- [ ] **Step 2: Create publish API route**

`src/app/api/apps/lark-publisher/publish/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishToLark } from '@/lib/apps/lark-publisher/lark-api'
import type { LarkPublisherSettings } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, html } = await req.json()
  if (!title || !html) return NextResponse.json({ error: 'Title and HTML required' }, { status: 400 })

  const { data: settingsRow } = await supabase
    .from('user_app_settings')
    .select('settings')
    .eq('user_id', user.id)
    .eq('app_name', 'lark-publisher')
    .single()

  const settings = (settingsRow?.settings || {}) as LarkPublisherSettings

  try {
    const result = await publishToLark(settings, title, html)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Wire translate and publish buttons in editor page**

Update `src/app/dashboard/apps/lark-publisher/page.tsx` to call the API routes when Translate/Publish buttons are clicked. Add `useState` for `translating` and `publishing` loading states. Use `toast` for success/error feedback.

- [ ] **Step 4: Commit**

```bash
git add src/lib/apps/lark-publisher/lark-api.ts src/app/api/apps/lark-publisher/publish/
git add src/app/dashboard/apps/lark-publisher/page.tsx
git commit -m "feat: add Lark publish + wire translate/publish buttons"
```

---

## Chunk 4: WeChat Crawler — UI + API Routes

### Task 12: WeChat Crawler API Routes

**Files:**
- Create: `src/lib/apps/wechat-crawler/rss-parser.ts`
- Create: `src/app/api/apps/wechat-crawler/accounts/route.ts`
- Create: `src/app/api/apps/wechat-crawler/sync/route.ts`
- Create: `src/app/api/apps/wechat-crawler/articles/route.ts`
- Create: `src/app/api/apps/wechat-crawler/export/route.ts`

- [ ] **Step 1: Create RSS parser utility**

`src/lib/apps/wechat-crawler/rss-parser.ts`:

```ts
import Parser from 'rss-parser'

const parser = new Parser()

export interface FeedArticle {
  title: string
  author: string
  url: string
  guid: string
  content: string
  summary: string
  published_at: string
  cover_image: string | null
}

export async function fetchFeed(feedUrl: string, authCode?: string): Promise<FeedArticle[]> {
  const headers: Record<string, string> = {}
  if (authCode) headers.Authorization = `Bearer ${authCode}`

  // Try JSON format first (WeWe-RSS supports .json)
  const jsonUrl = feedUrl.replace(/\.(rss|atom)$/, '.json')
  try {
    const res = await fetch(jsonUrl, { headers })
    if (res.ok) {
      const data = await res.json()
      const items = data.items || data.entries || []
      return items.map((item: Record<string, unknown>) => ({
        title: (item.title as string) || '',
        author: (item.author as string) || (item.creator as string) || '',
        url: (item.url as string) || (item.link as string) || '',
        guid: (item.id as string) || (item.guid as string) || (item.url as string) || '',
        content: (item.content_html as string) || (item.content as string) || (item.description as string) || '',
        summary: ((item.summary as string) || (item.description as string) || '').slice(0, 200),
        published_at: (item.date_published as string) || (item.pubDate as string) || new Date().toISOString(),
        cover_image: (item.image as string) || null,
      }))
    }
  } catch { /* fall through to RSS parsing */ }

  // Fall back to RSS/Atom parsing
  const feed = await parser.parseURL(feedUrl)
  return (feed.items || []).map((item) => ({
    title: item.title || '',
    author: item.creator || item.author || '',
    url: item.link || '',
    guid: item.guid || item.link || '',
    content: item['content:encoded'] || item.content || item.contentSnippet || '',
    summary: (item.contentSnippet || '').slice(0, 200),
    published_at: item.isoDate || item.pubDate || new Date().toISOString(),
    cover_image: null,
  }))
}

export function countWords(text: string): number {
  const plainText = text.replace(/<[^>]*>/g, '').trim()
  // Count Chinese characters individually + English words
  const cjk = plainText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length || 0
  const words = plainText.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
    .split(/\s+/).filter(Boolean).length
  return cjk + words
}
```

- [ ] **Step 2: Create accounts API route**

`src/app/api/apps/wechat-crawler/accounts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('wechat_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ accounts: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_name, feed_id, feed_url } = await req.json()
  if (!account_name) return NextResponse.json({ error: 'account_name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('wechat_accounts')
    .insert({ user_id: user.id, account_name, feed_id, feed_url })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('wechat_accounts').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create sync API route**

`src/app/api/apps/wechat-crawler/sync/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFeed, countWords } from '@/lib/apps/wechat-crawler/rss-parser'
import type { WeChatCrawlerSettings } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id } = await req.json()

  // Get user settings
  const { data: settingsRow } = await supabase
    .from('user_app_settings')
    .select('settings')
    .eq('user_id', user.id)
    .eq('app_name', 'wechat-crawler')
    .single()
  const settings = (settingsRow?.settings || {}) as WeChatCrawlerSettings
  const baseUrl = settings.wewe_rss_url || 'http://localhost:4000'

  // Get accounts to sync
  let query = supabase.from('wechat_accounts').select('*').eq('user_id', user.id)
  if (account_id) query = query.eq('id', account_id)
  const { data: accounts } = await query

  if (!accounts?.length) return NextResponse.json({ error: 'No accounts found' }, { status: 404 })

  let totalSynced = 0
  const errors: string[] = []

  for (const account of accounts) {
    const feedUrl = account.feed_url || `${baseUrl}/feeds/${account.feed_id}.json`

    // Record sync start
    const { data: syncRecord } = await supabase
      .from('wechat_sync_history')
      .insert({ user_id: user.id, account_id: account.id, status: 'running' })
      .select().single()

    try {
      const articles = await fetchFeed(feedUrl, settings.wewe_rss_auth_code)
      let newCount = 0

      for (const article of articles) {
        const { error: insertError } = await supabase
          .from('wechat_articles')
          .upsert({
            user_id: user.id,
            account_id: account.id,
            title: article.title,
            author: article.author,
            url: article.url,
            guid: article.guid,
            content: article.content.replace(/<[^>]*>/g, '').slice(0, 5000),
            content_html: article.content,
            summary: article.summary,
            cover_image: article.cover_image,
            word_count: countWords(article.content),
            published_at: article.published_at,
          }, { onConflict: 'user_id,url', ignoreDuplicates: false })

        if (!insertError) newCount++
      }

      // Update account stats
      await supabase.from('wechat_accounts')
        .update({ article_count: articles.length, last_synced_at: new Date().toISOString() })
        .eq('id', account.id)

      // Complete sync record
      if (syncRecord) {
        await supabase.from('wechat_sync_history')
          .update({
            status: 'success',
            articles_fetched: articles.length,
            articles_new: newCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncRecord.id)
      }

      totalSynced += newCount
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`${account.account_name}: ${msg}`)
      if (syncRecord) {
        await supabase.from('wechat_sync_history')
          .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
          .eq('id', syncRecord.id)
      }
    }
  }

  return NextResponse.json({ synced: totalSynced, errors })
}
```

- [ ] **Step 4: Create articles API route**

`src/app/api/apps/wechat-crawler/articles/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('wechat_articles')
    .select('*, account:wechat_accounts(account_name)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (accountId) query = query.eq('account_id', accountId)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, count } = await query
  return NextResponse.json({ articles: data || [], total: count || 0, page, limit })
}
```

- [ ] **Step 5: Create export API route**

`src/app/api/apps/wechat-crawler/export/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'
  const accountId = searchParams.get('account_id')

  let query = supabase
    .from('wechat_articles')
    .select('id, title, author, url, summary, word_count, published_at, tags')
    .eq('user_id', user.id)
    .order('published_at', { ascending: false })

  if (accountId) query = query.eq('account_id', accountId)
  const { data: articles } = await query

  if (format === 'csv') {
    const header = 'ID,Title,Author,URL,Summary,Words,Published\n'
    const rows = (articles || []).map(a =>
      `"${a.id}","${(a.title || '').replace(/"/g, '""')}","${a.author || ''}","${a.url || ''}","${(a.summary || '').replace(/"/g, '""').slice(0, 100)}",${a.word_count},"${a.published_at || ''}"`
    ).join('\n')
    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wechat-articles-${Date.now()}.csv"`,
      },
    })
  }

  return NextResponse.json(articles || [])
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/apps/wechat-crawler/ src/app/api/apps/wechat-crawler/
git commit -m "feat: add WeChat Crawler API routes (accounts, sync, articles, export)"
```

---

### Task 13: WeChat Crawler Main Page

**Files:**
- Create: `src/app/dashboard/apps/wechat-crawler/page.tsx`
- Create: `src/app/dashboard/apps/wechat-crawler/components/accounts-tab.tsx`
- Create: `src/app/dashboard/apps/wechat-crawler/components/articles-tab.tsx`

- [ ] **Step 1: Create AccountsTab component**

`src/app/dashboard/apps/wechat-crawler/components/accounts-tab.tsx`:

List of tracked accounts with add/delete/sync functionality.

```tsx
'use client'

import { useState } from 'react'
import { Plus, RefreshCw, Trash2, X } from 'lucide-react'
import type { WeChatAccount } from '@/types'
import { toast } from 'sonner'

interface Props {
  accounts: WeChatAccount[]
  onReload: () => void
}

export function AccountsTab({ accounts, onReload }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [feedId, setFeedId] = useState('')
  const [feedUrl, setFeedUrl] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim()) return
    const res = await fetch('/api/apps/wechat-crawler/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_name: name, feed_id: feedId || null, feed_url: feedUrl || null }),
    })
    if (res.ok) {
      toast.success('Da them tai khoan')
      setName(''); setFeedId(''); setFeedUrl(''); setShowForm(false)
      onReload()
    } else toast.error('Loi khi them tai khoan')
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoa tai khoan nay?')) return
    await fetch('/api/apps/wechat-crawler/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('Da xoa')
    onReload()
  }

  async function handleSync(accountId?: string) {
    setSyncing(accountId || 'all')
    const res = await fetch('/api/apps/wechat-crawler/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId }),
    })
    const data = await res.json()
    if (res.ok) toast.success(`Dong bo thanh cong: ${data.synced} bai moi`)
    else toast.error(data.error || 'Loi dong bo')
    setSyncing(null)
    onReload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowForm(!showForm)}
          className="gradient-btn flex items-center gap-1.5 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> Them tai khoan
        </button>
        <button onClick={() => handleSync()} disabled={syncing === 'all'}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors">
          <RefreshCw className={`h-4 w-4 ${syncing === 'all' ? 'animate-spin' : ''}`} />
          Sync tat ca
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Them tai khoan moi</h3>
            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input className="glass-input w-full" placeholder="Ten tai khoan *" value={name}
            onChange={(e) => setName(e.target.value)} />
          <input className="glass-input w-full" placeholder="Feed ID (tu WeWe-RSS)" value={feedId}
            onChange={(e) => setFeedId(e.target.value)} />
          <input className="glass-input w-full" placeholder="Hoac nhap Feed URL truc tiep" value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)} />
          <button onClick={handleAdd} className="gradient-btn px-4 py-1.5 text-sm">Them</button>
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="text-white/40 text-center py-8">Chua co tai khoan nao. Them tai khoan de bat dau crawl.</p>
      ) : (
        accounts.map((acc) => (
          <div key={acc.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{acc.account_name}</p>
              <p className="text-white/40 text-sm">
                {acc.article_count} bai · {acc.last_synced_at
                  ? `Sync: ${new Date(acc.last_synced_at).toLocaleDateString('vi-VN')}`
                  : 'Chua sync'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSync(acc.id)} disabled={syncing === acc.id}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <RefreshCw className={`h-4 w-4 ${syncing === acc.id ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => handleDelete(acc.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create ArticlesTab component**

`src/app/dashboard/apps/wechat-crawler/components/articles-tab.tsx`:

Paginated article list with search and account filter.

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Download, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { WeChatArticle, WeChatAccount } from '@/types'

interface Props {
  accounts: WeChatAccount[]
}

export function ArticlesTab({ accounts }: Props) {
  const [articles, setArticles] = useState<WeChatArticle[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadArticles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (accountFilter) params.set('account_id', accountFilter)

    const res = await fetch(`/api/apps/wechat-crawler/articles?${params}`)
    const data = await res.json()
    setArticles(data.articles || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, accountFilter])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadArticles() }, [loadArticles])

  async function handleExport(format: 'json' | 'csv') {
    const params = new URLSearchParams({ format })
    if (accountFilter) params.set('account_id', accountFilter)
    window.open(`/api/apps/wechat-crawler/export?${params}`, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input className="glass-input w-full pl-9" placeholder="Tim kiem bai viet..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="glass-input" value={accountFilter}
          onChange={(e) => { setAccountFilter(e.target.value); setPage(1) }}>
          <option value="">Tat ca tai khoan</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
        <button onClick={() => handleExport('json')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-white/20 text-white hover:bg-white/10">
          <Download className="h-4 w-4" /> JSON
        </button>
        <button onClick={() => handleExport('csv')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-white/20 text-white hover:bg-white/10">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {loading ? (
        <p className="text-white/50 text-center py-8">Dang tai...</p>
      ) : articles.length === 0 ? (
        <p className="text-white/40 text-center py-8">Khong co bai viet nao.</p>
      ) : (
        articles.map((article) => (
          <div key={article.id} className="glass-card p-4">
            <div className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}>
              <div className="flex-1">
                <p className="text-white font-medium">{article.title}</p>
                <p className="text-white/40 text-sm mt-1">
                  {(article.account as unknown as WeChatAccount)?.account_name || ''} ·{' '}
                  {article.author} · {article.word_count} chu ·{' '}
                  {article.published_at ? new Date(article.published_at).toLocaleDateString('vi-VN') : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {expandedId === article.id
                  ? <ChevronUp className="h-4 w-4 text-white/40" />
                  : <ChevronDown className="h-4 w-4 text-white/40" />}
              </div>
            </div>
            {expandedId === article.id && (
              <div className="mt-3 pt-3 border-t border-white/10">
                {article.summary && <p className="text-white/60 text-sm mb-2">{article.summary}</p>}
                {article.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {article.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {article.content && (
                  <div className="text-white/50 text-sm max-h-60 overflow-y-auto bg-white/5 p-3 rounded-lg">
                    {article.content.slice(0, 1000)}
                    {article.content.length > 1000 && '...'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 text-sm rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30">
            Truoc
          </button>
          <span className="text-white/50 text-sm">Trang {page} / {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1 text-sm rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30">
            Sau
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create main WeChat Crawler page**

`src/app/dashboard/apps/wechat-crawler/page.tsx`:

Two-tab layout (Accounts, Articles) using the same glass tab pattern as leaderboard.

```tsx
'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { AccountsTab } from './components/accounts-tab'
import { ArticlesTab } from './components/articles-tab'
import type { WeChatAccount } from '@/types'

export default function WeChatCrawlerPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [tab, setTab] = useState<'articles' | 'accounts'>('articles')
  const [accounts, setAccounts] = useState<WeChatAccount[]>([])

  const loadAccounts = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('wechat_accounts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setAccounts(data || [])
  }, [supabase, profile?.id])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAccounts() }, [loadAccounts])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">WeChat Crawler</h1>
        <Link href="/dashboard/apps/wechat-crawler/settings"
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      {/* Glass tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-fit">
        {[
          { id: 'articles' as const, label: 'Bai viet' },
          { id: 'accounts' as const, label: 'Tai khoan' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? 'bg-white/15 text-white shadow-lg shadow-violet-500/10'
                : 'text-white/50 hover:text-white/80'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' ? (
        <AccountsTab accounts={accounts} onReload={loadAccounts} />
      ) : (
        <ArticlesTab accounts={accounts} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/apps/wechat-crawler/
git commit -m "feat: add WeChat Crawler page with accounts and articles tabs"
```

---

### Task 14: WeChat Crawler Settings Page

**Files:**
- Create: `src/app/dashboard/apps/wechat-crawler/settings/page.tsx`

- [ ] **Step 1: Create settings page**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useAppSettings } from '@/hooks/use-app-settings'
import type { WeChatCrawlerSettings } from '@/types'
import { toast } from 'sonner'

export default function WeChatCrawlerSettingsPage() {
  const { settings, loading, saving, saveSettings } = useAppSettings('wechat-crawler')
  const [form, setForm] = useState<WeChatCrawlerSettings>({})

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  async function handleSave() {
    const error = await saveSettings(form)
    if (error) toast.error('Loi khi luu cai dat')
    else toast.success('Da luu cai dat')
  }

  if (loading) return <p className="text-white/50 p-8">Dang tai...</p>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/apps/wechat-crawler"
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Cai dat WeChat Crawler</h1>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">WeWe-RSS</h2>
        <div>
          <label className="text-sm text-white/50 block mb-1">Server URL</label>
          <input className="glass-input w-full" value={form.wewe_rss_url || ''}
            onChange={(e) => setForm({ ...form, wewe_rss_url: e.target.value })}
            placeholder="http://localhost:4000" />
        </div>
        <div>
          <label className="text-sm text-white/50 block mb-1">Auth Code (optional)</label>
          <input className="glass-input w-full" type="password" value={form.wewe_rss_auth_code || ''}
            onChange={(e) => setForm({ ...form, wewe_rss_auth_code: e.target.value })} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="gradient-btn flex items-center gap-2 px-6 py-2">
        <Save className="h-4 w-4" />
        {saving ? 'Dang luu...' : 'Luu cai dat'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/apps/wechat-crawler/settings/
git commit -m "feat: add WeChat Crawler settings page"
```

---

## Chunk 5: Final Integration + Verification

### Task 15: Fix Data Fetching Pattern (createClient inside components)

Before committing everything, ensure ALL new files use the correct pattern:

```ts
const supabase = useMemo(() => createClient(), [])
```

NOT module-level `const supabase = createClient()`.

**Files to verify:**
- `src/app/dashboard/apps/wechat-crawler/page.tsx` — already uses useMemo pattern
- `src/hooks/use-app-settings.ts` — already uses useMemo pattern

- [ ] **Step 1: Audit all new files for correct pattern**

Grep for `createClient()` calls in new files and verify they use `useMemo`.

- [ ] **Step 2: Commit if any fixes needed**

---

### Task 16: Full Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run ESLint**

```bash
npx eslint src/
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run build**

```bash
npx next build
```

Expected: Build succeeds with all new routes listed.

- [ ] **Step 4: Manual testing**

Start dev server and test:
1. Sidebar shows "UNG DUNG" section with both app links
2. Lark Publisher: editor + preview split works, themes change styling, settings page saves
3. WeChat Crawler: add account, sync (will fail if no WeWe-RSS running — that's expected), articles list, export buttons, settings page saves

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: complete apps integration — Lark Publisher + WeChat Crawler"
git push origin master:main
```
