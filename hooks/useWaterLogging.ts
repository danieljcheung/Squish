import { useState, useCallback, useEffect } from 'react';
import { Agent, WaterLog, DailyNutrition, WATER_GLASS_ML, DEFAULT_WATER_GOAL_ML } from '@/types';
import {
  createWaterLog,
  getTodayWaterLogs,
  updateDailyWaterTotal,
  deleteWaterLog,
  getTodayNutrition,
} from '@/lib/supabase';

interface UseWaterLoggingReturn {
  todayWaterMl: number;
  todayWaterLogs: WaterLog[];
  lastLog: WaterLog | null;
  loading: boolean;
  logging: boolean;
  error: string | null;
  waterGoalMl: number;
  showAsGlasses: boolean;
  logWater: (amountMl?: number) => Promise<WaterLog | null>;
  undoLastLog: () => Promise<boolean>;
  refreshWaterData: () => Promise<void>;
}

export function useWaterLogging(agent: Agent | null): UseWaterLoggingReturn {
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [todayWaterLogs, setTodayWaterLogs] = useState<WaterLog[]>([]);
  const [lastLog, setLastLog] = useState<WaterLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get water settings from agent persona
  const persona = agent?.persona_json;
  const waterGoalMl = persona?.daily_water_goal_ml ?? DEFAULT_WATER_GOAL_ML;
  const showAsGlasses = persona?.show_water_as_glasses ?? true;

  // Fetch today's water data
  const refreshWaterData = useCallback(async () => {
    if (!agent) return;

    setLoading(true);
    setError(null);

    try {
      // Get today's water logs
      const { data: logs, error: logsError } = await getTodayWaterLogs(agent.id);

      if (logsError) {
        console.error('Failed to fetch water logs:', logsError);
        setError('Failed to load water data');
        return;
      }

      const waterLogs = (logs as WaterLog[]) || [];
      setTodayWaterLogs(waterLogs);

      // Calculate total from logs
      const total = waterLogs.reduce((sum, log) => sum + log.amount_ml, 0);
      setTodayWaterMl(total);

      // Set last log for undo
      if (waterLogs.length > 0) {
        setLastLog(waterLogs[waterLogs.length - 1]);
      } else {
        setLastLog(null);
      }
    } catch (err) {
      console.error('Failed to refresh water data:', err);
      setError('Failed to load water data');
    } finally {
      setLoading(false);
    }
  }, [agent]);

  // Initial load
  useEffect(() => {
    if (agent) {
      refreshWaterData();
    }
  }, [agent?.id]);

  // Log water intake
  const logWater = useCallback(
    async (amountMl: number = WATER_GLASS_ML): Promise<WaterLog | null> => {
      if (!agent) {
        setError('No agent selected');
        return null;
      }

      setLogging(true);
      setError(null);

      try {
        // Create water log entry
        const { data: newLog, error: logError } = await createWaterLog(agent.id, amountMl);

        if (logError || !newLog) {
          console.error('Failed to create water log:', logError);
          setError('Failed to log water');
          return null;
        }

        const waterLog = newLog as WaterLog;

        // Update daily nutrition total
        const { error: nutritionError } = await updateDailyWaterTotal(agent.id, amountMl);

        if (nutritionError) {
          console.error('Failed to update daily water total:', nutritionError);
          // Don't fail the whole operation, the log was still created
        }

        // Update local state
        setTodayWaterLogs((prev) => [...prev, waterLog]);
        setTodayWaterMl((prev) => prev + amountMl);
        setLastLog(waterLog);

        return waterLog;
      } catch (err) {
        console.error('Failed to log water:', err);
        setError('Failed to log water');
        return null;
      } finally {
        setLogging(false);
      }
    },
    [agent]
  );

  // Undo last water log
  const undoLastLog = useCallback(async (): Promise<boolean> => {
    if (!lastLog) {
      setError('No log to undo');
      return false;
    }

    setLogging(true);
    setError(null);

    try {
      // Delete the water log
      const { error: deleteError } = await deleteWaterLog(lastLog.id);

      if (deleteError) {
        console.error('Failed to delete water log:', deleteError);
        setError('Failed to undo');
        return false;
      }

      // Update daily nutrition (subtract the amount)
      if (agent) {
        await updateDailyWaterTotal(agent.id, -lastLog.amount_ml);
      }

      // Update local state
      const removedAmount = lastLog.amount_ml;
      setTodayWaterLogs((prev) => prev.filter((log) => log.id !== lastLog.id));
      setTodayWaterMl((prev) => Math.max(0, prev - removedAmount));

      // Set new last log
      setLastLog((prev) => {
        const currentLogs = todayWaterLogs.filter((log) => log.id !== lastLog.id);
        return currentLogs.length > 0 ? currentLogs[currentLogs.length - 1] : null;
      });

      return true;
    } catch (err) {
      console.error('Failed to undo water log:', err);
      setError('Failed to undo');
      return false;
    } finally {
      setLogging(false);
    }
  }, [agent, lastLog, todayWaterLogs]);

  return {
    todayWaterMl,
    todayWaterLogs,
    lastLog,
    loading,
    logging,
    error,
    waterGoalMl,
    showAsGlasses,
    logWater,
    undoLastLog,
    refreshWaterData,
  };
}
