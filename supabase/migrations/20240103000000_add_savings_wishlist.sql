-- Savings Goals and Wishlist Migration

-- ============================================
-- SAVINGS GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  target_date DATE,
  auto_allocate_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for querying goals by agent
CREATE INDEX IF NOT EXISTS idx_savings_goals_agent ON savings_goals(agent_id);

-- ============================================
-- WISHLIST
-- ============================================
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying wishlist by agent
CREATE INDEX IF NOT EXISTS idx_wishlist_agent ON wishlist(agent_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Savings goals policies
CREATE POLICY "Users can view their own savings goals"
  ON savings_goals FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create savings goals for their agents"
  ON savings_goals FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own savings goals"
  ON savings_goals FOR UPDATE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own savings goals"
  ON savings_goals FOR DELETE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Wishlist policies
CREATE POLICY "Users can view their own wishlist"
  ON wishlist FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create wishlist items for their agents"
  ON wishlist FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own wishlist items"
  ON wishlist FOR UPDATE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own wishlist items"
  ON wishlist FOR DELETE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- ============================================
-- ADD category column to expenses if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'category'
  ) THEN
    ALTER TABLE expenses ADD COLUMN category TEXT;
  END IF;
END $$;

-- ============================================
-- ADD category column to income if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'category'
  ) THEN
    ALTER TABLE income ADD COLUMN category TEXT;
  END IF;
END $$;
