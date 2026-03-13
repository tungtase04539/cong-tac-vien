import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFeed, countWords } from '@/lib/apps/wechat-crawler/rss-parser'
import type { WeChatCrawlerSettings, WeChatAccount } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as { account_id?: string }
    const accountId = body.account_id ?? null

    // Get WeWe-RSS settings
    const { data: settingsRow } = await supabase
      .from('user_app_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('app_name', 'wechat-crawler')
      .single()

    const settings = (settingsRow?.settings ?? {}) as WeChatCrawlerSettings
    const weweRssUrl = settings.wewe_rss_url ?? ''
    const authCode = settings.wewe_rss_auth_code ?? ''

    // Get accounts to sync
    let accountsQuery = supabase
      .from('wechat_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (accountId) {
      accountsQuery = accountsQuery.eq('id', accountId)
    }

    const { data: accounts, error: accError } = await accountsQuery
    if (accError) {
      return NextResponse.json({ error: accError.message }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No active accounts found' }, { status: 404 })
    }

    // Record sync start
    const { data: historyRow } = await supabase
      .from('wechat_sync_history')
      .insert({
        user_id: user.id,
        account_id: accountId,
        sync_type: accountId ? 'single' : 'all',
        status: 'running',
        articles_fetched: 0,
        articles_new: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    const historyId = historyRow?.id

    let totalFetched = 0
    let totalNew = 0
    const errors: string[] = []

    for (const account of (accounts as WeChatAccount[])) {
      try {
        // Build feed URL
        let feedUrl = account.feed_url ?? ''
        if (!feedUrl && weweRssUrl && account.feed_id) {
          feedUrl = `${weweRssUrl.replace(/\/$/, '')}/feed/${account.feed_id}`
        }
        if (!feedUrl) {
          errors.push(`Account ${account.account_name}: no feed URL configured`)
          continue
        }

        const articles = await fetchFeed(feedUrl, authCode || undefined)
        totalFetched += articles.length

        if (articles.length === 0) continue

        // Upsert articles
        const rows = articles.map((a) => ({
          user_id: user.id,
          account_id: account.id,
          title: a.title,
          author: a.author || null,
          url: a.url || null,
          guid: a.guid || null,
          content: a.content || null,
          content_html: a.content || null,
          summary: a.summary || null,
          cover_image: a.cover_image,
          images: [],
          word_count: countWords(a.content || ''),
          tags: [],
          published_at: a.published_at || null,
        }))

        const { data: upserted, error: upsertError } = await supabase
          .from('wechat_articles')
          .upsert(rows, { onConflict: 'user_id,url', ignoreDuplicates: false })
          .select('id')

        if (upsertError) {
          errors.push(`Account ${account.account_name}: ${upsertError.message}`)
          continue
        }

        const newCount = upserted?.length ?? 0
        totalNew += newCount

        // Update account stats
        const { count } = await supabase
          .from('wechat_articles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('account_id', account.id)

        await supabase
          .from('wechat_accounts')
          .update({
            article_count: count ?? 0,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', account.id)
          .eq('user_id', user.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Account ${account.account_name}: ${msg}`)
      }
    }

    // Update sync history
    if (historyId) {
      await supabase
        .from('wechat_sync_history')
        .update({
          status: errors.length > 0 && totalFetched === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'success',
          articles_fetched: totalFetched,
          articles_new: totalNew,
          error_message: errors.length > 0 ? errors.join('; ') : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', historyId)
    }

    return NextResponse.json({
      success: true,
      articles_fetched: totalFetched,
      articles_new: totalNew,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
