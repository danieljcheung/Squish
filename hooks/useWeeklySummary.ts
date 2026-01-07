import { useState, useCallback } from 'react';
import {
  Agent,
  WeeklySummary,
  DailyGoalStatus,
  DailyNutrition,
  WorkoutLog,
  TrendDirection,
} from '@/types';
import {
  getWeeklySummary,
  upsertWeeklySummary,
  getDailyNutritionRange,
  getWorkoutLogsForDateRange,
  getPreviousWeeklySummary,
  getMealLogsForDateRange,
  WeeklySummaryInsert,
} from '@/lib/supabase';

interface UseWeeklySummaryReturn {
  summary: WeeklySummary | null;
  loading: boolean;
  calculating: boolean;
  error: string | null;
  fetchSummary: (weeksAgo?: number) => Promise<WeeklySummary | null>;
  getCurrentWeekSummary: () => Promise<WeeklySummary | null>;
  getWeekDates: (weeksAgo?: number) => { weekStart: string; weekEnd: string; isCurrentWeek: boolean };
  isSunday: () => boolean;
  formatDateRange: (weekStart: string, weekEnd: string) => string;
}

// Helper: Get Monday of a given week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Get Sunday of a given week
function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

// Helper: Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper: Calculate trend direction
function calculateTrend(
  current: number,
  previous: number | undefined,
  threshold: number = 0.1
): TrendDirection {
  if (previous === undefined || previous === 0) return 'new';
  const change = (current - previous) / previous;
  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'stable';
}

