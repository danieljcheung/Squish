import { Agent, AgentMemory, Message } from '@/types';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';
const API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: { type: string; text: string }[];
}

export async function sendMessage(
  agent: Agent,
  messages: Message[],
  memories: AgentMemory[],
  userMessage: string
): Promise<string> {
  // TODO: Implement Claude API call
  // 1. Build system prompt from agent persona
  // 2. Include relevant memories
  // 3. Include recent message history
  // 4. Send to Claude API
  // 5. Parse response and extract any [MEMORY: key=value] entries
  // 6. Return response text

  return 'Claude API not yet configured';
}

export function buildSystemPrompt(agent: Agent, memories: AgentMemory[]): string {
  // TODO: Build system prompt from agent persona
  return '';
}

export function extractMemories(response: string): { key: string; value: string }[] {
  // Extract [MEMORY: key=value] patterns from response
  const pattern = /\[MEMORY:\s*(\w+)=([^\]]+)\]/g;
  const memories: { key: string; value: string }[] = [];

  let match;
  while ((match = pattern.exec(response)) !== null) {
    memories.push({ key: match[1], value: match[2].trim() });
  }

  return memories;
}
