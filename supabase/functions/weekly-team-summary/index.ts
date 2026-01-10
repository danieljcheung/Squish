// Supabase Edge Function: Weekly Team Summary
// Runs Sunday 7pm to generate combined summaries for users with 2+ agents
// Deploy with: supabase functions deploy weekly-team-summary
// Schedule with: supabase functions deploy weekly-team-summary --schedule "0 * * * 0"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  settings_json: {
    notifications_enabled: boolean;
    timezone: string;
  };
  persona_json: {
    name: string;
    monthly_income?: number;
    budget_split?: { needs: number; wants: number; savings: number };
  };
}

interface WeeklySummary {
  id: string;
  agent_id: string;
  week_start: string;
  week_end: string;
  total_workouts: number;
  total_workout_mins: number;
  days_at_calorie_goal: number;
  days_at_water_goal: number;
  avg_daily_calories: number;
  longest_logging_streak: number;
  highlights_json: string[];
  is_complete: boolean;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  expense_date: string;
}

interface SavingsGoal {
  id: string;
  target_amount: number;
  current_amount: number;
}

interface FitnessSummaryData {
  totalWorkouts: number;
  workoutMins: number;
  streak: number;
  calorieGoalDays: number;
  waterGoalDays: number;
  avgCalories: number;
  highlights: string[];
  hasActivity: boolean;
}

interface FinanceSummaryData {
  totalSpent: number;
  budgetStatus: 'under' | 'over' | 'at';
  budgetDifference: number;
  savingsProgress: number;
  topCategory: { name: string; icon: string; amount: number } | null;
  daysUnderBudget: number;
  hasActivity: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍽️',
  groceries: '🛒',
  transport: '🚗',
  entertainment: '🎬',
  shopping: '🛍️',
  health: '💊',
  bills: '📄',
  rent: '🏠',
  subscriptions: '📱',
  travel: '✈️',
  other: '📦',
};

