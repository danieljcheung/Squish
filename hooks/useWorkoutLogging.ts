import { useState, useCallback, useEffect } from 'react';
import {
  Agent,
  WorkoutLog,
  WorkoutType,
  WORKOUT_KEYWORDS,
  WORKOUT_TYPE_INFO,
} from '@/types';
import {
  createWorkoutLog,
  getTodayWorkoutLogs,
  updateDailyWorkoutTotal,
  getWeeklyWorkoutStats,
  getLastWorkoutLog,
  WorkoutLogInsert,
} from '@/lib/supabase';

interface WeeklyStats {
  totalWorkouts: number;
  totalMins: number;
  streak: number;
}

interface UseWorkoutLoggingReturn {
  todayWorkouts: WorkoutLog[];
  lastWorkout: WorkoutLog | null;
  weeklyStats: WeeklyStats | null;
  loading: boolean;
  logging: boolean;
  error: string | null;
  logWorkout: (type: WorkoutType, durationMins: number, notes?: string) => Promise<WorkoutLog | null>;
  refreshWorkoutData: () => Promise<void>;
  parseWorkoutType: (text: string) => WorkoutType | null;
  parseDuration: (text: string) => number | null;
  formatDuration: (mins: number) => string;
}

export function useWorkoutLogging(agent: Agent | null): UseWorkoutLoggingReturn {
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutLog[]>([]);
  const [lastWorkout, setLastWorkout] = useState<WorkoutLog | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse workout type from text
  const parseWorkoutType = useCallback((text: string): WorkoutType | null => {
    const lowerText = text.toLowerCase();

    for (const [type, keywords] of Object.entries(WORKOUT_KEYWORDS)) {
      if (type === 'other') continue;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return type as WorkoutType;
        }
      }
    }

    return null;
  }, []);

  // Parse duration from text
  const parseDuration = useCallback((text: string): number | null => {
    const lowerText = text.toLowerCase();

    // Match patterns like "30 min", "30 mins", "30 minutes"
    const minMatch = lowerText.match(/(\d+)\s*(?:min|mins|minutes)/);
    if (minMatch) {
      return parseInt(minMatch[1], 10);
    }

    // Match patterns like "1 hour", "2 hours", "an hour"
    const hourMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)/);
    if (hourMatch) {
      return Math.round(parseFloat(hourMatch[1]) * 60);
    }

    // Match "an hour"
    if (lowerText.includes('an hour') || lowerText.includes('1 hour')) {
      return 60;
    }

    // Match "hour and a half" or "1.5 hours"
    if (lowerText.includes('hour and a half') || lowerText.includes('1.5 hour')) {
      return 90;
    }

    // Match "half hour" or "half an hour"
    if (lowerText.includes('half hour') || lowerText.includes('half an hour')) {
      return 30;
    }

    // Distance-based estimates for runs/walks
    const kmMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:k|km|kilometer)/);
    if (kmMatch) {
      const km = parseFloat(kmMatch[1]);
      // Estimate ~6 min/km for running, ~12 min/km for walking
      const isWalk = lowerText.includes('walk') || lowerText.includes('hike');
      return Math.round(km * (isWalk ? 12 : 6));
    }

    // Match "5k" pattern
    const kMatch = lowerText.match(/(\d+)k\b/);
    if (kMatch) {
      const km = parseInt(kMatch[1], 10);
      return Math.round(km * 6); // Assume running pace
    }

    return null;
  }, []);

  // Format duration for display
  const formatDuration = useCallback((mins: number): string => {
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMins}m`;
  }, []);

  // Fetch workout data
  const refreshWorkoutData = useCallback(async () => {
    if (!agent) return;

    setLoading(true);
    setError(null);

    try {
      // Get today's workouts
      const { data: todayData, error: todayError } = await getTodayWorkoutLogs(agent.id);
      if (!todayError && todayData) {
        setTodayWorkouts(todayData as WorkoutLog[]);
      }

      // Get weekly stats
      const { data: statsData, error: statsError } = await getWeeklyWorkoutStats(agent.id);
      if (!statsError && statsData) {
        setWeeklyStats({
          totalWorkouts: statsData.totalWorkouts,
          totalMins: statsData.totalMins,
          streak: statsData.streak,
        });
      }

      // Get last workout
      const { data: lastData } = await getLastWorkoutLog(agent.id);
      if (lastData) {
        setLastWorkout(lastData as WorkoutLog);
      }
    } catch (err) {
      console.error('Failed to refresh workout data:', err);
      setError('Failed to load workout data');
    } finally {
      setLoading(false);
    }
  }, [agent]);

  // Initial load
  useEffect(() => {
    if (agent) {
      refreshWorkoutData();
    }
  }, [agent?.id]);

  // Log a workout
  const logWorkout = useCallback(
    async (
      type: WorkoutType,
      durationMins: number,
      notes?: string
    ): Promise<WorkoutLog | null> => {
      if (!agent) {
        setError('No agent selected');
        return null;
      }

      setLogging(true);
      setError(null);

      try {
        const workoutData: WorkoutLogInsert = {
          agent_id: agent.id,
          workout_type: type,
          duration_mins: durationMins,
          notes,
        };

        const { data: newLog, error: logError } = await createWorkoutLog(workoutData);

        if (logError || !newLog) {
          console.error('Failed to create workout log:', logError);
          setError('Failed to log workout');
          return null;
        }

        const workoutLog = newLog as WorkoutLog;

        // Update daily totals
        await updateDailyWorkoutTotal(agent.id, durationMins);

        // Update local state
        setTodayWorkouts((prev) => [...prev, workoutLog]);
        setLastWorkout(workoutLog);

        // Update weekly stats
        setWeeklyStats((prev) =>
          prev
            ? {
                ...prev,
                totalWorkouts: prev.totalWorkouts + 1,
                totalMins: prev.totalMins + durationMins,
              }
            : {
                totalWorkouts: 1,
                totalMins: durationMins,
                streak: 1,
              }
        );

        return workoutLog;
      } catch (err) {
        console.error('Failed to log workout:', err);
        setError('Failed to log workout');
        return null;
      } finally {
        setLogging(false);
      }
    },
    [agent]
  );

  return {
    todayWorkouts,
    lastWorkout,
    weeklyStats,
    loading,
    logging,
    error,
    logWorkout,
    refreshWorkoutData,
    parseWorkoutType,
    parseDuration,
    formatDuration,
  };
}

// Helper to generate workout confirmation message
export function generateWorkoutConfirmation(
  type: WorkoutType,
  durationMins: number,
  weeklyCount: number,
  streak: number
): string {
  const typeInfo = WORKOUT_TYPE_INFO[type];
  const duration = durationMins < 60
    ? `${durationMins} min`
    : durationMins === 60
    ? '1 hour'
    : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

  const celebrations = [
    `Logged! ${typeInfo.emoji} ${duration} ${typeInfo.label.toLowerCase()} workout.`,
    `Crushed it! ${typeInfo.emoji} ${duration} ${typeInfo.label.toLowerCase()} in the books.`,
    `Nice work! ${typeInfo.emoji} ${duration} ${typeInfo.label.toLowerCase()} logged.`,
    `Got it! ${typeInfo.emoji} ${duration} ${typeInfo.label.toLowerCase()} workout tracked.`,
  ];

  let message = celebrations[Math.floor(Math.random() * celebrations.length)];

  // Add weekly count
  if (weeklyCount > 1) {
    message += ` That's ${weeklyCount} workouts this week!`;
  }

  // Add streak if 2+ days
  if (streak >= 2) {
    message += ` ${streak} days in a row — nice consistency! 🔥`;
  }

  return message;
}
