// Agent Lounge Conversation Generation
// Generates fun conversations between two AI agents about their shared user

import { Agent, SharedInsight } from '@/types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';

export interface LoungeMessage {
  speaker: 'fitness' | 'finance';
  message: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
}

// Style descriptions for personality injection
const STYLE_DESCRIPTIONS: Record<string, string> = {
  tough_love: 'direct, no-nonsense, pushes hard but cares deeply',
  gentle: 'warm, encouraging, celebrates small wins',
  balanced: 'mix of encouragement and accountability',
};

/**
 * Format recent insights into readable context for the prompt
 */
function formatInsightsForPrompt(insights: SharedInsight[]): string {
  if (!insights || insights.length === 0) {
    return 'No recent activity tracked yet.';
  }

  const formatted = insights.slice(0, 10).map((insight) => {
    const timeAgo = getTimeAgo(new Date(insight.created_at));
    const data = insight.insight_data as Record<string, unknown>;

    switch (insight.insight_type) {
      case 'workout_logged':
        return `- Did a ${data.duration || '?'} min ${data.type || 'workout'} (${timeAgo})`;
      case 'streak_achieved':
        return `- Hit a ${data.count} day ${data.activity} streak! (${timeAgo})`;
      case 'meal_logged':
        return `- Logged a meal${data.high_protein ? ' (high protein!)' : ''} (${timeAgo})`;
      case 'goal_hit':
        return `- Hit their ${data.type} goal ${data.days_in_row} days in a row (${timeAgo})`;
      case 'expense_logged':
        return `- Spent $${data.amount} on ${data.category}${data.is_high ? ' (big purchase)' : ''} (${timeAgo})`;
      case 'savings_progress':
        return `- ${data.percentage}% progress on "${data.goal_name}" savings goal (${timeAgo})`;
      case 'goal_completed':
        return `- Completed their "${data.goal_name}" savings goal! (${timeAgo})`;
      case 'budget_warning':
        return `- Went over budget on ${data.category} (${timeAgo})`;
      case 'budget_streak':
        return `- ${data.days} days under budget! (${timeAgo})`;
      default:
        return `- Some activity (${timeAgo})`;
    }
  });

  return formatted.join('\n');
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

/**
 * Build the prompt for generating agent-to-agent conversation
 */
function buildLoungePrompt(
  fitnessAgent: Agent,
  financeAgent: Agent,
  fitnessInsights: string,
  financeInsights: string,
  edgeCaseInstruction: string
): string {
  const fitnessName = fitnessAgent.persona_json?.name || fitnessAgent.name;
  const financeName = financeAgent.persona_json?.name || financeAgent.name;
  const fitnessStyle = STYLE_DESCRIPTIONS[fitnessAgent.persona_json?.style || 'balanced'];
  const financeStyle = STYLE_DESCRIPTIONS[financeAgent.persona_json?.style || 'balanced'];

  return `You are generating a short, fun conversation between two AI assistant slime characters who help the same user.

Character 1: ${fitnessName} (Fitness Coach slime)
- Personality: ${fitnessStyle}
- Uses fitness metaphors, energetic, loves celebrating workouts
- Recent user activity they know about:
${fitnessInsights}

Character 2: ${financeName} (Budget Helper slime)
- Personality: ${financeStyle}
- Uses money metaphors, practical, celebrates savings
- Recent user activity they know about:
${financeInsights}

Generate a short, playful conversation (4-6 exchanges total) where they:
1. Chat casually about the user's recent progress
2. Playfully support or tease each other's domains
3. Show they're a team helping the same person
4. Use their distinct personalities

${edgeCaseInstruction}

RULES:
- Keep each message SHORT (1-2 sentences max)
- Be playful and encouraging, never negative about the user
- Use emojis sparingly (0-1 per message)
- Reference actual user data when available
- Feel like friends chatting, not robots reporting
- Address each other by name (${fitnessName} and ${financeName}) occasionally to feel personal

Return ONLY a valid JSON array, no other text:
[
  {"speaker": "fitness", "message": "..."},
  {"speaker": "finance", "message": "..."}
]`;
}

/**
 * Determine edge case instruction based on available data
 */
function getEdgeCaseInstruction(
  fitnessInsights: SharedInsight[],
  financeInsights: SharedInsight[]
): string {
  const hasFitnessActivity = fitnessInsights.length > 0;
  const hasFinanceActivity = financeInsights.length > 0;

  if (!hasFitnessActivity && !hasFinanceActivity) {
    return `SPECIAL CASE: The user is new and hasn't tracked anything yet. Have a friendly introductory conversation where you both:
- Introduce what each of you does
- Express excitement to help them
- Maybe playfully argue about whose domain is more important (keep it friendly!)`;
  }

  if (hasFitnessActivity && !hasFinanceActivity) {
    return `SPECIAL CASE: Only fitness activity so far. ${fitnessInsights[0]?.source_agent_name || 'Fitness coach'} should share their excitement about the user's progress, while the finance buddy responds supportively and mentions they're ready to help when needed.`;
  }

  if (!hasFitnessActivity && hasFinanceActivity) {
    return `SPECIAL CASE: Only finance activity so far. ${financeInsights[0]?.source_agent_name || 'Finance buddy'} should share updates on the user's financial progress, while the fitness coach responds supportively and encourages balance.`;
  }

  return ''; // Normal case - both have activity
}

/**
 * Generate a conversation between two agents
 */
export async function generateLoungeConversation(
  fitnessAgent: Agent,
  financeAgent: Agent,
  allInsights: SharedInsight[]
): Promise<LoungeMessage[]> {
  try {
    // Split insights by source agent type
    const fitnessInsights = allInsights.filter(
      (i) => i.source_agent_type === 'fitness_coach' || i.source_agent_type === 'fitness'
    );
    const financeInsights = allInsights.filter(
      (i) => i.source_agent_type === 'finance' || i.source_agent_type === 'budget_helper'
    );

    const fitnessInsightsText = formatInsightsForPrompt(fitnessInsights);
    const financeInsightsText = formatInsightsForPrompt(financeInsights);
    const edgeCaseInstruction = getEdgeCaseInstruction(fitnessInsights, financeInsights);

    const prompt = buildLoungePrompt(
      fitnessAgent,
      financeAgent,
      fitnessInsightsText,
      financeInsightsText,
      edgeCaseInstruction
    );

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LoungeConversation] API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data: ClaudeResponse = await response.json();
    const textContent = data.content.find((c) => c.type === 'text');
    const rawResponse = textContent?.text || '[]';

    // Parse JSON response
    try {
      // Extract JSON array from response (in case there's extra text)
      const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('[LoungeConversation] No JSON array found in response');
        return getDefaultConversation(fitnessAgent, financeAgent);
      }

      const messages: LoungeMessage[] = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(messages) || messages.length === 0) {
        return getDefaultConversation(fitnessAgent, financeAgent);
      }

      // Validate each message
      const validMessages = messages.filter(
        (m) =>
          m &&
          typeof m.speaker === 'string' &&
          (m.speaker === 'fitness' || m.speaker === 'finance') &&
          typeof m.message === 'string' &&
          m.message.length > 0
      );

      if (validMessages.length < 2) {
        return getDefaultConversation(fitnessAgent, financeAgent);
      }

      return validMessages;
    } catch (parseError) {
      console.error('[LoungeConversation] JSON parse error:', parseError);
      return getDefaultConversation(fitnessAgent, financeAgent);
    }
  } catch (error) {
    console.error('[LoungeConversation] Failed to generate:', error);
    return getDefaultConversation(fitnessAgent, financeAgent);
  }
}

/**
 * Fallback conversation if generation fails
 */
function getDefaultConversation(fitnessAgent: Agent, financeAgent: Agent): LoungeMessage[] {
  const fitnessName = fitnessAgent.persona_json?.name || 'Coach';
  const financeName = financeAgent.persona_json?.name || 'Buddy';

  return [
    { speaker: 'fitness', message: `Hey ${financeName}! How's our friend doing on your end?` },
    { speaker: 'finance', message: `Pretty good! Keeping an eye on things. You?` },
    { speaker: 'fitness', message: `Same here! Ready to help whenever they need us 💪` },
    { speaker: 'finance', message: `That's what we're here for. Team effort!` },
  ];
}
