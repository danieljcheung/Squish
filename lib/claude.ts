import { Agent, AgentMemory, Message } from '@/types';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';
const API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: { type: string; text: string }[];
  stop_reason: string;
}

// System prompt templates for different agent types
const SYSTEM_PROMPTS = {
  fitness: `You are {{name}}, a friendly AI fitness coach in the Squish app. You appear as an adorable anime-style slime character wearing a headband.

## Your Personality
{{style_description}}

## User Profile
- Goal: {{goal}}
- Target: {{target}}
- Current workout frequency: {{frequency}}
- Preferred location: {{location}}
- Dietary restrictions: {{diet}}

## Your Capabilities
- Create personalized workout plans
- Provide exercise form guidance
- Offer nutrition advice (respecting dietary restrictions)
- Track progress and celebrate wins
- Send motivational check-ins
- Answer fitness-related questions

## Memories
These are things you've learned about this user:
{{memories}}

## Guidelines
1. Keep responses concise and encouraging (2-3 sentences typically)
2. Use occasional emojis to stay friendly and approachable 💪
3. Reference the user's specific goals and preferences
4. If you learn something important about the user, include it at the end of your response in this format: [MEMORY: key=value]
5. Never give medical advice - recommend consulting professionals for health concerns
6. Be supportive but honest - gently correct misconceptions about fitness
7. Celebrate small wins and progress!

Remember: You're a supportive coach, not a drill sergeant (unless they asked for tough love!). Make fitness feel achievable and fun.`,

  budget: `You are {{name}}, a friendly AI budget coach in the Squish app. You appear as an adorable anime-style slime character.

## Your Personality
You're encouraging and non-judgmental about money matters. You help users understand their finances without making them feel bad about past decisions.

## Your Capabilities
- Help track expenses and income
- Create budget plans
- Offer saving strategies
- Explain financial concepts simply
- Celebrate financial wins

## Memories
{{memories}}

## Guidelines
1. Keep responses concise and helpful
2. Use emojis sparingly to stay friendly 💰
3. Never judge spending habits
4. If you learn something important, include: [MEMORY: key=value]
5. Don't give investment advice - recommend financial advisors for complex matters`,

  study: `You are {{name}}, a friendly AI study partner in the Squish app. You appear as an adorable anime-style slime character.

## Your Personality
You're patient, encouraging, and great at breaking down complex topics into understandable pieces.

## Your Capabilities
- Explain concepts in simple terms
- Create study schedules
- Quiz users on material
- Offer memorization techniques
- Provide encouragement during tough study sessions

## Memories
{{memories}}

## Guidelines
1. Keep explanations clear and concise
2. Use examples and analogies
3. Encourage questions - no question is too basic
4. If you learn something important, include: [MEMORY: key=value]
5. Celebrate learning progress! 📚`,
};

// Style descriptions based on coaching preference
const STYLE_DESCRIPTIONS = {
  tough_love: `You're a tough love coach - direct, no-nonsense, and push users to their limits. You don't accept excuses but you're never mean. You believe in your users and show it by holding them to high standards. "You've got this, now stop making excuses and get moving!"`,
  gentle: `You're a gentle, nurturing coach - patient, understanding, and always positive. You focus on progress over perfection and celebrate every small win. You understand that fitness journeys have ups and downs. "Every step forward counts, no matter how small. I'm proud of you!"`,
  balanced: `You're a balanced coach - supportive but honest. You celebrate wins while gently pushing for improvement. You adapt your approach based on what the user needs in the moment. "Great job today! Tomorrow let's push a little harder - I know you can do it!"`,
};

/**
 * Build the system prompt from agent persona and memories
 */
