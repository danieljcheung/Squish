# Morning Check-in Edge Function

Sends morning motivation push notifications to users with fitness coaches.

## How it works

1. Runs on a cron schedule (every 15 minutes)
2. Queries all fitness agents with `notifications_enabled` and `morning_checkin.enabled`
3. Checks if current time matches user's configured check-in time (in their timezone)
4. Sends personalized push notification via Expo Push API
5. Message varies based on coaching style (tough_love, gentle, balanced)

## Deployment

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Project linked: `supabase link --project-ref your-project-ref`

### Deploy the function

```bash
cd squish
supabase functions deploy morning-checkin
```

### Set up the cron schedule

In your Supabase dashboard:

1. Go to Database → Extensions → Enable `pg_cron` if not enabled
2. Go to SQL Editor and run:

```sql
SELECT cron.schedule(
  'morning-checkin-job',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/morning-checkin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Or use the Supabase Dashboard cron scheduler UI.

### Environment variables

The function uses these automatically available env vars:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Testing locally

```bash
supabase functions serve morning-checkin --env-file .env.local
```

Then call:
```bash
curl -X POST http://localhost:54321/functions/v1/morning-checkin
```

## Notification content

Messages are randomized based on coaching style:

**Tough Love:**
- "Rise and shine! No excuses today. Let's get moving! 💪"
- "Your goals won't achieve themselves. Time to work!"

**Gentle:**
- "Good morning! Remember, every small step counts. 🌟"
- "Rise and shine, friend! What's one healthy thing you can do?"

**Balanced:**
- "Good morning! Ready to tackle the day? Let's check in! 💪"
- "Morning! Hope you're feeling energized. What's the plan?"
