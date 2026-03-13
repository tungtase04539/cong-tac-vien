export type UserRole = 'scout' | 'localizer' | 'qa' | 'admin'
export type UserLevel = 'L1' | 'L2' | 'L3' | 'L4'
export type TaskDifficulty = 'short' | 'medium' | 'long' | 'complex'
export type TaskStatus =
  | 'new' | 'claimed' | 'in_progress' | 'submitted'
  | 'qa_review' | 'revision_required' | 'approved'
  | 'published' | 'rejected' | 'paid'
export type QAScore = 'excellent' | 'good' | 'average' | 'poor' | 'reject'
export type PaymentStatus = 'pending' | 'confirmed' | 'paid'

export interface Profile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: UserRole
  level: UserLevel
  qa_score: number
  total_points: number
  wallet_balance: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  source_url: string | null
  difficulty: TaskDifficulty
  points: number
  status: TaskStatus
  assignee_id: string | null
  created_by: string | null
  deadline: string | null
  claimed_at: string | null
  submitted_at: string | null
  published_at: string | null
  created_at: string
  // joined
  assignee?: Profile
}

export interface Submission {
  id: string
  task_id: string
  user_id: string
  content_link: string | null
  content_text: string | null
  notes: string | null
  revision_count: number
  qa_score: QAScore | null
  qa_notes: string | null
  reviewed_by: string | null
  created_at: string
  // joined
  task?: Task
  user?: Profile
}

export interface Payment {
  id: string
  user_id: string
  month: string
  points: number
  quality_multiplier: number
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  // joined
  user?: Profile
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

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
