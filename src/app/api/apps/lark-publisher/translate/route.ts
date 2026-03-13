import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateContent } from '@/lib/apps/lark-publisher/ai-translate'
import type { LarkPublisherSettings } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, title } = (await req.json()) as { content?: string; title?: string }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Fetch user's app settings
    const { data: settingsRow } = await supabase
      .from('user_app_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('app_name', 'lark-publisher')
      .single()

    const settings = (settingsRow?.settings ?? {}) as LarkPublisherSettings

    const translated = await translateContent(content, title ?? '', settings)

    return NextResponse.json({ translated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