function getWeekDates(): { weekStart: string; weekEnd: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Calculate Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  // Sunday is end of week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}

function isSunday7pm(timezone: string, currentTime: Date): boolean {
  try {
    const userTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
    const dayOfWeek = userTime.getDay();
    const hour = userTime.getHours();

    // Sunday = 0, and we want 7pm (19:00) within a 1-hour window (cron runs hourly)
    return dayOfWeek === 0 && hour >= 19 && hour < 20;
  } catch {
    return false;
  }
}

function evaluateTeamWins(
  fitness: FitnessSummaryData | null,
  finance: FinanceSummaryData | null
): string[] {
  const wins: string[] = [];

  // 3+ workouts AND under budget
  if ((fitness?.totalWorkouts ?? 0) >= 3 && finance?.budgetStatus === 'under') {
    wins.push('Stayed active AND under budget this week!');
  }

  // Good calorie tracking + food not top category
  if (
    (fitness?.calorieGoalDays ?? 0) >= 5 &&
    finance?.hasActivity &&
    finance?.topCategory?.name?.toLowerCase() !== 'food'
  ) {
    wins.push('Great meal tracking and smart spending!');
  }

  // Strong fitness week
  if ((fitness?.totalWorkouts ?? 0) >= 5 || ((fitness?.streak ?? 0) >= 5 && (fitness?.totalWorkouts ?? 0) >= 3)) {
    wins.push('Crushed your fitness goals!');
  }

  // Great budget management
  if ((finance?.daysUnderBudget ?? 0) >= 6 && finance?.budgetStatus === 'under') {
    wins.push('Budget master - under budget almost every day!');
  }

  // Savings progress
  if ((finance?.savingsProgress ?? 0) >= 50) {
    wins.push(`${finance?.savingsProgress}% progress on savings goals!`);
  }

  // Double achievement
  if ((fitness?.waterGoalDays ?? 0) >= 5 && (fitness?.calorieGoalDays ?? 0) >= 5) {
    wins.push('Nutrition and hydration on point!');
  }

  return wins.slice(0, 3); // Max 3 wins
}

function generateInsight(
  fitness: FitnessSummaryData | null,
  finance: FinanceSummaryData | null,
  teamWins: string[]
): string | null {
  if (teamWins.length >= 2) {
    return 'Your agents worked great together this week. Keep up the momentum!';
  }

  if (fitness?.hasActivity && finance?.hasActivity) {
    if (fitness.totalWorkouts >= 3 && finance.budgetStatus !== 'over') {
      return 'Solid week balancing health and finances!';
    }
    return 'Both agents active this week. Small wins add up!';
  }

  if (fitness?.hasActivity && !finance?.hasActivity) {
    return 'Great fitness progress! Your finance buddy is ready when you are.';
  }

  if (!fitness?.hasActivity && finance?.hasActivity) {
    return 'Nice job tracking finances! Your fitness coach is ready to help.';
  }

  return null;
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
    channelId: 'weekly-summary',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentTime = new Date();
    console.log(`Running weekly team summary at ${currentTime.toISOString()}`);

    const { weekStart, weekEnd } = getWeekDates();
    console.log(`Week: ${weekStart} to ${weekEnd}`);

    // Get all agents grouped by user
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, user_id, name, type, settings_json, persona_json')
      .in('type', ['fitness_coach', 'finance']);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(JSON.stringify({ error: agentsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!agents || agents.length === 0) {
      return new Response(JSON.stringify({ message: 'No agents found' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Group agents by user
    const userAgents: Map<string, Agent[]> = new Map();
    for (const agent of agents as Agent[]) {
      const existing = userAgents.get(agent.user_id) || [];
      existing.push(agent);
      userAgents.set(agent.user_id, existing);
    }

    let summariesCreated = 0;
    let notificationsSent = 0;

    // Process each user with 2+ agents
    for (const [userId, agentList] of userAgents) {
      // Need at least 2 agents (ideally one fitness and one finance)
      if (agentList.length < 2) continue;

      const fitnessAgent = agentList.find((a) => a.type === 'fitness_coach');
      const financeAgent = agentList.find((a) => a.type === 'finance');

      // Skip if user doesn't have both agent types
      if (!fitnessAgent || !financeAgent) continue;

      // Check timezone - use fitness agent's timezone as primary
      const timezone = fitnessAgent.settings_json?.timezone || 'UTC';
      if (!isSunday7pm(timezone, currentTime)) {
        continue;
      }

      console.log(`Processing user ${userId} (timezone: ${timezone})`);

      // Fetch fitness weekly summary
      let fitnessSummary: FitnessSummaryData | null = null;
      const { data: weeklySummary } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('agent_id', fitnessAgent.id)
        .eq('week_start', weekStart)
        .single();

      if (weeklySummary) {
        const ws = weeklySummary as WeeklySummary;
        fitnessSummary = {
          totalWorkouts: ws.total_workouts || 0,
          workoutMins: ws.total_workout_mins || 0,
          streak: ws.longest_logging_streak || 0,
          calorieGoalDays: ws.days_at_calorie_goal || 0,
          waterGoalDays: ws.days_at_water_goal || 0,
          avgCalories: ws.avg_daily_calories || 0,
          highlights: ws.highlights_json || [],
          hasActivity: (ws.total_workouts || 0) > 0 || (ws.days_at_calorie_goal || 0) > 0,
        };
      }

      // Fetch finance data for the week
      let financeSummary: FinanceSummaryData | null = null;
      const { data: weekExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('agent_id', financeAgent.id)
        .gte('expense_date', weekStart)
        .lte('expense_date', weekEnd);

      if (weekExpenses && weekExpenses.length > 0) {
        const expenses = weekExpenses as Expense[];
        const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);

        // Calculate by category
        const byCategory: Record<string, number> = {};
        for (const expense of expenses) {
          const cat = expense.category || 'other';
          byCategory[cat] = (byCategory[cat] || 0) + parseFloat(String(expense.amount));
        }

        // Find top category
        let topCategory: FinanceSummaryData['topCategory'] = null;
        let maxAmount = 0;
        for (const [name, amount] of Object.entries(byCategory)) {
          if (amount > maxAmount) {
            maxAmount = amount;
            topCategory = {
              name: name.charAt(0).toUpperCase() + name.slice(1),
              icon: CATEGORY_ICONS[name.toLowerCase()] || '📦',
              amount,
            };
          }
        }

        // Calculate weekly budget from persona
        const monthlyIncome = financeAgent.persona_json?.monthly_income || 0;
        const weeklyBudget = monthlyIncome / 4;
        const budgetDifference = weeklyBudget - totalSpent;

        // Count unique days with expenses
        const expenseDays = new Set(expenses.map((e) => e.expense_date));
        const daysUnderBudget = Math.max(0, 7 - expenseDays.size); // Simplified

        // Get savings progress
        const { data: savingsGoals } = await supabase
          .from('savings_goals')
          .select('target_amount, current_amount')
          .eq('agent_id', financeAgent.id)
          .is('completed_at', null);

        let savingsProgress = 0;
        if (savingsGoals && savingsGoals.length > 0) {
          const goals = savingsGoals as SavingsGoal[];
          const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
          const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
          savingsProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
        }

        financeSummary = {
          totalSpent,
          budgetStatus: budgetDifference > 0 ? 'under' : budgetDifference < 0 ? 'over' : 'at',
          budgetDifference,
          savingsProgress,
          topCategory,
          daysUnderBudget,
          hasActivity: true,
        };
      }

      // Evaluate team wins and generate insight
      const teamWins = evaluateTeamWins(fitnessSummary, financeSummary);
      const insight = generateInsight(fitnessSummary, financeSummary, teamWins);

      // Upsert combined summary
      const { error: upsertError } = await supabase
        .from('combined_weekly_summaries')
        .upsert(
          {
            user_id: userId,
            week_start: weekStart,
            week_end: weekEnd,
            fitness_summary: fitnessSummary,
            finance_summary: financeSummary,
            team_wins: teamWins,
            insight,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,week_start' }
        );

      if (upsertError) {
        console.error(`Error upserting summary for user ${userId}:`, upsertError);
        continue;
      }

      summariesCreated++;
      console.log(`Created summary for user ${userId}`);

      // Send push notification if user has tokens
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId);

      if (tokens && tokens.length > 0) {
        const tokenStrings = tokens.map((t: { token: string }) => t.token);
        const notificationBody =
          teamWins.length > 0
            ? `${teamWins.length} team win${teamWins.length > 1 ? 's' : ''} this week! 🎉`
            : 'Your weekly summary is ready!';

        await sendExpoPushNotification(
          tokenStrings,
          '📊 Week in Review',
          notificationBody,
          { type: 'combined_weekly_summary' }
        );

        notificationsSent++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summariesCreated,
        notificationsSent,
        weekStart,
        weekEnd,
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
