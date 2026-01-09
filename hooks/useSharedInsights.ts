import { useCallback } from 'react';
import { Agent, SharedInsight, InsightType } from '@/types';
import {
  postSharedInsight,
  getInsightsForAgent,
  cleanupExpiredInsights,
} from '@/lib/supabase';

// Expiration durations
const STANDARD_EXPIRY_DAYS = 7;
const MILESTONE_EXPIRY_DAYS = 14;

// Milestone insight types that get longer expiration
const MILESTONE_INSIGHTS: InsightType[] = [
  'streak_achieved',
  'goal_completed',
  'goal_hit',
];

/**
 * Hook for cross-agent insight sharing
 * Allows agents to post insights about user activity that other agents can read
 */
export function useSharedInsights(agent: Agent | null) {
  /**
   * Post an insight from the current agent
   */
  const postInsight = useCallback(
    async (
      type: InsightType,
      data: Record<string, unknown>
    ): Promise<{ success: boolean; error?: string }> => {
      if (!agent) {
        return { success: false, error: 'No agent provided' };
      }

      // Calculate expiration based on insight type
      const expiryDays = MILESTONE_INSIGHTS.includes(type)
        ? MILESTONE_EXPIRY_DAYS
        : STANDARD_EXPIRY_DAYS;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { error } = await postSharedInsight({
        user_id: agent.user_id,
        source_agent_id: agent.id,
        source_agent_type: agent.type,
        source_agent_name: agent.name,
        insight_type: type,
        insight_data: data,
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.error('[useSharedInsights] Error posting insight:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    },
    [agent]
  );

  /**
   * Get insights from other agents (for injecting into prompts)
   */
  const getOtherAgentInsights = useCallback(async (): Promise<SharedInsight[]> => {
    if (!agent) {
      return [];
    }

    // Cleanup expired insights first (non-blocking)
    cleanupExpiredInsights(agent.user_id).catch(console.error);

    const { data, error } = await getInsightsForAgent(agent.user_id, agent.id);

    if (error) {
      console.error('[useSharedInsights] Error fetching insights:', error);
      return [];
    }

    return (data as SharedInsight[]) || [];
  }, [agent]);

  /**
   * Format insights for injection into Claude's system prompt
   */
  const formatInsightsForPrompt = useCallback((insights: SharedInsight[]): string => {
    if (!insights || insights.length === 0) {
      return '';
    }

    const formattedInsights = insights.map((insight) => {
      const agentLabel = `${insight.source_agent_name}`;
      const timeAgo = getTimeAgo(new Date(insight.created_at));

      // Format based on insight type
      switch (insight.insight_type) {
        // Fitness insights
        case 'workout_logged': {
          const { type, duration, streak_count } = insight.insight_data as {
            type?: string;
            duration?: number;
            streak_count?: number;
          };
          let msg = `User did a ${duration || '?'} min ${type || 'workout'}`;
          if (streak_count && streak_count > 1) {
            msg += ` (${streak_count} day streak!)`;
          }
          return `- [${agentLabel}] ${msg} (${timeAgo})`;
        }

        case 'streak_achieved': {
          const { activity, count } = insight.insight_data as {
            activity?: string;
            count?: number;
          };
          return `- [${agentLabel}] User hit a ${count}-day ${activity || 'workout'} streak! (${timeAgo})`;
        }

        case 'meal_logged': {
          const { high_protein, calories } = insight.insight_data as {
            high_protein?: boolean;
            calories?: number;
          };
          if (high_protein) {
            return `- [${agentLabel}] User logged a high-protein meal (${timeAgo})`;
          }
          return `- [${agentLabel}] User logged a meal with ${calories || '?'} calories (${timeAgo})`;
        }

        case 'goal_hit': {
          const { type: goalType, days_in_row } = insight.insight_data as {
            type?: string;
            days_in_row?: number;
          };
          return `- [${agentLabel}] User hit their ${goalType || 'daily'} goal${days_in_row ? ` (${days_in_row} days in a row!)` : ''} (${timeAgo})`;
        }

        case 'activity_drop': {
          const { days_since_workout } = insight.insight_data as {
            days_since_workout?: number;
          };
          return `- [${agentLabel}] User hasn't worked out in ${days_since_workout || '?'} days (${timeAgo})`;
        }

        // Finance insights
        case 'expense_logged': {
          const { category, amount, is_high } = insight.insight_data as {
            category?: string;
            amount?: number;
            is_high?: boolean;
          };
          if (is_high) {
            return `- [${agentLabel}] User made a large expense: $${amount} on ${category || 'something'} (${timeAgo})`;
          }
          return `- [${agentLabel}] User spent $${amount} on ${category || 'something'} (${timeAgo})`;
        }

        case 'savings_progress': {
          const { goal_name, percentage, amount_left } = insight.insight_data as {
            goal_name?: string;
            percentage?: number;
            amount_left?: number;
          };
          return `- [${agentLabel}] User is ${percentage}% towards their "${goal_name}" savings goal ($${amount_left} left) (${timeAgo})`;
        }

        case 'goal_completed': {
          const { goal_name, amount } = insight.insight_data as {
            goal_name?: string;
            amount?: number;
          };
          return `- [${agentLabel}] User completed their "${goal_name}" savings goal ($${amount})! (${timeAgo})`;
        }

        case 'budget_warning': {
          const { category, over_by } = insight.insight_data as {
            category?: string;
            over_by?: number;
          };
          return `- [${agentLabel}] User is over budget in ${category || 'a category'} by $${over_by} (${timeAgo})`;
        }

        case 'budget_streak': {
          const { days } = insight.insight_data as { days?: number };
          return `- [${agentLabel}] User has been under budget for ${days} days! (${timeAgo})`;
        }

        case 'subscription_detected': {
          const { name, amount } = insight.insight_data as {
            name?: string;
            amount?: number;
          };
          return `- [${agentLabel}] User has a ${name || 'subscription'} costing $${amount}/month (${timeAgo})`;
        }

        default:
          return `- [${agentLabel}] ${JSON.stringify(insight.insight_data)} (${timeAgo})`;
      }
    });

    const result = `
## Cross-Agent Insights
You are part of a team of agents helping this user. Here's what your teammate agents have shared:
${formattedInsights.join('\n')}

IMPORTANT: Acknowledge these insights when greeting or checking in with the user. For example, if the fitness agent logged a workout, say something like "I see you crushed a workout earlier - nice work staying active!" This makes the user feel like their agents are connected and aware of their progress across different areas of life.
`.trim();
    return result;
  }, []);

  return {
    postInsight,
    getOtherAgentInsights,
    formatInsightsForPrompt,
  };
}

/**
 * Helper to format time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return diffMins <= 1 ? 'just now' : `${diffMins} mins ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else {
    return `${diffDays} days ago`;
  }
}
