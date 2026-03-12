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
