-- Create push_tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can have the same token only once
  UNIQUE(user_id, token)
);

-- Index for quick lookups by user_id
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Index for quick lookups by token (for deletion)
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own push tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add settings_json column to agents if it doesn't exist
-- (It may already exist, so we use a DO block to check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'settings_json'
  ) THEN
    ALTER TABLE agents ADD COLUMN settings_json JSONB DEFAULT '{
      "notifications_enabled": true,
      "morning_checkin": {
        "enabled": true,
        "time": {"hour": 8, "minute": 0}
      },
      "meal_reminders": false,
      "workout_reminders": {
        "enabled": false,
        "days": [1, 3, 5],
        "time": {"hour": 18, "minute": 0}
      },
      "timezone": "UTC"
    }'::jsonb;
  END IF;
END $$;

-- Create index on settings_json for notification queries
CREATE INDEX IF NOT EXISTS idx_agents_settings_notifications
  ON agents USING GIN (settings_json);

-- Grant service role access to push_tokens for edge functions
GRANT SELECT ON push_tokens TO service_role;
GRANT SELECT ON agents TO service_role;
