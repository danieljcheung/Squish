import { useState, useCallback } from 'react';
import { Agent, MealAnalysis, DailyNutrition } from '@/types';
import { analyzeMealPhoto } from '@/lib/claude';
import {
  createMealLog,
  updateDailyNutrition,
  getTodayNutrition,
  MealLogInsert,
} from '@/lib/supabase';

interface PendingMeal {
  photoUrl: string;
  analysis: MealAnalysis;
  message: string;
}

interface ChatMealData {
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface ConfirmMealResult {
  success: boolean;
  finalAnalysis?: MealAnalysis;
  notes?: string;
}

interface UseMealLoggingReturn {
  pendingMeal: PendingMeal | null;
  analyzing: boolean;
  saving: boolean;
  error: string | null;
  todayNutrition: DailyNutrition | null;
  analyzeMeal: (photoUrl: string, notes?: string) => Promise<PendingMeal | null>;
  confirmMeal: (notes?: string) => Promise<ConfirmMealResult>;
  cancelMeal: () => void;
  refreshTodayNutrition: () => Promise<void>;
  logMealFromChat: (mealData: ChatMealData) => Promise<boolean>;
}

export function useMealLogging(agent: Agent | null): UseMealLoggingReturn {
  const [pendingMeal, setPendingMeal] = useState<PendingMeal | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayNutrition, setTodayNutrition] = useState<DailyNutrition | null>(null);

  // Fetch today's nutrition summary
  const refreshTodayNutrition = useCallback(async () => {
    if (!agent) return;

    try {
      const { data } = await getTodayNutrition(agent.id);
      if (data) {
        setTodayNutrition(data as DailyNutrition);
      }
    } catch (err) {
      console.error('Failed to fetch today nutrition:', err);
    }
  }, [agent]);

  // Analyze a meal photo
  const analyzeMeal = useCallback(
    async (photoUrl: string, notes?: string): Promise<PendingMeal | null> => {
      if (!agent) {
        setError('No agent selected');
        return null;
      }

      setAnalyzing(true);
      setError(null);

      try {
        const result = await analyzeMealPhoto(photoUrl, agent, notes);

        if (!result) {
          setError('Failed to analyze meal. Please try again.');
          return null;
        }

        const pending: PendingMeal = {
          photoUrl,
          analysis: result.analysis,
          message: result.message,
        };

        setPendingMeal(pending);
        return pending;
      } catch (err) {
        setError('Failed to analyze meal');
        return null;
      } finally {
        setAnalyzing(false);
      }
    },
    [agent]
  );

  // Confirm and save the meal (re-analyzes with notes if provided)
  const confirmMeal = useCallback(
    async (notes?: string): Promise<ConfirmMealResult> => {
      if (!agent || !pendingMeal) {
        setError('No meal to confirm');
        return { success: false };
      }

      setSaving(true);
      setError(null);

      let finalAnalysis: MealAnalysis = pendingMeal.analysis;
      const trimmedNotes = notes?.trim() || undefined;

      // If notes are provided, re-analyze the photo with notes
      if (trimmedNotes) {
        try {
          const result = await analyzeMealPhoto(pendingMeal.photoUrl, agent, trimmedNotes);
          if (result) {
            finalAnalysis = result.analysis;
          }
        } catch (err) {
          console.error('Failed to re-analyze with notes, using original:', err);
          // Continue with original analysis if re-analysis fails
        }
      }

      try {
        // Create the meal log entry
        const mealLogData: MealLogInsert = {
          agent_id: agent.id,
          meal_type: finalAnalysis.mealType,
          photo_url: pendingMeal.photoUrl,
          description: finalAnalysis.description,
          ai_analysis: finalAnalysis as unknown as Record<string, unknown>,
          calories: finalAnalysis.calories,
          protein_g: finalAnalysis.proteinG,
          carbs_g: finalAnalysis.carbsG,
          fat_g: finalAnalysis.fatG,
          user_confirmed: true,
        };

        const { error: mealError } = await createMealLog(mealLogData);

        if (mealError) {
          console.error('Failed to create meal log:', mealError);
          setError('Failed to save meal');
          return { success: false };
        }

        // Update daily nutrition
        const persona = agent.persona_json as Record<string, unknown>;
        const nutritionGoals = persona.nutritionGoals as { calories?: number } | undefined;

        const { data: updatedNutrition } = await updateDailyNutrition(
          agent.id,
          finalAnalysis.calories,
          finalAnalysis.proteinG,
          finalAnalysis.carbsG,
          finalAnalysis.fatG,
          nutritionGoals?.calories
        );

        if (updatedNutrition) {
          setTodayNutrition(updatedNutrition as DailyNutrition);
        }

        // Clear pending meal
        setPendingMeal(null);
        return {
          success: true,
          finalAnalysis,
          notes: trimmedNotes
        };
      } catch (err) {
        console.error('Failed to confirm meal:', err);
        setError('Failed to save meal');
        return { success: false };
      } finally {
        setSaving(false);
      }
    },
    [agent, pendingMeal]
  );

  // Cancel the pending meal
  const cancelMeal = useCallback(() => {
    setPendingMeal(null);
    setError(null);
  }, []);

  // Log a meal directly from chat (no photo required)
  const logMealFromChat = useCallback(
    async (mealData: ChatMealData): Promise<boolean> => {
      if (!agent) {
        setError('No agent selected');
        return false;
      }

      setSaving(true);
      setError(null);

      try {
        // Create the meal log entry
        const mealLogData: MealLogInsert = {
          agent_id: agent.id,
          meal_type: mealData.mealType,
          description: mealData.description,
          ai_analysis: {
            description: mealData.description,
            mealType: mealData.mealType,
            calories: mealData.calories,
            proteinG: mealData.proteinG,
            carbsG: mealData.carbsG,
            fatG: mealData.fatG,
            confidence: 'medium',
            breakdown: [],
          } as unknown as Record<string, unknown>,
          calories: mealData.calories,
          protein_g: mealData.proteinG,
          carbs_g: mealData.carbsG,
          fat_g: mealData.fatG,
          user_confirmed: true,
        };

        const { error: mealError } = await createMealLog(mealLogData);

        if (mealError) {
          console.error('Failed to create meal log from chat:', mealError);
          setError('Failed to save meal');
          return false;
        }

        // Update daily nutrition
        const persona = agent.persona_json as Record<string, unknown>;
        const nutritionGoals = persona.nutritionGoals as { calories?: number } | undefined;

        const { data: updatedNutrition } = await updateDailyNutrition(
          agent.id,
          mealData.calories,
          mealData.proteinG,
          mealData.carbsG,
          mealData.fatG,
          nutritionGoals?.calories
        );

        if (updatedNutrition) {
          setTodayNutrition(updatedNutrition as DailyNutrition);
        }

        return true;
      } catch (err) {
        console.error('Failed to log meal from chat:', err);
        setError('Failed to save meal');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [agent]
  );

  return {
    pendingMeal,
    analyzing,
    saving,
    error,
    todayNutrition,
    analyzeMeal,
    confirmMeal,
    cancelMeal,
    refreshTodayNutrition,
    logMealFromChat,
  };
}
