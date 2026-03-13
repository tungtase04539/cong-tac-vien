# Apps Integration Design — Lark Publisher & WeChat Crawler

**Date:** 2026-03-13
**Status:** Draft

## Overview

Integrate two external apps into Wiki CTV OS as full Next.js pages under a new "Ung dung" (Apps) section in the sidebar. Both apps are rewritten from their original codebases into TypeScript/Next.js, sharing the existing glassmorphism UI theme, Supabase backend, and auth system.

**Source repos:**
- `tungtase04539/VietTeamLarkPublisher` (React/Vite → Next.js)
- `tungtase04539/wexin-crawler` (Python CLI → Next.js API Routes + UI)

## Decisions

| Decision | Choice |
|---|---|
| Integration style | Full rewrite into Next.js pages |
| Role restrictions | None — all users can access both apps |
| Crawler backend | Next.js API Routes (TypeScript) |
| API keys management | Per-user settings stored in Supabase |

---

## 1. Navigation Changes

### Sidebar Structure

Add a new "UNG DUNG" section between the user nav items and the ADMIN section:

```
── (main nav) ──
Trang chu
Task Market
Task cua toi
Submissions
Vi diem
Bang xep hang
Ho so

── UNG DUNG ──
Lark Publisher      → /dashboard/apps/lark-publisher
WeChat Crawler      → /dashboard/apps/wechat-crawler

── ADMIN ──
QA Review
Dashboard Admin
Quan ly Task
Quan ly CTV
Thanh toan
```

**Files changed:** `src/components/layout/sidebar.tsx`
- Add new `appItems` array with icons (BookOpen for Lark Publisher, Globe for WeChat Crawler)
- Render with "UNG DUNG" section header, same pattern as ADMIN section
- No role filtering (visible to all authenticated users)

---

## 2. App 1: Lark Publisher

### Route Structure

```
/dashboard/apps/lark-publisher          → Main editor page
/dashboard/apps/lark-publisher/settings → API keys config
```

### 2.1 Editor Page (`/dashboard/apps/lark-publisher/page.tsx`)

**Layout:** Split-pane — editor left, preview right (resizable).

**Components:**
- `MarkdownEditor` — Textarea with toolbar (bold, italic, heading, link, image, code)
- `MarkdownPreview` — Rendered HTML preview with theme applied
- `ThemeSelector` — Dropdown to pick styling theme
- `PublishBar` — Top bar with: document title input, theme selector, translate button, publish button

