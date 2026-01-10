-- Combined Weekly Summaries table
-- Stores cross-agent summaries for users with 2+ agents

CREATE TABLE combined_weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  fitness_summary JSONB,
  finance_summary JSONB,
  team_wins JSONB DEFAULT '[]'::jsonb,
  insight TEXT,
  viewed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Index for efficient queries by user and week
CREATE INDEX idx_combined_summaries_user_week ON combined_weekly_summaries(user_id, week_start DESC);

-- Index for finding non-dismissed summaries
CREATE INDEX idx_combined_summaries_user_dismissed ON combined_weekly_summaries(user_id, dismissed_at) WHERE dismissed_at IS NULL;

-- Enable Row Level Security
ALTER TABLE combined_weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Users can view their own summaries
CREATE POLICY "Users can view own combined summaries"
  ON combined_weekly_summaries
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own summaries (for marking viewed/dismissed)
CREATE POLICY "Users can update own combined summaries"
  ON combined_weekly_summaries
  FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can insert summaries (edge function uses service role)
CREATE POLICY "Service can insert combined summaries"
  ON combined_weekly_summaries
  FOR INSERT
  WITH CHECK (true);

-- Service role can update summaries (for upsert)
CREATE POLICY "Service can update combined summaries"
  ON combined_weekly_summaries
  FOR ALL
  USING (true)
  WITH CHECK (true);
