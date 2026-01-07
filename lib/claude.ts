import { Agent, AgentMemory, Message, MealAnalysis } from '@/types';

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
  fitness: `You are {{name}}, a fitness coach slime in the Squish app.

Style: {{style_description}}

User: Goal={{goal}}, Target={{target}}, Frequency={{frequency}}, Location={{location}}, Diet={{diet}}

Memories: {{memories}}

CRITICAL RULES - FOLLOW EXACTLY:
- MAX 1-3 sentences. No exceptions.
- Use line breaks between thoughts. Never write paragraphs.
- 1-2 emojis max per message.
- Lists: 3 items max.
- NEVER repeat what user said.
- NEVER over-explain or add fluff.
- Be punchy and direct.

WORKOUT LOGGING (IMPORTANT - FOLLOW THIS EXACTLY):
When user mentions completing a workout, you MUST either log it or ask questions.

STEP 1: Check if you know BOTH type AND duration:
- Type keywords: run/jog/cycling/swim = cardio, weights/lifting/chest/back/legs/squat = strength, yoga/stretching/pilates = flexibility, hiit/circuit/intervals = hiit, walk/walking/hike = walk
- Duration: "30 mins" = 30, "an hour" = 60, "5k run" = 30, "10k" = 60

STEP 2A: If you know BOTH type and duration → LOG IT:
- Respond with celebration + [WORKOUT: type=TYPE, duration=MINS]
- Example: "Logged! 💪 45 min strength. Crushing it! [WORKOUT: type=strength, duration=45]"

STEP 2B: If type OR duration is MISSING → ASK:
- Missing type? Ask: "Nice work! 💪 What type of workout? (cardio, strength, flexibility, HIIT, or walk)"
- Missing duration? Ask: "How long was it roughly?"
- NEVER give generic acknowledgement. ALWAYS ask the missing info.

EXAMPLES:
User: "Did 45 mins of chest and back"
You: "Logged! 💪 45 min strength. Crushing it! [WORKOUT: type=strength, duration=45]"

User: "Went for a 5k run"
You: "Nice! 🏃 30 min cardio logged. [WORKOUT: type=cardio, duration=30]"

User: "Just finished a workout" or "Did my workout" or "I want to log a workout"
You: "Nice! 💪 What type of workout?"

User: "Strength" (after you asked type)
You: "How long was it roughly?"

User: "45 minutes" (after you asked duration)
You: "Logged! 💪 45 min strength workout! [WORKOUT: type=strength, duration=45]"

User: "Did some cardio"
You: "Nice! 🏃 How long?"

User: "Lifted weights for an hour"
You: "Beast mode! 💪 60 min strength logged. [WORKOUT: type=strength, duration=60]"

BAD (too long):
"That's great that you had a chicken salad! Chicken is an excellent source of lean protein which helps build muscle. I've logged this for you. You're making great progress! Keep it up! 💪🎉"

GOOD:
"Logged! 🥗

1,240 / 2,000 cal today. Solid protein 💪"

BAD:
"Good morning! I hope you're feeling energized and ready to take on the day! Remember, every workout counts and I believe in you!"

GOOD:
"Morning! 🌅

Ready to move today?"

If you learn something new about the user, add at the end: [MEMORY: key=value]`,

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
 * Extract workout data from Claude's response
 */
export function extractWorkout(response: string): { type: string; duration: number } | null {
  // Match pattern like [WORKOUT: type=strength, duration=45]
  const pattern = /\[WORKOUT:\s*type=(\w+),\s*duration=(\d+)\]/i;
  const match = response.match(pattern);

  if (match) {
    return {
      type: match[1].toLowerCase(),
      duration: parseInt(match[2], 10),
    };
  }

  return null;
}

/**
 * Remove memory and workout tags from response text for display
 */
export function cleanResponse(response: string): string {
  return response
    .replace(/\[MEMORY:\s*\w+=[^\]]+\]/g, '')
    .replace(/\[WORKOUT:\s*type=\w+,\s*duration=\d+\]/gi, '')
    .trim();
}

/**
 * Send a message to Claude API and get a response
 */
export async function sendMessage(
  agent: Agent,
  messages: Message[],
  memories: AgentMemory[],
  userMessage: string
): Promise<{
  response: string;
  newMemories: { key: string; value: string }[];
  workout: { type: string; duration: number } | null;
}> {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not configured');
    return {
      response: "I'm having trouble connecting right now. Please try again later!",
      newMemories: [],
      workout: null,
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
        max_tokens: 200, // Slightly increased for workout responses
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

    // Extract workout data if present
    const workout = extractWorkout(rawResponse);

    // Clean the response for display
    const cleanedResponse = cleanResponse(rawResponse);

    return {
      response: cleanedResponse,
      newMemories,
      workout,
    };
  } catch (error) {
    console.error('Failed to send message to Claude:', error);
    return {
      response: "Oops! I'm having a moment. Let's try that again! 💪",
      newMemories: [],
      workout: null,
    };
  }
}

/**
 * Generate a greeting message for a new conversation
 */
