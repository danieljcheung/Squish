import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Agent, SharedInsight } from '@/types';
import { getAllUserInsights } from '@/lib/supabase';
import { generateLoungeConversation, LoungeMessage } from '@/lib/loungeConversation';

const CACHE_KEY = '@squish_lounge_conversation';

interface CachedConversation {
  date: string; // YYYY-MM-DD
  fitnessAgentId: string;
  financeAgentId: string;
  messages: LoungeMessage[];
  generatedAt: string;
}

interface UseLoungeConversationReturn {
  messages: LoungeMessage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for generating and caching agent lounge conversations
 * Caches conversations daily to avoid excessive API calls
 */
export function useLoungeConversation(
  fitnessAgent: Agent | undefined,
  financeAgent: Agent | undefined
): UseLoungeConversationReturn {
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get today's date string
   */
  const getTodayString = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  /**
   * Check if cached conversation is valid (same day, same agents)
   */
  const isCacheValid = (cached: CachedConversation): boolean => {
    const today = getTodayString();
    return (
      cached.date === today &&
      cached.fitnessAgentId === fitnessAgent?.id &&
      cached.financeAgentId === financeAgent?.id &&
      cached.messages.length > 0
    );
  };

  /**
   * Load cached conversation
   */
  const loadCachedConversation = async (): Promise<CachedConversation | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      return JSON.parse(cached) as CachedConversation;
    } catch (err) {
      console.error('[useLoungeConversation] Error loading cache:', err);
      return null;
    }
  };

  /**
   * Save conversation to cache
   */
  const saveConversation = async (newMessages: LoungeMessage[]): Promise<void> => {
    if (!fitnessAgent || !financeAgent) return;

    try {
      const cached: CachedConversation = {
        date: getTodayString(),
        fitnessAgentId: fitnessAgent.id,
        financeAgentId: financeAgent.id,
        messages: newMessages,
        generatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (err) {
      console.error('[useLoungeConversation] Error saving cache:', err);
    }
  };

  /**
   * Generate fresh conversation
   */
  const generateFreshConversation = async (): Promise<LoungeMessage[]> => {
    if (!fitnessAgent || !financeAgent) {
      return [];
    }

    // Fetch all insights for the user
    let insights: SharedInsight[] = [];
    try {
      const { data } = await getAllUserInsights(fitnessAgent.user_id);
      insights = (data as SharedInsight[]) || [];
    } catch (err) {
      console.error('[useLoungeConversation] Error fetching insights:', err);
    }

    // Generate conversation
    const newMessages = await generateLoungeConversation(
      fitnessAgent,
      financeAgent,
      insights
    );

    return newMessages;
  };

  /**
   * Load or generate conversation
   */
  const loadConversation = useCallback(async () => {
    if (!fitnessAgent || !financeAgent) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = await loadCachedConversation();
      if (cached && isCacheValid(cached)) {
        setMessages(cached.messages);
        setLoading(false);
        return;
      }

      // Generate fresh conversation
      const newMessages = await generateFreshConversation();
      setMessages(newMessages);

      // Cache it
      await saveConversation(newMessages);
    } catch (err) {
      console.error('[useLoungeConversation] Error:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [fitnessAgent?.id, financeAgent?.id]);

  /**
   * Force refresh (pull to refresh)
   */
  const refresh = useCallback(async () => {
    if (!fitnessAgent || !financeAgent) return;

    setLoading(true);
    setError(null);

    try {
      // Always generate fresh
      const newMessages = await generateFreshConversation();
      setMessages(newMessages);

      // Update cache
      await saveConversation(newMessages);
    } catch (err) {
      console.error('[useLoungeConversation] Refresh error:', err);
      setError('Failed to refresh conversation');
    } finally {
      setLoading(false);
    }
  }, [fitnessAgent?.id, financeAgent?.id]);

  // Load on mount and when agents change
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  return {
    messages,
    loading,
    error,
    refresh,
  };
}
