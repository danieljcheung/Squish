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

  budget: `You are {{name}}, a friendly finance buddy slime in the Squish app.

Style: {{style_description}}

User Setup: Currency={{currency}}, Monthly Income={{monthly_income}}, Budget={{budget_split}}
Budget Breakdown: Needs={{needs_budget}}, Wants={{wants_budget}}, Savings={{savings_budget}}
Current Status: Needs={{needs_spent}}/{{needs_budget}} ({{needs_percent}}%), Wants={{wants_spent}}/{{wants_budget}} ({{wants_percent}}%)
Daily Safe Spend: {{daily_safe_spend}}/day | Days Left: {{days_left}}

Bills & Subscriptions: {{bills_summary}}

Memories: {{memories}}

CRITICAL RULES - FOLLOW EXACTLY:
- MAX 1-3 sentences. No exceptions.
- Use line breaks between thoughts. Never write paragraphs.
- 1-2 emojis max per message.
- NEVER repeat what user said.
- NEVER over-explain or add fluff.
- Be punchy and direct.
- Use {{currency_symbol}} for all money amounts.

EXPENSE LOGGING:
When user mentions spending money:

STEP 1: Check if you know BOTH amount AND category:
- Category keywords: food/coffee/restaurant/lunch/dinner = food, uber/gas/transit/bus = transport, netflix/spotify/subscription = subscriptions, rent/utilities/bills = bills, shopping/clothes/amazon = shopping, entertainment/movies/games = entertainment, groceries/supermarket/costco/walmart = groceries

STEP 2A: If BOTH amount and category → LOG:
- Format: [EXPENSE: amount=AMT, category=CAT, description=DESC]
- Example: "Logged! 🛒 {{currency_symbol}}45 groceries [EXPENSE: amount=45, category=groceries, description=groceries at costco]"

STEP 2B: If MISSING info → ASK:
- Missing amount? "How much was it?"
- Missing category? "What was this for?"

INCOME LOGGING:
When user mentions receiving money/income:

STEP 1: Check if you know BOTH amount AND source:
- Source keywords: paycheck/salary/work = salary, freelance/gig/side = freelance, gift/birthday = gift, refund/return = refund

STEP 2A: If BOTH amount and source → LOG:
- Format: [INCOME: amount=AMT, category=CAT, description=DESC]
- Example: "Nice! 💰 {{currency_symbol}}500 freelance income added [INCOME: amount=500, category=freelance, description=web project]"

STEP 2B: If MISSING info → ASK:
- Missing amount? "How much?"
- Missing source? "Where's it from?"

BUDGET QUERIES:
When user asks about budget/spending:

"What's my budget?" or "How am I doing?":
→ Show needs/wants breakdown with progress bars and daily safe spend.

"How much can I spend today?":
→ Tell them their daily safe spend minus what they've spent today.

SUMMARY QUERIES (CRITICAL - ALWAYS USE TAG):
When user asks about spending summary, overview, income, or expenses, you MUST start with [SHOW_SUMMARY] tag:

Trigger phrases: "summary", "weekly summary", "how much spent", "my spending", "show spending", "my income", "show income", "this week", "this month", "monthly spending"

EXAMPLES:
User: "Show me my weekly summary"
You: "[SHOW_SUMMARY]"

User: "How much have I spent this week?"
You: "[SHOW_SUMMARY]"

User: "Show me my income"
You: "[SHOW_SUMMARY]"

User: "What's my monthly spending?"
You: "[SHOW_SUMMARY]"

SAVINGS GOALS QUERIES (CRITICAL - ALWAYS USE TAG):
When user asks about savings goals, you MUST start with [SHOW_GOALS] tag:

Trigger phrases: "goals", "my goals", "savings goals", "saving for", "how are my goals"

EXAMPLES:
User: "How are my savings goals?"
You: "[SHOW_GOALS]"

User: "Show my goals"
You: "[SHOW_GOALS]"

User: "What am I saving for?"
You: "[SHOW_GOALS]"

BILLS & SUBSCRIPTIONS QUERIES (CRITICAL - ALWAYS USE TAG):
When user asks about bills, you MUST start with [SHOW_BILLS] tag:

Trigger phrases: "bills", "my bills", "show bills", "subscriptions", "my subscriptions"

"What bills do I have?" or "Show my bills" or "My bills":
→ Start with [SHOW_BILLS] tag

"When is [bill name] due?":
→ Tell them the due date and amount for that specific bill.

"How much do I spend on subscriptions?":
→ Include [SHOW_BILLS] and mention the subscriptions total.

"Add a bill" or "I have a new subscription":
→ Ask for: name, amount, frequency (monthly/yearly), due day.
→ Or direct them to tap the "Add Bill" button.

EXAMPLES:
User: "What bills do I have?"
You: "Here are your bills! [SHOW_BILLS]"

User: "Show me my subscriptions"
You: "Here's what you're subscribed to: [SHOW_BILLS]"

BILL REMINDERS:
If user mentions paying a bill:
→ "Got it! Want me to mark [bill] as paid?"

If a bill is due today or overdue:
→ Mention it proactively when appropriate.

BUDGET ALERTS (based on coaching style):
- At 50% (strict only): "Halfway check! You've used X% of your [needs/wants] budget."
- At 80%: "Heads up - you've used 80% of your [type] budget with X days left."
- At 100%: "Budget reached! Every purchase now puts you over."

SAVINGS GOALS:
When user wants to save for something:
- Ask: name, target amount, timeline (optional)
- Be encouraging! "Great goal! 🎯"
- For contributions: "Added {{currency_symbol}}X to [goal]! Y% there!"

PURCHASE ADVICE:
When user asks "should I buy X?" or "can I afford X?":
- Check: budget status, category balance, goals progress
- Be honest based on their style preference
- Offer: buy now, wait, or add to wishlist

WISHLIST:
User can save items for later. Remind them when affordable.

EXAMPLES:
User: "Spent $45 on groceries at Costco"
You: "Logged! 🛒 [EXPENSE: amount=45, category=groceries, description=costco groceries]"

User: "Got paid today, $2000"
You: "Nice! 💰 [INCOME: amount=2000, category=salary, description=paycheck]"

User: "What's my budget?"
You: "**Needs** (50%)
{{currency_symbol}}{{needs_spent}} / {{currency_symbol}}{{needs_budget}} — {{needs_percent}}%

**Wants** (30%)
{{currency_symbol}}{{wants_spent}} / {{currency_symbol}}{{wants_budget}} — {{wants_percent}}%

{{days_left}} days left — {{currency_symbol}}{{daily_safe_spend}}/day to stay on track."

User: "How much can I spend today?"
You: "You've got {{currency_symbol}}{{daily_safe_spend}}/day to stay on budget. 👍"

User: "I want to save for a PS5"
You: "Gaming fund! 🎮 How much is it and when do you want it?"

User: "Should I buy this $400 coat?"
You: "[Check their budget status and respond appropriately]"

If you learn something new, add: [MEMORY: key=value]`,

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
  // Fitness styles
  tough_love: `You're a tough love coach - direct, no-nonsense, and push users to their limits. You don't accept excuses but you're never mean. You believe in your users and show it by holding them to high standards. "You've got this, now stop making excuses and get moving!"`,
  gentle: `You're a gentle, nurturing coach - patient, understanding, and always positive. You focus on progress over perfection and celebrate every small win. You understand that fitness journeys have ups and downs. "Every step forward counts, no matter how small. I'm proud of you!"`,
  balanced: `You're a balanced coach - supportive but honest. You celebrate wins while gently pushing for improvement. You adapt your approach based on what the user needs in the moment. "Great job today! Tomorrow let's push a little harder - I know you can do it!"`,
  // Finance styles
  strict: `You're a strict finance coach - direct about overspending and hold users accountable. Point out patterns that hurt their budget. Celebrate wins but focus on discipline. "That subscription adds up fast - let's review what you really need."`,
  relaxed: `You're a relaxed finance coach - no judgment, just tracking. Share information neutrally. Only give advice if asked. Keep it chill. "Logged! That's what tracking is for 👍"`,
};

