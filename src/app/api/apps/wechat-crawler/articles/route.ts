import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('account_id')
    const search = searchParams.get('search') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('wechat_articles')
      .select('*, account:wechat_accounts(id, account_name)', { count: 'exact' })
      .eq('user_id', user.id)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,author.ilike.%${search}%`)
    }

    query = query
      .order('published_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      articles: data ?? [],
      total: count ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch articles'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