export function useWeeklySummary(agent: Agent | null): UseWeeklySummaryReturn {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get week dates (Monday-Sunday)
  const getWeekDates = useCallback((weeksAgo: number = 0) => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - weeksAgo * 7);

    const monday = getMonday(targetDate);
    const sunday = getSunday(monday);

    const currentMonday = getMonday(today);

    return {
      weekStart: formatDate(monday),
      weekEnd: formatDate(sunday),
      isCurrentWeek: formatDate(monday) === formatDate(currentMonday),
    };
  }, []);

  // Check if today is Sunday
  const isSunday = useCallback(() => {
    return new Date().getDay() === 0;
  }, []);

  // Format date range for display
  const formatDateRange = useCallback((weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }, []);

  // Calculate summary from raw data
  const calculateSummary = useCallback(
    async (
      weekStart: string,
      weekEnd: string
    ): Promise<WeeklySummaryInsert> => {
      if (!agent) throw new Error('No agent');

      const persona = agent.persona_json as Record<string, any>;
      const targetCalories = persona?.nutritionGoals?.calories || 2000;
      const targetWaterMl = persona?.daily_water_goal_ml || 2000;

      // Fetch raw data in parallel
      const [
        { data: dailyData },
        { data: workouts },
        { data: meals },
        { data: previousSummary },
      ] = await Promise.all([
        getDailyNutritionRange(agent.id, weekStart, weekEnd),
        getWorkoutLogsForDateRange(agent.id, weekStart, weekEnd),
        getMealLogsForDateRange(agent.id, weekStart, weekEnd),
        getPreviousWeeklySummary(agent.id, weekStart),
      ]);

      const dailyNutrition = (dailyData as DailyNutrition[]) || [];
      const workoutLogs = (workouts as WorkoutLog[]) || [];

      // Build daily breakdown for calendar
      const dailyBreakdown: DailyGoalStatus[] = [];
      const startDate = new Date(weekStart);

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = formatDate(currentDate);

        const dayData = dailyNutrition.find((d) => d.date === dateStr);
        const dayWorkouts = workoutLogs.filter((w) =>
          w.created_at.startsWith(dateStr)
        );

        const calories = dayData?.total_calories || 0;
        const waterMl = dayData?.total_water_ml || 0;
        const workoutMins = dayData?.workout_mins || 0;

        // Check if within 10% of calorie goal
        const caloriesHit =
          calories > 0 &&
          Math.abs(calories - targetCalories) / targetCalories <= 0.1;

        dailyBreakdown.push({
          date: dateStr,
          dayOfWeek: currentDate.getDay(),
          caloriesHit,
          waterHit: waterMl >= targetWaterMl,
          workoutDone: dayWorkouts.length > 0 || workoutMins > 0,
          totalCalories: calories,
          totalWaterMl: waterMl,
          workoutMins,
        });
      }

      // Calculate aggregates
      const daysWithData = dailyNutrition.filter(
        (d) =>
          d.meal_count > 0 || d.total_water_ml > 0 || d.workouts_count > 0
      ).length;

      const totalCalories = dailyNutrition.reduce(
        (sum, d) => sum + (d.total_calories || 0),
        0
      );
      const totalProtein = dailyNutrition.reduce(
        (sum, d) => sum + (d.total_protein_g || 0),
        0
      );
      const totalCarbs = dailyNutrition.reduce(
        (sum, d) => sum + (d.total_carbs_g || 0),
        0
      );
      const totalFat = dailyNutrition.reduce(
        (sum, d) => sum + (d.total_fat_g || 0),
        0
      );
      const totalWater = dailyNutrition.reduce(
        (sum, d) => sum + (d.total_water_ml || 0),
        0
      );
      const mealCount = dailyNutrition.reduce(
        (sum, d) => sum + (d.meal_count || 0),
        0
      );

      // Workout type breakdown
      const workoutTypes: Record<string, number> = {};
      workoutLogs.forEach((w) => {
        workoutTypes[w.workout_type] = (workoutTypes[w.workout_type] || 0) + 1;
      });

      // Calculate longest streak in the week
      let maxStreak = 0;
      let currentStreak = 0;
      for (const day of dailyBreakdown) {
        const hasActivity =
          day.totalCalories > 0 || day.totalWaterMl > 0 || day.workoutDone;
        if (hasActivity) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Count goal achievements
      const daysAtCalorieGoal = dailyBreakdown.filter((d) => d.caloriesHit).length;
      const daysAtWaterGoal = dailyBreakdown.filter((d) => d.waterHit).length;
      const daysWithWorkouts = dailyBreakdown.filter((d) => d.workoutDone).length;

      // Generate highlights
      const highlights: string[] = [];

      if (maxStreak >= 3) {
        highlights.push(`${maxStreak}-day logging streak!`);
      }
      if (daysAtCalorieGoal >= 5) {
        highlights.push(`Hit calorie goal ${daysAtCalorieGoal} of 7 days`);
      }
      if (daysAtWaterGoal === 7) {
        highlights.push(`Hit water goal every day`);
      } else if (daysAtWaterGoal >= 5) {
        highlights.push(`Hit water goal ${daysAtWaterGoal} days`);
      }
      if (workoutLogs.length >= 4) {
        highlights.push(`${workoutLogs.length} workouts this week!`);
      }

      // Calculate averages (only over days with data to avoid penalizing)
      const avgCalories = daysWithData > 0 ? totalCalories / daysWithData : 0;
      const avgWater = daysWithData > 0 ? totalWater / daysWithData : 0;
      const avgProtein = daysWithData > 0 ? totalProtein / daysWithData : 0;
      const avgCarbs = daysWithData > 0 ? totalCarbs / daysWithData : 0;
      const avgFat = daysWithData > 0 ? totalFat / daysWithData : 0;

      // Calculate trends vs previous week
      const prevSummary = previousSummary as WeeklySummary | null;

      return {
        agent_id: agent.id,
        week_start: weekStart,
        week_end: weekEnd,
        meals_logged: mealCount,
        days_with_meals: dailyNutrition.filter((d) => d.meal_count > 0).length,
        avg_daily_calories: avgCalories,
        avg_daily_protein_g: avgProtein,
        avg_daily_carbs_g: avgCarbs,
        avg_daily_fat_g: avgFat,
        days_at_calorie_goal: daysAtCalorieGoal,
        avg_daily_water_ml: avgWater,
        days_at_water_goal: daysAtWaterGoal,
        total_workouts: workoutLogs.length,
        total_workout_mins: workoutLogs.reduce((sum, w) => sum + w.duration_mins, 0),
        workout_types_json: workoutTypes,
        days_with_workouts: daysWithWorkouts,
        calories_trend: calculateTrend(
          avgCalories,
          prevSummary?.avg_daily_calories
        ),
        workouts_trend: calculateTrend(
          workoutLogs.length,
          prevSummary?.total_workouts
        ),
        water_trend: calculateTrend(avgWater, prevSummary?.avg_daily_water_ml),
        longest_logging_streak: maxStreak,
        highlights_json: highlights.slice(0, 3), // Max 3 highlights
        daily_breakdown_json: dailyBreakdown,
        is_complete: new Date() > new Date(weekEnd + 'T23:59:59'),
      };
    },
    [agent]
  );

  // Fetch or calculate summary
  const fetchSummary = useCallback(
    async (weeksAgo: number = 0): Promise<WeeklySummary | null> => {
      if (!agent) {
        setError('No agent selected');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { weekStart, weekEnd } = getWeekDates(weeksAgo);

        // Try to get cached summary
        const { data: cached } = await getWeeklySummary(agent.id, weekStart);

        // If cached and complete (past week), return it
        if (cached && cached.is_complete) {
          setSummary(cached as WeeklySummary);
          return cached as WeeklySummary;
        }

        // Calculate fresh summary
        setCalculating(true);
        const calculated = await calculateSummary(weekStart, weekEnd);

        // Save to database (ignore errors for now)
        const { data: saved } = await upsertWeeklySummary(calculated);

        const result = (saved || {
          ...calculated,
          id: 'temp',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }) as WeeklySummary;

        setSummary(result);
        return result;
      } catch (err) {
        console.error('Failed to fetch weekly summary:', err);
        setError('Failed to load weekly summary');
        return null;
      } finally {
        setLoading(false);
        setCalculating(false);
      }
    },
    [agent, getWeekDates, calculateSummary]
  );

  // Convenience method for current week
  const getCurrentWeekSummary = useCallback(() => {
    return fetchSummary(0);
  }, [fetchSummary]);

  return {
    summary,
    loading,
    calculating,
    error,
    fetchSummary,
    getCurrentWeekSummary,
    getWeekDates,
    isSunday,
    formatDateRange,
  };
}

// Helper to detect if user message is asking for a weekly summary
export function detectSummaryRequest(message: string): {
  requested: boolean;
  weeksAgo: number;
} {
  const lower = message.toLowerCase();

  // Check for summary-related keywords
  const summaryKeywords = [
    'weekly summary',
    'week summary',
    'my week',
    'this week',
    'how did i do',
    'how am i doing',
    'weekly recap',
    'week in review',
    'show me my progress',
    'weekly progress',
  ];

  const requested = summaryKeywords.some((kw) => lower.includes(kw));

  if (!requested) {
    return { requested: false, weeksAgo: 0 };
  }

  // Check for past week references
  if (lower.includes('last week') || lower.includes('previous week')) {
    return { requested: true, weeksAgo: 1 };
  }

  const weeksAgoMatch = lower.match(/(\d+)\s*weeks?\s*ago/);
  if (weeksAgoMatch) {
    return { requested: true, weeksAgo: parseInt(weeksAgoMatch[1], 10) };
  }

  return { requested: true, weeksAgo: 0 };
}