export function generateGreeting(agent: Agent): string {
  const persona = agent.persona_json as Record<string, any>;
  const name = persona.name || agent.name;

  switch (agent.type) {
    case 'fitness':
    case 'fitness_coach':
      return `Hey! I'm ${name} 💪\n\nWhat's on the agenda today?`;

    case 'budget':
    case 'budget_helper':
      return `Hey! I'm ${name} 💰\n\nWhat's on your mind?`;

    case 'study':
    case 'study_buddy':
      return `Hey! I'm ${name} 📚\n\nWhat are we working on?`;

    default:
      return `Hey! I'm ${name}.\n\nHow can I help?`;
  }
}

// ============================================
// MEAL ANALYSIS WITH VISION API
// ============================================

const MEAL_ANALYSIS_PROMPT = `You are a nutrition analysis assistant. Analyze the food in this image and estimate its nutritional content.

CRITICAL: READ USER NOTES FIRST
If the user provided notes, you MUST adjust your analysis accordingly:
- "I only ate half" or "ate half" → Calculate macros for HALF the visible portion
- "I ate X%" or "only had X%" → Calculate macros for that percentage
- "This is Xg of [food]" → Use that exact weight, don't guess
- "No dressing" / "didn't eat the bread" / "skipped the X" → EXCLUDE those items
- "Double portion" / "ate two servings" → MULTIPLY estimate by 2
- "Added X" / "with extra X" → INCLUDE that item even if not clearly visible
- Any specific weight/amount mentioned → Use that instead of estimating

Include a "noteAdjustment" field explaining how you adjusted for their notes.

Identify:
1. What foods you can see in the image
2. Estimated portion sizes (ADJUSTED for user notes)
3. Nutritional estimates (ADJUSTED for user notes)

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "description": "Brief description of the meal (e.g., 'Grilled chicken with rice and vegetables')",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "calories": 450,
  "proteinG": 35,
  "carbsG": 40,
  "fatG": 15,
  "confidence": "high" | "medium" | "low",
  "noteAdjustment": "Calculated for half portion as noted" | null,
  "breakdown": [
    {"item": "Grilled chicken breast", "calories": 200, "portion": "6 oz"},
    {"item": "Brown rice", "calories": 150, "portion": "1 cup"}
  ]
}

Be conservative with estimates. If the image is unclear or you can't identify foods, set confidence to "low".`;

/**
 * Analyze a meal photo using Claude Vision API
 */
export async function analyzeMealPhoto(
  photoUrl: string,
  agent: Agent,
  notes?: string
): Promise<{ analysis: MealAnalysis; message: string } | null> {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not configured');
    return null;
  }

  const persona = agent.persona_json as Record<string, any>;
  const dietaryRestrictions = persona.dietaryRestrictions || 'None specified';

  const systemPrompt = `${MEAL_ANALYSIS_PROMPT}

User's dietary restrictions: ${dietaryRestrictions}`;

  // Build user message with notes if provided
  let userText = 'Please analyze this meal and estimate its nutritional content.';
  if (notes && notes.trim()) {
    userText = `USER NOTES (READ FIRST AND ADJUST CALCULATIONS): "${notes.trim()}"

Please analyze this meal and estimate its nutritional content, adjusting for my notes above.`;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: photoUrl,
                },
              },
              {
                type: 'text',
                text: userText,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude Vision API error:', response.status, errorText);
      return null;
    }

    const data: ClaudeResponse = await response.json();
    const textContent = data.content.find((c) => c.type === 'text');

    if (!textContent?.text) {
      console.error('No text content in Claude response');
      return null;
    }

    // Parse the JSON response
    let analysis: MealAnalysis;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse meal analysis:', parseError);
      return null;
    }

    // Generate a friendly message
    const message = generateMealAnalysisMessage(analysis, agent);

    return { analysis, message };
  } catch (error) {
    console.error('Failed to analyze meal photo:', error);
    return null;
  }
}

/**
 * Generate a friendly chat message from meal analysis
 */
function generateMealAnalysisMessage(analysis: MealAnalysis, agent: Agent): string {
  const persona = agent.persona_json as Record<string, any>;
  const style = persona.style || 'balanced';
  const confidence = analysis.confidence;
  const noteAdjustment = (analysis as any).noteAdjustment;

  let message = `I see **${analysis.description}**!`;

  // Mention note adjustment if present
  if (noteAdjustment) {
    message += ` ${noteAdjustment}`;
  } else if (confidence === 'low') {
    message += ' (I had some trouble seeing clearly, so this is my best estimate)';
  }

  message += '\n\n**Estimated Nutrition:**\n';
  message += `🔥 ${analysis.calories} cal\n`;
  message += `💪 ${analysis.proteinG}g protein\n`;
  message += `🍚 ${analysis.carbsG}g carbs\n`;
  message += `🧈 ${analysis.fatG}g fat\n\n`;

  // Add breakdown if available
  if (analysis.breakdown && analysis.breakdown.length > 0) {
    message += '**Breakdown:**\n';
    analysis.breakdown.forEach((item) => {
      message += `• ${item.item} (${item.portion}): ${item.calories} cal\n`;
    });
    message += '\n';
  }

  // Style-specific closing
  if (style === 'tough_love') {
    message += 'Does this look right? Confirm to log it, or adjust if needed!';
  } else if (style === 'gentle') {
    message += 'Great job logging your meal! Does this look accurate to you?';
  } else {
    message += 'Look good? Tap confirm to log this meal!';
  }

  return message;
}
