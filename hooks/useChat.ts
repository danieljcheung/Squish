import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types';
import { getMessages, createMessage } from '@/lib/supabase';
import { parseError, AppError, ErrorType } from '@/lib/errors';

export function useChat(agentId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

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
        const appError = parseError(fetchError);
        setError(appError);
        return;
      }
      setMessages((data as Message[]) || []);
    } catch (err) {
      const appError = parseError(err);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send a user message and save to Supabase
  const sendUserMessage = useCallback(
    async (content: string): Promise<{ data?: Message; error?: AppError }> => {
      if (!agentId || !content.trim()) {
        return { error: { type: ErrorType.VALIDATION, message: 'Invalid message', retryable: false } };
      }

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
          const appError = parseError(saveError);
          setError(appError);
          return { error: appError };
        }

        const savedMessage = data as Message;
        setMessages((prev) => [...prev, savedMessage]);
        return { data: savedMessage };
      } catch (err) {
        const appError = parseError(err);
        setError(appError);
        return { error: appError };
      } finally {
        setSending(false);
      }
    },
    [agentId]
  );

  // Save an assistant message to Supabase
  const saveAssistantMessage = useCallback(
    async (content: string): Promise<{ data?: Message; error?: AppError }> => {
      if (!agentId || !content.trim()) {
        return { error: { type: ErrorType.VALIDATION, message: 'Invalid message', retryable: false } };
      }

      try {
        const { data, error: saveError } = await createMessage({
          agent_id: agentId,
          role: 'assistant',
          content: content.trim(),
        });

        if (saveError) {
          const appError = parseError(saveError);
          setError(appError);
          return { error: appError };
        }

        const savedMessage = data as Message;
        setMessages((prev) => [...prev, savedMessage]);
        return { data: savedMessage };
      } catch (err) {
        const appError = parseError(err);
        setError(appError);
        return { error: appError };
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

  // Remove a local message (for failed sends)
  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // Clear all messages locally
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    sendUserMessage,
    saveAssistantMessage,
    addLocalMessage,
    removeMessage,
    clearMessages,
    clearError,
    refetch: fetchMessages,
  };
}