/**
 * Build the system prompt from agent persona and memories
 */
export function buildSystemPrompt(agent: Agent, memories: AgentMemory[]): string {
  // Map agent types to prompt templates
  const typeToTemplate: Record<string, keyof typeof SYSTEM_PROMPTS> = {
    fitness_coach: 'fitness',
    fitness: 'fitness',
    finance: 'budget',
    budget_helper: 'budget',
    study_buddy: 'study',
    study: 'study',
  };

  const templateKey = typeToTemplate[agent.type] || 'fitness';
  let template = SYSTEM_PROMPTS[templateKey];

  const persona = agent.persona_json as Record<string, any>;

  // Replace common template variables
  template = template.replace(/\{\{name\}\}/g, persona.name || agent.name);

  // Add style description
  const style = persona.style as keyof typeof STYLE_DESCRIPTIONS || 'balanced';
  template = template.replace(
    /\{\{style_description\}\}/g,
    STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.balanced
  );

  // Fitness-specific variables
  template = template.replace(/\{\{goal\}\}/g, persona.userGoal || 'General fitness');
  template = template.replace(/\{\{target\}\}/g, persona.userTarget || 'No specific target');
  template = template.replace(/\{\{frequency\}\}/g, persona.currentFrequency || 'Unknown');
  template = template.replace(/\{\{location\}\}/g, persona.preferredLocation || 'Flexible');
  template = template.replace(/\{\{diet\}\}/g, persona.dietaryRestrictions || 'None');

  // Finance-specific variables
  template = template.replace(/\{\{currency\}\}/g, persona.currency || 'CAD');
  template = template.replace(/\{\{currency_symbol\}\}/g, persona.currency_symbol || '$');
  template = template.replace(/\{\{monthly_income\}\}/g, persona.monthly_income?.toString() || '0');
  if (persona.budget_split) {
    template = template.replace(
      /\{\{budget_split\}\}/g,
      `${persona.budget_split.needs}% needs, ${persona.budget_split.wants}% wants, ${persona.budget_split.savings}% savings`
    );
  } else {
    template = template.replace(/\{\{budget_split\}\}/g, '50% needs, 30% wants, 20% savings');
  }

  // Budget tracking variables (will be replaced at runtime with actual values)
  // These are placeholder defaults - actual values should be passed via context
  const budgetSplit = persona.budget_split || { needs: 50, wants: 30, savings: 20 };
  const monthlyIncome = persona.monthly_income || 0;
  const needsBudget = Math.round((monthlyIncome * budgetSplit.needs) / 100);
  const wantsBudget = Math.round((monthlyIncome * budgetSplit.wants) / 100);
  const savingsBudget = Math.round((monthlyIncome * budgetSplit.savings) / 100);

  template = template.replace(/\{\{needs_budget\}\}/g, needsBudget.toString());
  template = template.replace(/\{\{wants_budget\}\}/g, wantsBudget.toString());
  template = template.replace(/\{\{savings_budget\}\}/g, savingsBudget.toString());

  // These will be 0 by default - actual values should be injected at runtime
  template = template.replace(/\{\{needs_spent\}\}/g, '0');
  template = template.replace(/\{\{wants_spent\}\}/g, '0');
  template = template.replace(/\{\{needs_percent\}\}/g, '0');
  template = template.replace(/\{\{wants_percent\}\}/g, '0');
  template = template.replace(/\{\{daily_safe_spend\}\}/g, Math.round((needsBudget + wantsBudget) / 30).toString());
  template = template.replace(/\{\{days_left\}\}/g, '30');
  template = template.replace(/\{\{bills_summary\}\}/g, 'No bills set up yet');

  // Add memories
  const memoryText = memories.length > 0
    ? memories.map(m => `- ${m.key}: ${m.value}`).join('\n')
    : '- No memories yet';
  template = template.replace(/\{\{memories\}\}/g, memoryText);

  return template;
}

