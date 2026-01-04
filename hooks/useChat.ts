import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { sendMessage } from '@/lib/claude';
import { Message, Agent, AgentMemory } from '@/types';

export function useChat(agentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // TODO: Fetch messages from Supabase
    // TODO: Subscribe to realtime updates
    setLoading(false);
  }, [agentId]);

  const send = useCallback(
    async (content: string, agent: Agent, memories: AgentMemory[]) => {
      setSending(true);

      // Optimistically add user message
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        agent_id: agentId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // TODO: Save user message to Supabase
        // TODO: Get Claude response
        // TODO: Extract and save memories
        // TODO: Save assistant message to Supabase

        const response = await sendMessage(agent, messages, memories, content);

        const assistantMessage: Message = {
          id: `temp-${Date.now() + 1}`,
          agent_id: agentId,
          role: 'assistant',
          content: response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Failed to send message:', error);
        // TODO: Handle error, remove optimistic message
      } finally {
        setSending(false);
      }
    },
    [agentId, messages]
  );

  return {
    messages,
    loading,
    sending,
    send,
  };
}
