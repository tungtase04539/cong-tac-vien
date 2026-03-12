-- ============================================
-- Wiki Contributor OS — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enums
CREATE TYPE user_role AS ENUM ('scout', 'localizer', 'qa', 'admin');
CREATE TYPE user_level AS ENUM ('L1', 'L2', 'L3', 'L4');
CREATE TYPE task_difficulty AS ENUM ('short', 'medium', 'long', 'complex');
CREATE TYPE task_status AS ENUM (
  'new', 'claimed', 'in_progress', 'submitted',
  'qa_review', 'revision_required', 'approved',
  'published', 'rejected', 'paid'
);
CREATE TYPE qa_score_enum AS ENUM ('excellent', 'good', 'average', 'poor', 'reject');
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'paid');

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'localizer',
  level user_level NOT NULL DEFAULT 'L1',
  qa_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  total_points INTEGER NOT NULL DEFAULT 0,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  difficulty task_difficulty NOT NULL DEFAULT 'medium',
  points INTEGER NOT NULL DEFAULT 8,
  status task_status NOT NULL DEFAULT 'new',
  assignee_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  deadline TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SUBMISSIONS
-- ============================================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content_link TEXT,
  content_text TEXT,
  notes TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  qa_score qa_score_enum,
  qa_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  month VARCHAR(7) NOT NULL, -- e.g. '2026-03'
  points INTEGER NOT NULL DEFAULT 0,
  quality_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_submissions_task ON submissions(task_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_payments_user_month ON payments(user_id, month);
CREATE INDEX idx_activity_user ON activity_log(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if current user is QA or admin
CREATE OR REPLACE FUNCTION is_qa_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('qa', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (is_admin());

-- TASKS policies
CREATE POLICY "Anyone can view tasks"
  ON tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update any task"
  ON tasks FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "Assignee can update own task"
  ON tasks FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid());

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE TO authenticated
  USING (is_admin());

-- SUBMISSIONS policies
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_qa_or_admin());

CREATE POLICY "Users can create submissions"
  ON submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "QA and admins can update submissions"
  ON submissions FOR UPDATE TO authenticated
  USING (is_qa_or_admin());

-- PAYMENTS policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE TO authenticated
  USING (is_admin());

-- ACTIVITY LOG policies
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System can insert activity"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
