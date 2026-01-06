import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types';
import { getMessages, createMessage } from '@/lib/supabase';

export function useChat(agentId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages from Supabase
  const fetchMessages = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getMessages(agentId);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMessages((data as Message[]) || []);
      }
    } catch (err) {
      setError('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send a user message and save to Supabase
  const sendUserMessage = useCallback(
    async (content: string): Promise<Message | null> => {
      if (!agentId || !content.trim()) return null;

      setSending(true);
      setError(null);

      try {
        // Save user message to Supabase
        const { data, error: saveError } = await createMessage({
          agent_id: agentId,
          role: 'user',
          content: content.trim(),
        });

        if (saveError) {
          setError(saveError.message);
          return null;
        }

        const savedMessage = data as Message;
        setMessages((prev) => [...prev, savedMessage]);
        return savedMessage;
      } catch (err) {
        setError('Failed to send message');
        return null;
      } finally {
        setSending(false);
      }
    },
    [agentId]
  );

  // Save an assistant message to Supabase
  const saveAssistantMessage = useCallback(
    async (content: string): Promise<Message | null> => {
      if (!agentId || !content.trim()) return null;

      try {
        const { data, error: saveError } = await createMessage({
          agent_id: agentId,
          role: 'assistant',
          content: content.trim(),
        });

        if (saveError) {
          setError(saveError.message);
          return null;
        }

        const savedMessage = data as Message;
        setMessages((prev) => [...prev, savedMessage]);
        return savedMessage;
      } catch (err) {
        setError('Failed to save assistant message');
        return null;
      }
    },
    [agentId]
  );

  // Add a message locally (for optimistic updates)
  const addLocalMessage = useCallback((message: Omit<Message, 'id' | 'created_at'>) => {
    const localMessage: Message = {
      ...message,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localMessage]);
    return localMessage;
  }, []);

  // Clear all messages locally
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    sendUserMessage,
    saveAssistantMessage,
    addLocalMessage,
    clearMessages,
    refetch: fetchMessages,
  };
}
