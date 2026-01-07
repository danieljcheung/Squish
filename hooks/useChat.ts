import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types';
import { getMessages, getMessageCount, createMessage } from '@/lib/supabase';
import { parseError, AppError, ErrorType } from '@/lib/errors';

const PAGE_SIZE = 50;

export function useChat(agentId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const totalCountRef = useRef<number>(0);

  // Fetch initial messages from Supabase
  const fetchMessages = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useChat] fetchMessages: Fetching messages for agent', agentId);

      // Get total count first
      const { count } = await getMessageCount(agentId);
      totalCountRef.current = count || 0;

      // Fetch the most recent messages
      const { data, error: fetchError } = await getMessages(agentId, PAGE_SIZE, 0);
      if (fetchError) {
        console.error('[useChat] fetchMessages: Fetch error', fetchError);
        const appError = parseError(fetchError);
        setError(appError);
        return;
      }

      const fetchedMessages = (data as Message[]) || [];
      console.log('[useChat] fetchMessages: Loaded', fetchedMessages.length, 'of', totalCountRef.current, 'messages');
      setMessages(fetchedMessages);
      setHasMore(totalCountRef.current > PAGE_SIZE);
    } catch (err) {
      console.error('[useChat] fetchMessages: Exception', err);
      const appError = parseError(err);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Load more (older) messages
  const loadMore = useCallback(async () => {
    if (!agentId || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      // Offset is simply the number of messages we already have
      // This skips the newest N messages and gets the next batch of older ones
      const offset = messages.length;

      console.log('[useChat] loadMore: Fetching older messages, offset:', offset, 'limit:', PAGE_SIZE);
      const { data, error: fetchError } = await getMessages(agentId, PAGE_SIZE, offset);

      if (fetchError) {
        console.error('[useChat] loadMore: Fetch error', fetchError);
        return;
      }

      const olderMessages = (data as Message[]) || [];
      console.log('[useChat] loadMore: Loaded', olderMessages.length, 'older messages');

      if (olderMessages.length > 0) {
        // Prepend older messages to the beginning, filtering out any duplicates
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlderMessages = olderMessages.filter((m) => !existingIds.has(m.id));
          return [...uniqueOlderMessages, ...prev];
        });
      }

      // If we got fewer messages than requested, there are no more
      setHasMore(olderMessages.length === PAGE_SIZE);
    } catch (err) {
      console.error('[useChat] loadMore: Exception', err);
    } finally {
      setLoadingMore(false);
    }
  }, [agentId, loadingMore, hasMore, messages.length]);

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
        totalCountRef.current += 1;
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
        console.warn('[useChat] saveAssistantMessage: Invalid agentId or content', { agentId, content: content?.substring(0, 50) });
        return { error: { type: ErrorType.VALIDATION, message: 'Invalid message', retryable: false } };
      }

      try {
        console.log('[useChat] saveAssistantMessage: Saving message for agent', agentId);
        const { data, error: saveError } = await createMessage({
          agent_id: agentId,
          role: 'assistant',
          content: content.trim(),
        });

        if (saveError) {
          console.error('[useChat] saveAssistantMessage: Save error', saveError);
          const appError = parseError(saveError);
          setError(appError);
          return { error: appError };
        }

        if (!data) {
          console.error('[useChat] saveAssistantMessage: No data returned from createMessage');
          return { error: { type: ErrorType.UNKNOWN, message: 'No data returned', retryable: true } };
        }

        const savedMessage = data as Message;
        console.log('[useChat] saveAssistantMessage: Message saved successfully', savedMessage.id);
        setMessages((prev) => [...prev, savedMessage]);
        totalCountRef.current += 1;
        return { data: savedMessage };
      } catch (err) {
        console.error('[useChat] saveAssistantMessage: Exception', err);
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
    loadingMore,
    sending,
    error,
    hasMore,
    sendUserMessage,
    saveAssistantMessage,
    addLocalMessage,
    removeMessage,
    clearMessages,
    clearError,
    loadMore,
    refetch: fetchMessages,
  };
}
