import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CombinedWeeklySummary } from '@/types';
import {
  getRecentCombinedSummary,
  getCombinedWeeklySummary,
  markCombinedSummaryViewed,
  dismissCombinedSummary,
} from '@/lib/supabase';

interface UseCombinedWeeklySummaryReturn {
  summary: CombinedWeeklySummary | null;
  loading: boolean;
  error: string | null;
  fetchRecentSummary: () => Promise<CombinedWeeklySummary | null>;
  fetchSummaryForWeek: (weekStart: string) => Promise<CombinedWeeklySummary | null>;
  markAsViewed: () => Promise<void>;
  dismiss: () => Promise<void>;
  shouldShowHomeCard: boolean;
  formatDateRange: (weekStart: string, weekEnd: string) => string;
}

/**
 * Hook for managing combined weekly summaries
 * Used on home screen (preview card) and combined summary screen
 */
export function useCombinedWeeklySummary(): UseCombinedWeeklySummaryReturn {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CombinedWeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Format week date range for display (e.g., "Jan 6 - 12")
   */
  const formatDateRange = useCallback((weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }, []);

  /**
   * Fetch the most recent non-dismissed summary (for home screen card)
   */
  const fetchRecentSummary = useCallback(async () => {
    if (!user?.id) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getRecentCombinedSummary(user.id);

      // PGRST116 = no rows returned, which is fine
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[useCombinedWeeklySummary] Error fetching recent summary:', fetchError);
        setError('Failed to load summary');
        return null;
      }

      setSummary(data);
      return data;
    } catch (err) {
      console.error('[useCombinedWeeklySummary] Unexpected error:', err);
      setError('Failed to load summary');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Fetch summary for a specific week (for deep linking or history)
   */
  const fetchSummaryForWeek = useCallback(
    async (weekStart: string) => {
      if (!user?.id) return null;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await getCombinedWeeklySummary(user.id, weekStart);

        if (fetchError) {
          console.error('[useCombinedWeeklySummary] Error fetching summary for week:', fetchError);
          setError('Failed to load summary');
          return null;
        }

        setSummary(data);
        return data;
      } catch (err) {
        console.error('[useCombinedWeeklySummary] Unexpected error:', err);
        setError('Failed to load summary');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  /**
   * Mark the current summary as viewed
   */
  const markAsViewed = useCallback(async () => {
    if (!summary?.id) return;

    try {
      const { error: updateError } = await markCombinedSummaryViewed(summary.id);
      if (updateError) {
        console.error('[useCombinedWeeklySummary] Error marking as viewed:', updateError);
        return;
      }
      setSummary((prev) => (prev ? { ...prev, viewed: true } : null));
    } catch (err) {
      console.error('[useCombinedWeeklySummary] Unexpected error marking as viewed:', err);
    }
  }, [summary?.id]);

  /**
   * Dismiss the summary (hide from home screen)
   */
  const dismiss = useCallback(async () => {
    if (!summary?.id) return;

    try {
      const { error: updateError } = await dismissCombinedSummary(summary.id);
      if (updateError) {
        console.error('[useCombinedWeeklySummary] Error dismissing:', updateError);
        return;
      }
      setSummary(null);
    } catch (err) {
      console.error('[useCombinedWeeklySummary] Unexpected error dismissing:', err);
    }
  }, [summary?.id]);

  // Should show home card if summary exists and hasn't been dismissed
  const shouldShowHomeCard = summary !== null && !summary.dismissed_at;

  return {
    summary,
    loading,
    error,
    fetchRecentSummary,
    fetchSummaryForWeek,
    markAsViewed,
    dismiss,
    shouldShowHomeCard,
    formatDateRange,
  };
}