**Core features:**
- Real-time Markdown editing with `markdown-it` + `highlight.js` for code blocks
- 30+ CSS themes for preview styling (ported from original repo's theme files)
- Live preview updates on keystroke
- Document title input

**AI Translation:**
- Translate button opens a modal/panel to select source → target language
- Calls Next.js API route `/api/apps/lark-publisher/translate`
- API route uses user's configured AI provider (Gemini/GPT-4/Claude)
- Streams translated content back, replaces editor content
- Provider selection based on user's settings

**Publish to Lark:**
- Publish button triggers `/api/apps/lark-publisher/publish`
- Converts themed Markdown → HTML
- Uses Lark Open API to create/update a document
- Requires user to configure Lark credentials in settings
- Shows success/error toast notification

**Image handling:**
- Drag-and-drop or paste images into editor
- Upload to Supabase Storage bucket `lark-publisher-images`
- Insert Markdown image syntax with public URL

### 2.2 Settings Page (`/dashboard/apps/lark-publisher/settings/page.tsx`)

**Fields:**
- Lark App ID
- Lark App Secret
- Lark Space ID (Wiki space to publish to)
- AI Provider (select: Gemini / GPT-4 / Claude)
- AI API Key

**Storage:** Supabase table `user_app_settings` (see Database section).

**UI:** Glass card form, same pattern as profile page. Save button persists to Supabase.

### 2.3 API Routes

```
/api/apps/lark-publisher/translate   POST  — AI translation
/api/apps/lark-publisher/publish     POST  — Publish to Lark
```

**Translate endpoint:**
- Input: `{ content: string, from: string, to: string }`
- Reads user's AI config from `user_app_settings`
- Calls appropriate AI provider API
- Returns: `{ translated: string }`

**Publish endpoint:**
- Input: `{ title: string, html: string }`
- Reads user's Lark credentials from `user_app_settings`
- Calls Lark Open API: get tenant access token → create doc / update doc
- Returns: `{ success: boolean, docUrl?: string, error?: string }`

---

## 3. App 2: WeChat Crawler

### Route Structure

```
/dashboard/apps/wechat-crawler              → Articles list + account management
/dashboard/apps/wechat-crawler/settings     → WeWe-RSS config
```

### 3.1 Main Page (`/dashboard/apps/wechat-crawler/page.tsx`)

**Layout:** Two tabs — "Bai viet" (Articles) and "Tai khoan" (Accounts).

**Accounts tab:**
- List of tracked WeChat public accounts (name, article count, last sync)
- "Them tai khoan" (Add account) button → inline form: account name/ID
- Sync button per account → calls `/api/apps/wechat-crawler/sync`
- "Sync tat ca" (Sync all) button
- Delete account button

**Articles tab:**
- List of crawled articles with: title, account name, publish date, word count
- Search bar (filter by title)
- Filter by account (dropdown)
- Sort by date (newest first)
- Click article → expand inline to show content preview
- Export buttons: JSON, CSV → calls `/api/apps/wechat-crawler/export`

**Article detail (inline expand or separate view):**
- Full article content rendered as HTML
- Images displayed inline
- Metadata: author, publish date, source URL
- Copy content button

### 3.2 Settings Page (`/dashboard/apps/wechat-crawler/settings/page.tsx`)

**Fields:**
- WeWe-RSS URL (default: `http://localhost:4000`)
- Sync interval preference (manual only for now)

**Storage:** Supabase table `user_app_settings`.

### 3.3 API Routes

```
/api/apps/wechat-crawler/accounts    GET/POST/DELETE  — CRUD accounts
/api/apps/wechat-crawler/sync        POST             — Sync articles from WeWe-RSS
/api/apps/wechat-crawler/articles    GET              — List articles with filters
/api/apps/wechat-crawler/export      GET              — Export as JSON/CSV
```

**Sync endpoint:**
- Input: `{ accountId?: string }` (optional — sync all if omitted)
- Reads user's WeWe-RSS URL from settings
- Fetches RSS feeds for each tracked account
- Parses articles: title, content (HTML), images, metadata
- Upserts into `wechat_articles` table
- Records sync in `wechat_sync_history`
- Returns: `{ synced: number, errors: string[] }`

**Articles endpoint:**
- Query params: `?account_id=&search=&page=&limit=`
- Returns paginated articles from Supabase

**Export endpoint:**
- Query params: `?format=json|csv&account_id=`
- Returns file download

---

## 4. Database Schema

### New Tables

```sql
-- User app settings (API keys, config per user per app)
CREATE TABLE user_app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,           -- 'lark-publisher' | 'wechat-crawler'
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app_name)
);

-- WeChat accounts being tracked
CREATE TABLE wechat_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_id TEXT,                  -- WeChat public account ID
  feed_url TEXT,                    -- RSS feed URL
  article_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crawled WeChat articles
CREATE TABLE wechat_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES wechat_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,                     -- HTML content
  author TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  word_count INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]',        -- Array of image URLs
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, source_url)       -- Prevent duplicates
);

-- Sync history
CREATE TABLE wechat_sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES wechat_accounts(id) ON DELETE SET NULL,
  articles_synced INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security

All new tables get RLS policies: users can only read/write their own data.

```sql
-- Same pattern for all tables:
ALTER TABLE user_app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings"
  ON user_app_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Repeat for wechat_accounts, wechat_articles, wechat_sync_history
```

---

## 5. File Structure

```
src/
  app/
    dashboard/
      apps/
        lark-publisher/
          page.tsx              -- Editor page
          settings/
            page.tsx            -- Settings page
          components/
            markdown-editor.tsx
            markdown-preview.tsx
            theme-selector.tsx
            publish-bar.tsx
        wechat-crawler/
          page.tsx              -- Articles + accounts page
          settings/
            page.tsx            -- Settings page
          components/
            accounts-tab.tsx
            articles-tab.tsx
            article-detail.tsx
    api/
      apps/
        lark-publisher/
          translate/
            route.ts
          publish/
            route.ts
        wechat-crawler/
          accounts/
            route.ts
          sync/
            route.ts
          articles/
            route.ts
          export/
            route.ts
  lib/
    apps/
      lark-publisher/
        themes.ts              -- Theme CSS definitions
        lark-api.ts            -- Lark Open API client
        ai-translate.ts        -- AI translation logic
      wechat-crawler/
        rss-parser.ts          -- RSS feed parser
        content-processor.ts   -- HTML content processor
        export-utils.ts        -- JSON/CSV export helpers
```

---

## 6. UI/UX Design

All new pages follow the existing glassmorphism theme:
- Glass cards: `glass-card` class
- Glass inputs: `glass-input` class
- Gradient buttons: `gradient-btn` class
- Semi-transparent badges
- White text on dark gradient background

**Editor layout** uses CSS Grid with resizable panes (CSS `resize` or a drag handle).

**Crawler layout** uses the same tab pattern as the leaderboard page (custom glass tabs).

---

## 7. Dependencies

New npm packages needed:

```
markdown-it          — Markdown parsing
highlight.js         — Code syntax highlighting
rss-parser           — Parse RSS/Atom feeds (for WeChat crawler)
```

No Python dependencies needed — everything rewritten in TypeScript.

---

## 8. Error Handling

- API routes return consistent `{ success, data?, error? }` shape
- Settings page validates required fields before save
- Sync errors are logged to `wechat_sync_history.errors` and shown in UI
- Publish errors show toast with Lark API error message
- Missing API keys show a prompt to configure in Settings

---

## 9. Security

- API keys stored in Supabase with RLS (only owner can read)
- API routes verify auth session before processing
- Lark credentials never sent to client — only used server-side in API routes
- WeWe-RSS URL validated before making requests
- Rate limiting on sync endpoint (max 1 sync per account per 5 minutes)