export function buildSystemPrompt(agent: Agent, memories: AgentMemory[]): string {
  const agentType = agent.type as keyof typeof SYSTEM_PROMPTS;
  let template = SYSTEM_PROMPTS[agentType] || SYSTEM_PROMPTS.fitness;

  const persona = agent.persona_json as Record<string, any>;

  // Replace template variables
  template = template.replace(/\{\{name\}\}/g, persona.name || agent.name);
  template = template.replace(/\{\{goal\}\}/g, persona.userGoal || 'General fitness');
  template = template.replace(/\{\{target\}\}/g, persona.userTarget || 'No specific target');
  template = template.replace(/\{\{frequency\}\}/g, persona.currentFrequency || 'Unknown');
  template = template.replace(/\{\{location\}\}/g, persona.preferredLocation || 'Flexible');
  template = template.replace(/\{\{diet\}\}/g, persona.dietaryRestrictions || 'None');

  // Add style description
  const style = persona.style as keyof typeof STYLE_DESCRIPTIONS || 'balanced';
  template = template.replace(
    /\{\{style_description\}\}/g,
    STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.balanced
  );

  // Add memories
  const memoryText = memories.length > 0
    ? memories.map(m => `- ${m.key}: ${m.value}`).join('\n')
    : '- No memories yet';
  template = template.replace(/\{\{memories\}\}/g, memoryText);

  return template;
}

/**
 * Convert app messages to Claude message format
 */
function formatMessagesForClaude(messages: Message[], limit = 20): ClaudeMessage[] {
  // Take the most recent messages
  const recentMessages = messages.slice(-limit);

  return recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Extract memory entries from Claude's response
 */
export function extractMemories(response: string): { key: string; value: string }[] {
  const pattern = /\[MEMORY:\s*(\w+)=([^\]]+)\]/g;
  const memories: { key: string; value: string }[] = [];

  let match;
  while ((match = pattern.exec(response)) !== null) {
    memories.push({ key: match[1], value: match[2].trim() });
  }

  return memories;
}

/**
 * Remove memory tags from response text for display
 */
export function cleanResponse(response: string): string {
  return response.replace(/\[MEMORY:\s*\w+=[^\]]+\]/g, '').trim();
}

/**
 * Send a message to Claude API and get a response
 */
export async function sendMessage(
  agent: Agent,
  messages: Message[],
  memories: AgentMemory[],
  userMessage: string
): Promise<{ response: string; newMemories: { key: string; value: string }[] }> {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not configured');
    return {
      response: "I'm having trouble connecting right now. Please try again later!",
      newMemories: [],
    };
  }

  try {
    // Build the system prompt
    const systemPrompt = buildSystemPrompt(agent, memories);

    // Format previous messages for context
    const conversationHistory = formatMessagesForClaude(messages);

    // Add the new user message
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Make the API call
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Using Haiku for fast, affordable responses
        max_tokens: 500,
        system: systemPrompt,
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data: ClaudeResponse = await response.json();

    // Extract the text response
    const textContent = data.content.find(c => c.type === 'text');
    const rawResponse = textContent?.text || "I'm not sure how to respond to that.";

    // Extract any memories from the response
    const newMemories = extractMemories(rawResponse);

    // Clean the response for display
    const cleanedResponse = cleanResponse(rawResponse);

    return {
      response: cleanedResponse,
      newMemories,
    };
  } catch (error) {
    console.error('Failed to send message to Claude:', error);
    return {
      response: "Oops! I'm having a moment. Let's try that again! 💪",
      newMemories: [],
    };
  }
}

/**
 * Generate a greeting message for a new conversation
 */
export function generateGreeting(agent: Agent): string {
  const persona = agent.persona_json as Record<string, any>;
  const name = persona.name || agent.name;
  const goal = persona.userGoal || '';

  switch (agent.type) {
    case 'fitness':
      if (goal.toLowerCase().includes('lose weight')) {
        return `Hey there! I'm ${name}, your fitness coach! 💪 Ready to work towards your weight loss goals? Let's crush it together!`;
      } else if (goal.toLowerCase().includes('build muscle')) {
        return `What's up! I'm ${name}, your fitness coach! 💪 Let's build some muscle together. What's on the agenda today?`;
      }
      return `Hey! I'm ${name}, your fitness coach! 💪 Ready to crush some goals today? Tell me what's on your mind!`;

    case 'budget':
      return `Hi there! I'm ${name}, your budget buddy! 💰 Let's make your money work smarter. What would you like to work on?`;

    case 'study':
      return `Hello! I'm ${name}, your study partner! 📚 Ready to learn something new? What are you working on today?`;

    default:
      return `Hi! I'm ${name}. How can I help you today?`;
  }
}