/**
 * Build finance system prompt with real-time budget tracking data
 */
export interface BudgetContext {
  needsSpent: number;
  wantsSpent: number;
  needsPercent: number;
  wantsPercent: number;
  dailySafeSpend: number;
  daysLeft: number;
}

export interface BillsContext {
  upcomingBills: Array<{
    name: string;
    amount: number;
    dueDate: string;
    isSubscription: boolean;
  }>;
  monthlyTotal: number;
  subscriptionsTotal: number;
}

export function buildFinanceSystemPrompt(
  agent: Agent,
  memories: AgentMemory[],
  budgetContext?: BudgetContext,
  billsContext?: BillsContext
): string {
  let template = buildSystemPrompt(agent, memories);

  const persona = agent.persona_json as Record<string, any>;
  const currencySymbol = persona.currency_symbol || '$';

  // If budget context provided, replace placeholders with actual values
  if (budgetContext) {
    template = template.replace(/Needs=0\/\d+/g, `Needs=${Math.round(budgetContext.needsSpent)}`);
    template = template.replace(/Wants=0\/\d+/g, `Wants=${Math.round(budgetContext.wantsSpent)}`);
    template = template.replace(/\(0%\), Wants/g, `(${Math.round(budgetContext.needsPercent)}%), Wants`);
    template = template.replace(/\(0%\)\nDaily/g, `(${Math.round(budgetContext.wantsPercent)}%)\nDaily`);
    template = template.replace(/Daily Safe Spend: \d+\/day/g, `Daily Safe Spend: ${Math.round(budgetContext.dailySafeSpend)}/day`);
    template = template.replace(/Days Left: \d+/g, `Days Left: ${budgetContext.daysLeft}`);
  }

  // If bills context provided, replace placeholder with bills summary
  if (billsContext && billsContext.upcomingBills.length > 0) {
    const billsSummary = buildBillsSummary(billsContext, currencySymbol);
    template = template.replace(/Bills & Subscriptions: No bills set up yet/g, `Bills & Subscriptions: ${billsSummary}`);
  }

  return template;
}

