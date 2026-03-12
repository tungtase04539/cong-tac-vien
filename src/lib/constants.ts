import type { TaskDifficulty, QAScore, UserLevel } from '@/types'

// Points awarded to Localizer by task difficulty
export const LOCALIZER_POINTS: Record<TaskDifficulty, number> = {
  short: 4,
  medium: 8,
  long: 12,
  complex: 15,
}

// Points awarded to QA reviewer by task difficulty
export const QA_POINTS: Record<TaskDifficulty, number> = {
  short: 2,
  medium: 3,
  long: 4,
  complex: 4,
}

// Scout points
export const SCOUT_POINTS = {
  source_found: 1,
  source_selected: 3,
} as const

// Publish points
export const PUBLISH_POINTS = 1

// Quality multiplier based on QA score
export const QUALITY_MULTIPLIER: Record<QAScore, number> = {
  excellent: 1.1,
  good: 1.0,
  average: 0.9,
  poor: 0.7,
  reject: 0,
}

// Base price per point (VND)
export const PRICE_PER_POINT = 10000

// Level labels
export const LEVEL_LABELS: Record<UserLevel, string> = {
  L1: 'Newbie',
  L2: 'Contributor',
  L3: 'Senior',
  L4: 'Expert',
}

// Level price multiplier
export const LEVEL_MULTIPLIER: Record<UserLevel, number> = {
  L1: 1.0,
  L2: 1.1,
  L3: 1.2,
  L4: 1.3,
}

// Anti-cheat limits
export const MAX_CLAIMS = 5
export const CLAIM_TIMEOUT_HOURS = 48
export const MIN_QA_SCORE = 60

// Task status display
export const STATUS_LABELS: Record<string, string> = {
  new: 'Mới',
  claimed: 'Đã nhận',
  in_progress: 'Đang xử lý',
  submitted: 'Đã nộp',
  qa_review: 'QA đang kiểm',
  revision_required: 'Cần sửa',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  rejected: 'Từ chối',
  paid: 'Đã thanh toán',
}

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  claimed: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  submitted: 'bg-purple-100 text-purple-800',
  qa_review: 'bg-indigo-100 text-indigo-800',
  revision_required: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-200 text-red-900',
  paid: 'bg-gray-100 text-gray-800',
}

export const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  short: 'Ngắn',
  medium: 'Trung bình',
  long: 'Dài',
  complex: 'Phức tạp',
}

export const DIFFICULTY_COLORS: Record<TaskDifficulty, string> = {
  short: 'bg-green-100 text-green-800',
  medium: 'bg-blue-100 text-blue-800',
  long: 'bg-orange-100 text-orange-800',
  complex: 'bg-red-100 text-red-800',
}

export const QA_SCORE_LABELS: Record<QAScore, string> = {
  excellent: 'Xuất sắc',
  good: 'Tốt',
  average: 'Trung bình',
  poor: 'Kém',
  reject: 'Từ chối',
}

export const ROLE_LABELS: Record<string, string> = {
  scout: 'Scout',
  localizer: 'Localizer',
  qa: 'QA',
  admin: 'Admin',
}
