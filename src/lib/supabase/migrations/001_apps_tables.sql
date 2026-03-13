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
