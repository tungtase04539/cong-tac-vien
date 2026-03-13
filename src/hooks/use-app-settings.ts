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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, appName])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, appName])

  return { settings, loading, saving, saveSettings, reload: loadSettings }
}
