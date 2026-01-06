import { useState, useEffect, useCallback } from 'react';
import { AgentMemory } from '@/types';
import { getMemories, upsertMemory } from '@/lib/supabase';

/**
 * Hook for managing agent memories
 *
 * Memories are key-value pairs that Claude extracts from conversations
 * using the [MEMORY: key=value] pattern. These are used to personalize
 * future conversations.
 *
 * Example memories for a fitness coach:
 * - injury: "bad knee, avoid high impact"
 * - favorite_exercise: "swimming"
 * - workout_time: "mornings before work"
 * - weight_goal: "lose 15 lbs"
 */
export function useAgentMemory(agentId: string | undefined) {
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all memories for this agent
  const fetchMemories = useCallback(async () => {
    if (!agentId) {
      setMemories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getMemories(agentId);
      if (fetchError) {
        setError(fetchError.message);
        console.error('Error fetching memories:', fetchError);
      } else {
        setMemories((data as AgentMemory[]) || []);
      }
    } catch (err) {
      setError('Failed to fetch memories');
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Load memories on mount and when agentId changes
  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Add or update a memory
  const setMemory = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!agentId) return false;

      try {
        const { data, error: upsertError } = await upsertMemory(agentId, key, value);

        if (upsertError) {
          console.error('Error saving memory:', upsertError);
          return false;
        }

        // Update local state
        setMemories((prev) => {
          const existingIndex = prev.findIndex((m) => m.key === key);
          if (existingIndex >= 0) {
            // Update existing memory
            const updated = [...prev];
            updated[existingIndex] = data as AgentMemory;
            return updated;
          } else {
            // Add new memory
            return [data as AgentMemory, ...prev];
          }
        });

        console.log(`Memory saved: ${key}=${value}`);
        return true;
      } catch (err) {
        console.error('Error saving memory:', err);
        return false;
      }
    },
    [agentId]
  );

  // Save multiple memories at once (useful after Claude response)
  const saveMemories = useCallback(
    async (newMemories: { key: string; value: string }[]): Promise<number> => {
      if (!agentId || newMemories.length === 0) return 0;

      let savedCount = 0;
      for (const { key, value } of newMemories) {
        const success = await setMemory(key, value);
        if (success) savedCount++;
      }

      return savedCount;
    },
    [agentId, setMemory]
  );

  // Get a specific memory by key
  const getMemory = useCallback(
    (key: string): string | undefined => {
      const memory = memories.find((m) => m.key === key);
      return memory?.value;
    },
    [memories]
  );

  // Check if a memory exists
  const hasMemory = useCallback(
    (key: string): boolean => {
      return memories.some((m) => m.key === key);
    },
    [memories]
  );

  // Get memories as a simple key-value object
  const getMemoriesAsObject = useCallback((): Record<string, string> => {
    return memories.reduce((acc, m) => {
      acc[m.key] = m.value;
      return acc;
    }, {} as Record<string, string>);
  }, [memories]);

  // Format memories for display or prompt inclusion
  const formatMemoriesForPrompt = useCallback((): string => {
    if (memories.length === 0) {
      return 'No memories yet';
    }
    return memories.map((m) => `- ${m.key}: ${m.value}`).join('\n');
  }, [memories]);

  return {
    memories,
    loading,
    error,
    setMemory,
    saveMemories,
    getMemory,
    hasMemory,
    getMemoriesAsObject,
    formatMemoriesForPrompt,
    refetch: fetchMemories,
  };
}

/**
 * Common memory keys used by the fitness coach
 */
export const FITNESS_MEMORY_KEYS = {
  INJURY: 'injury',
  FAVORITE_EXERCISE: 'favorite_exercise',
  WORKOUT_TIME: 'workout_time',
  WEIGHT_GOAL: 'weight_goal',
  CURRENT_WEIGHT: 'current_weight',
  EQUIPMENT: 'equipment',
  MOTIVATION: 'motivation',
  CHALLENGE: 'challenge',
  ACHIEVEMENT: 'achievement',
  PREFERENCE: 'preference',
} as const;

/**
 * Common memory keys used by the budget coach
 */
export const BUDGET_MEMORY_KEYS = {
  INCOME: 'income',
  SAVINGS_GOAL: 'savings_goal',
  EXPENSE_CATEGORY: 'expense_category',
  BUDGET_LIMIT: 'budget_limit',
  FINANCIAL_GOAL: 'financial_goal',
} as const;

/**
 * Common memory keys used by the study coach
 */
export const STUDY_MEMORY_KEYS = {
  SUBJECT: 'subject',
  LEARNING_STYLE: 'learning_style',
  STUDY_TIME: 'study_time',
  EXAM_DATE: 'exam_date',
  DIFFICULTY_AREA: 'difficulty_area',
  STRENGTH: 'strength',
} as const;