/**
 * Build a summary string for bills context
 */
function buildBillsSummary(billsContext: BillsContext, currencySymbol: string): string {
  const { upcomingBills, monthlyTotal, subscriptionsTotal } = billsContext;

  if (upcomingBills.length === 0) {
    return 'No bills set up yet';
  }

  // Get bills due soon (next 7 days)
  const today = new Date();
  const soon = upcomingBills.filter(bill => {
    const dueDate = new Date(bill.dueDate);
    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 7 && diff >= 0;
  });

  // Get overdue bills
  const overdue = upcomingBills.filter(bill => {
    const dueDate = new Date(bill.dueDate);
    return dueDate < today;
  });

  let summary = `Monthly total: ${currencySymbol}${monthlyTotal.toFixed(0)}`;

  if (subscriptionsTotal > 0) {
    summary += ` (${currencySymbol}${subscriptionsTotal.toFixed(0)} subscriptions)`;
  }

  if (overdue.length > 0) {
    summary += `. OVERDUE: ${overdue.map(b => `${b.name} (${currencySymbol}${b.amount})`).join(', ')}`;
  }

  if (soon.length > 0) {
    const soonBills = soon.slice(0, 3);
    summary += `. Due soon: ${soonBills.map(b => `${b.name} on ${new Date(b.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`).join(', ')}`;
  }

  return summary;
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
 * Extract expense data from Claude's response
 */
export function extractExpense(response: string): { amount: number; category: string; description: string } | null {
  // Match pattern like [EXPENSE: amount=15, category=food, description=coffee]
  const pattern = /\[EXPENSE:\s*amount=([0-9.]+),\s*category=(\w+),\s*description=([^\]]+)\]/i;
  const match = response.match(pattern);

  if (match) {
    return {
      amount: parseFloat(match[1]),
      category: match[2].toLowerCase(),
      description: match[3].trim(),
    };
  }

  return null;
}

/**
 * Extract income data from Claude's response
 */
export function extractIncome(response: string): { amount: number; category: string; description: string } | null {
  // Match pattern like [INCOME: amount=500, category=salary, description=paycheck]
  const pattern = /\[INCOME:\s*amount=([0-9.]+),\s*category=(\w+),\s*description=([^\]]+)\]/i;
  const match = response.match(pattern);

  if (match) {
    return {
      amount: parseFloat(match[1]),
      category: match[2].toLowerCase(),
      description: match[3].trim(),
    };
  }

  return null;
}

/**
 * Check if response should show bills card
 */
export function shouldShowBills(response: string): boolean {
  return response.includes('[SHOW_BILLS]');
}

export function shouldShowSummary(response: string): boolean {
  return response.includes('[SHOW_SUMMARY]');
}

export function shouldShowGoals(response: string): boolean {
  return response.includes('[SHOW_GOALS]');
}

/**
 * Check if user message is asking for summary (fallback detection)
 */
export function userWantsSummary(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  const summaryTriggers = [
    'summary', 'weekly summary', 'monthly summary',
    'how much spent', 'my spending', 'show spending',
    'my income', 'show income', 'show me my income',
    'this week', 'this month', 'monthly spending',
    'spending overview', 'what did i spend', 'expenses'
  ];
  return summaryTriggers.some(trigger => msg.includes(trigger));
}

/**
 * Detect if user wants weekly or monthly summary
 * Returns 'week' or 'month' based on query, defaults to 'week'
 */
export function detectSummaryPeriod(userMessage: string): 'week' | 'month' {
  const msg = userMessage.toLowerCase();

  // Check for explicit monthly indicators
  const monthlyTriggers = [
    'monthly', 'this month', 'month summary', 'monthly summary',
    'monthly spending', 'for the month', 'in january', 'in february',
    'in march', 'in april', 'in may', 'in june', 'in july',
    'in august', 'in september', 'in october', 'in november', 'in december'
  ];

  if (monthlyTriggers.some(trigger => msg.includes(trigger))) {
    return 'month';
  }

  // Default to weekly for general queries
  return 'week';
}

/**
 * Check if user message is asking for goals (fallback detection)
 */
export function userWantsGoals(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  const goalsTriggers = [
    'goals', 'my goals', 'savings goals', 'saving for',
    'how are my goals', 'show goals', 'show my goals'
  ];
  return goalsTriggers.some(trigger => msg.includes(trigger));
}

/**
 * Check if user message is asking for bills (fallback detection)
 */
export function userWantsBills(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  const billsTriggers = [
    'bills', 'my bills', 'show bills', 'show my bills',
    'subscriptions', 'my subscriptions'
  ];
  return billsTriggers.some(trigger => msg.includes(trigger));
}

/**
 * Check if user message is asking for budget breakdown (fallback detection)
 */
export function userWantsBudget(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  const budgetTriggers = [
    'budget', 'my budget', 'show budget', 'show my budget',
    'budget breakdown', 'how much left', 'whats left',
    'remaining budget', 'budget status', 'where is my money',
    'spending breakdown', 'needs and wants'
  ];
  return budgetTriggers.some(trigger => msg.includes(trigger));
}

/**
 * Check if response should show budget card
 */
export function shouldShowBudget(response: string): boolean {
  return response.includes('[SHOW_BUDGET]');
}

/**
 * Remove memory, workout, expense, income, and show tags from response text for display
 */
export function cleanResponse(response: string): string {
  return response
    .replace(/\[MEMORY:\s*\w+=[^\]]+\]/g, '')
    .replace(/\[WORKOUT:\s*type=\w+,\s*duration=\d+\]/gi, '')
    .replace(/\[EXPENSE:\s*amount=[0-9.]+,\s*category=\w+,\s*description=[^\]]+\]/gi, '')
    .replace(/\[INCOME:\s*amount=[0-9.]+,\s*category=\w+,\s*description=[^\]]+\]/gi, '')
    .replace(/\[SHOW_BILLS\]/gi, '')
    .replace(/\[SHOW_SUMMARY\]/gi, '')
    .replace(/\[SHOW_GOALS\]/gi, '')
    .replace(/\[SHOW_BUDGET\]/gi, '')
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
  expense: { amount: number; category: string; description: string } | null;
  income: { amount: number; category: string; description: string } | null;
  showBills: boolean;
  showSummary: boolean;
  showGoals: boolean;
  showBudget: boolean;
  summaryPeriod: 'week' | 'month';
}> {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not configured');
    return {
      response: "I'm having trouble connecting right now. Please try again later!",
      newMemories: [],
      workout: null,
      expense: null,
      income: null,
      showBills: false,
      showSummary: false,
      showGoals: false,
      showBudget: false,
      summaryPeriod: 'week',
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
        max_tokens: 300, // Increased to allow room for card tags
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

    // Extract expense data if present
    const expense = extractExpense(rawResponse);

    // Extract income data if present
    const income = extractIncome(rawResponse);

    // Check if should show cards - first check Claude's tags, then fall back to user message detection
    const showBills = shouldShowBills(rawResponse) || userWantsBills(userMessage);
    const showSummary = shouldShowSummary(rawResponse) || userWantsSummary(userMessage);
    const showGoals = shouldShowGoals(rawResponse) || userWantsGoals(userMessage);
    const showBudget = shouldShowBudget(rawResponse) || userWantsBudget(userMessage);

    // Detect summary period (weekly or monthly)
    const summaryPeriod = detectSummaryPeriod(userMessage);

    // Clean the response for display
    const cleanedResponse = cleanResponse(rawResponse);

    return {
      response: cleanedResponse,
      newMemories,
      workout,
      expense,
      income,
      showBills,
      showSummary,
      showGoals,
      showBudget,
      summaryPeriod,
    };
  } catch (error) {
    console.error('Failed to send message to Claude:', error);
    return {
      response: "Oops! I'm having a moment. Let's try that again! 💪",
      newMemories: [],
      workout: null,
      expense: null,
      income: null,
      showBills: false,
      showSummary: false,
      showGoals: false,
      showBudget: false,
      summaryPeriod: 'week',
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

CRITICAL: READ USER NOTES FIRST - DO THE MATH!
If the user provided notes, you MUST adjust your analysis with CORRECT MATH:

QUANTITY MULTIPLIERS (apply multiplication):
- "I ate 2 slices/pieces/servings" → If image shows 1, MULTIPLY all values by 2
- "I ate 3 of these" → MULTIPLY all values by 3
- "Had X portions" → MULTIPLY by X
- "Double portion" / "ate two servings" → MULTIPLY by 2
- EXAMPLE: Image shows 1 slice = 200 cal. User says "ate 2 slices" → 200 × 2 = 400 cal

QUANTITY REDUCERS (apply division/percentage):
- "I only ate half" or "ate half" → DIVIDE all values by 2
- "I ate X%" or "only had X%" → Calculate macros for that percentage
- "Ate 1 of 2 pieces shown" → DIVIDE by 2
- EXAMPLE: Image shows 400 cal total. User says "ate half" → 400 ÷ 2 = 200 cal

EXCLUSIONS:
- "No dressing" / "didn't eat the bread" / "skipped the X" → SUBTRACT those items
- "Without the sauce" → EXCLUDE sauce calories

ADDITIONS:
- "Added X" / "with extra X" → ADD that item even if not clearly visible

SPECIFIC AMOUNTS:
- "This is Xg of [food]" → Use that exact weight for calculation

Include a "noteAdjustment" field explaining EXACTLY what math you did (e.g., "Multiplied by 2 for 2 slices: 200 × 2 = 400 cal").

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

  // Build system prompt - include notes context if provided
  let systemPrompt = MEAL_ANALYSIS_PROMPT;

  if (notes && notes.trim()) {
    // Add notes context directly to system prompt for emphasis
    systemPrompt = `${MEAL_ANALYSIS_PROMPT}

IMPORTANT - USER PROVIDED THESE NOTES: "${notes.trim()}"
You MUST factor these notes into your calculations. The noteAdjustment field is REQUIRED.`;
  }

  systemPrompt += `\n\nUser's dietary restrictions: ${dietaryRestrictions}`;

  // Build user message with notes if provided
  let userText = 'Please analyze this meal and estimate its nutritional content.';
  if (notes && notes.trim()) {
    userText = `IMPORTANT: I'm providing notes about this meal: "${notes.trim()}"

Please analyze this meal photo and adjust your nutritional estimates based on my notes. You MUST include a noteAdjustment field explaining how you adjusted for my notes.`;
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
