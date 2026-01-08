-- Fix RLS policy for daily_finance table
-- Issue: Deleting a finance agent fails because:
-- 1. No DELETE policy exists on daily_finance
-- 2. The trigger that updates daily_finance runs without proper permissions during cascade

-- ============================================
-- ADD MISSING DELETE POLICY (idempotent)
-- ============================================
DROP POLICY IF EXISTS "Users can delete their own daily finance" ON daily_finance;
CREATE POLICY "Users can delete their own daily finance"
  ON daily_finance FOR DELETE
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- ============================================
-- UPDATE TRIGGER FUNCTION WITH SECURITY DEFINER
-- ============================================
-- The trigger needs SECURITY DEFINER to bypass RLS when cascade deletes happen
-- This allows it to update/insert summary rows even during agent deletion

CREATE OR REPLACE FUNCTION update_daily_finance_summary()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if agent no longer exists (being deleted via cascade)
  IF TG_OP = 'DELETE' THEN
    -- For deletes, check if agent still exists
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = OLD.agent_id) THEN
      RETURN OLD;
    END IF;
  ELSIF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- For inserts/updates, check if agent exists
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id) THEN
      RETURN NEW;
    END IF;
  END IF;

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
