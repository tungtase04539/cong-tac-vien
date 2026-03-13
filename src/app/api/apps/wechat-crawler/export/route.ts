import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WeChatArticle } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'json'
    const accountId = searchParams.get('account_id')

    let query = supabase
      .from('wechat_articles')
      .select('*, account:wechat_accounts(id, account_name)')
      .eq('user_id', user.id)
      .order('published_at', { ascending: false })

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const articles = (data ?? []) as (WeChatArticle & { account: { id: string; account_name: string } | null })[]

    if (format === 'csv') {
      const headers = ['title', 'author', 'account_name', 'url', 'word_count', 'published_at', 'summary']
      const rows = articles.map((a) => [
        `"${(a.title ?? '').replace(/"/g, '""')}"`,
        `"${(a.author ?? '').replace(/"/g, '""')}"`,
        `"${(a.account?.account_name ?? '').replace(/"/g, '""')}"`,
        `"${(a.url ?? '').replace(/"/g, '""')}"`,
        a.word_count ?? 0,
        a.published_at ?? '',
        `"${(a.summary ?? '').replace(/"/g, '""')}"`,
      ])
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="wechat-articles-${Date.now()}.csv"`,
        },
      })
    }

    // JSON
    const jsonData = articles.map((a) => ({
      id: a.id,
      title: a.title,
      author: a.author,
      account_name: a.account?.account_name ?? null,
      url: a.url,
      word_count: a.word_count,
      published_at: a.published_at,
      summary: a.summary,
      tags: a.tags,
      cover_image: a.cover_image,
    }))

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="wechat-articles-${Date.now()}.json"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
