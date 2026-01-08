-- Finance Buddy Tables Migration

-- ============================================
-- EXPENSE CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default expense categories
INSERT INTO expense_categories (name, icon, is_default) VALUES
  ('Food & Dining', '🍔', true),
  ('Transport', '🚗', true),
  ('Groceries', '🛒', true),
  ('Entertainment', '🎬', true),
  ('Shopping', '🛍️', true),
  ('Subscriptions', '📱', true),
  ('Rent & Housing', '🏠', true),
  ('Bills & Utilities', '💡', true),
  ('Health', '💊', true),
  ('Travel', '✈️', true),
  ('Other', '📦', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- INCOME CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default income categories
INSERT INTO income_categories (name, icon, is_default) VALUES
  ('Salary', '💼', true),
  ('Side Hustle', '💰', true),
  ('Freelance', '💻', true),
  ('Gift', '🎁', true),
  ('Refund', '💵', true),
  ('Investment', '📈', true),
  ('Other', '📦', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  category_id UUID REFERENCES expense_categories(id),
  description TEXT,
  receipt_url TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying expenses by agent and date
CREATE INDEX IF NOT EXISTS idx_expenses_agent_date ON expenses(agent_id, expense_date DESC);

-- ============================================
-- INCOME
-- ============================================
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  category_id UUID REFERENCES income_categories(id),
  description TEXT,
  income_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying income by agent and date
CREATE INDEX IF NOT EXISTS idx_income_agent_date ON income(agent_id, income_date DESC);

-- ============================================
-- BUDGETS
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL(10,2),
  percentage INTEGER,
  period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, category_id)
);

-- Index for querying budgets by agent
CREATE INDEX IF NOT EXISTS idx_budgets_agent ON budgets(agent_id);

-- ============================================
-- DAILY FINANCE SUMMARY
-- ============================================
CREATE TABLE IF NOT EXISTS daily_finance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_income DECIMAL(10,2) DEFAULT 0,
  expense_count INTEGER DEFAULT 0,
  income_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, date)
);

-- Index for querying daily finance by agent and date
CREATE INDEX IF NOT EXISTS idx_daily_finance_agent_date ON daily_finance(agent_id, date DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all finance tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_finance ENABLE ROW LEVEL SECURITY;

-- Expense categories policies (users can see defaults + their own)
CREATE POLICY "Users can view default expense categories"
  ON expense_categories FOR SELECT
  USING (is_default = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own expense categories"
  ON expense_categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own expense categories"
  ON expense_categories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own expense categories"
  ON expense_categories FOR DELETE
  USING (user_id = auth.uid());

-- Income categories policies (public read for defaults)
CREATE POLICY "Anyone can view default income categories"
  ON income_categories FOR SELECT
  USING (is_default = true);

-- Expenses policies
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create expenses for their agents"
  ON expenses FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Income policies
CREATE POLICY "Users can view their own income"
  ON income FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create income for their agents"
  ON income FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own income"
  ON income FOR UPDATE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own income"
  ON income FOR DELETE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
  ON budgets FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create budgets for their agents"
  ON budgets FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own budgets"
  ON budgets FOR UPDATE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own budgets"
  ON budgets FOR DELETE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Daily finance policies
CREATE POLICY "Users can view their own daily finance"
  ON daily_finance FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create daily finance for their agents"
  ON daily_finance FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own daily finance"
  ON daily_finance FOR UPDATE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- ============================================
-- HELPER FUNCTION: Update daily finance summary
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_finance_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- For expenses
  IF TG_TABLE_NAME = 'expenses' THEN
    INSERT INTO daily_finance (agent_id, date, total_spent, expense_count)
    VALUES (
      COALESCE(NEW.agent_id, OLD.agent_id),
      COALESCE(NEW.expense_date, OLD.expense_date),
      0,
      0
    )
    ON CONFLICT (agent_id, date) DO NOTHING;

    UPDATE daily_finance
    SET
      total_spent = (
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
        AND expense_date = COALESCE(NEW.expense_date, OLD.expense_date)
      ),
      expense_count = (
        SELECT COUNT(*)
        FROM expenses
        WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
        AND expense_date = COALESCE(NEW.expense_date, OLD.expense_date)
      ),
      updated_at = NOW()
    WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
    AND date = COALESCE(NEW.expense_date, OLD.expense_date);
  END IF;

  -- For income
  IF TG_TABLE_NAME = 'income' THEN
    INSERT INTO daily_finance (agent_id, date, total_income, income_count)
    VALUES (
      COALESCE(NEW.agent_id, OLD.agent_id),
      COALESCE(NEW.income_date, OLD.income_date),
      0,
      0
    )
    ON CONFLICT (agent_id, date) DO NOTHING;

    UPDATE daily_finance
    SET
      total_income = (
        SELECT COALESCE(SUM(amount), 0)
        FROM income
        WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
        AND income_date = COALESCE(NEW.income_date, OLD.income_date)
      ),
      income_count = (
        SELECT COUNT(*)
        FROM income
        WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
        AND income_date = COALESCE(NEW.income_date, OLD.income_date)
      ),
      updated_at = NOW()
    WHERE agent_id = COALESCE(NEW.agent_id, OLD.agent_id)
    AND date = COALESCE(NEW.income_date, OLD.income_date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update daily finance
DROP TRIGGER IF EXISTS update_daily_finance_on_expense ON expenses;
CREATE TRIGGER update_daily_finance_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_finance_summary();

DROP TRIGGER IF EXISTS update_daily_finance_on_income ON income;
CREATE TRIGGER update_daily_finance_on_income
  AFTER INSERT OR UPDATE OR DELETE ON income
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_finance_summary();
