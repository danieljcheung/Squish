// Supabase Edge Function: Morning Check-in Notifications
// Runs on a cron schedule to send morning motivation to users
// Deploy with: supabase functions deploy morning-checkin
// Schedule with: supabase functions deploy morning-checkin --schedule "*/15 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  settings_json: {
    notifications_enabled: boolean;
    morning_checkin: {
      enabled: boolean;
      time: { hour: number; minute: number };
    };
    timezone: string;
  };
  persona_json: {
    name: string;
    style: string;
  };
}

interface PushToken {
  token: string;
  platform: string;
}

// Morning motivation messages by coaching style
const MORNING_MESSAGES = {
  tough_love: [
    "Rise and shine! No excuses today. Let's get moving! 💪",
    "Your goals won't achieve themselves. Time to work!",
    "Champions don't sleep in. What's your plan today?",
    "Another day, another chance to be better. Don't waste it!",
  ],
  gentle: [
    "Good morning! Remember, every small step counts. How are you feeling today? 🌟",
    "Rise and shine, friend! What's one healthy thing you can do for yourself today?",
    "Morning! I hope you slept well. Ready to have a great day?",
    "Hello! Remember to be kind to yourself today. What's on your mind?",
  ],
  balanced: [
    "Good morning! Ready to tackle the day? Let's check in! 💪",
    "Rise and shine! What's your fitness goal for today?",
    "Morning! Hope you're feeling energized. What's the plan?",
    "Hey there! New day, new opportunities. How can I help today?",
  ],
};

function getRandomMessage(style: string): string {
  const messages = MORNING_MESSAGES[style as keyof typeof MORNING_MESSAGES] || MORNING_MESSAGES.balanced;
  return messages[Math.floor(Math.random() * messages.length)];
}

function isTimeForNotification(
  settings: Agent['settings_json'],
  currentTime: Date
): boolean {
  if (!settings.notifications_enabled || !settings.morning_checkin?.enabled) {
    return false;
  }

  const { hour, minute } = settings.morning_checkin.time;
  const timezone = settings.timezone || 'UTC';

  // Get current time in user's timezone
  const userTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
  const userHour = userTime.getHours();
  const userMinute = userTime.getMinutes();

  // Check if we're within the 15-minute window (cron runs every 15 min)
  const targetMinutes = hour * 60 + minute;
  const currentMinutes = userHour * 60 + userMinute;

  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 15;
}

async function sendExpoPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    channelId: 'morning-checkin',
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push notification result:', JSON.stringify(result));
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentTime = new Date();
    console.log(`Running morning check-in at ${currentTime.toISOString()}`);

    // Get all fitness agents with notifications enabled
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, user_id, name, type, settings_json, persona_json')
      .eq('type', 'fitness')
      .not('settings_json', 'is', null);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(JSON.stringify({ error: agentsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!agents || agents.length === 0) {
      console.log('No agents found');
      return new Response(JSON.stringify({ message: 'No agents to notify' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let notificationsSent = 0;

    // Process each agent
    for (const agent of agents as Agent[]) {
      // Check if it's time for this user's notification
      if (!isTimeForNotification(agent.settings_json, currentTime)) {
        continue;
      }

      // Get push tokens for this user
      const { data: tokens, error: tokensError } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', agent.user_id);

      if (tokensError || !tokens || tokens.length === 0) {
        console.log(`No push tokens for user ${agent.user_id}`);
        continue;
      }

      // Get coaching style and generate message
      const style = agent.persona_json?.style || 'balanced';
      const coachName = agent.persona_json?.name || agent.name;
      const message = getRandomMessage(style);

      // Send notification
      const tokenStrings = (tokens as PushToken[]).map((t) => t.token);
      await sendExpoPushNotification(
        tokenStrings,
        `${coachName} says...`,
        message,
        { agentId: agent.id, type: 'morning_checkin' }
      );

      notificationsSent++;
      console.log(`Sent morning check-in to user ${agent.user_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent,
        timestamp: currentTime.toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
