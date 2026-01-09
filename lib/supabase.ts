import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { DailyGoalStatus, TrendDirection } from '@/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Debug: Check if env vars are loaded
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key loaded:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

// Custom storage adapter that handles SSR
const ExpoSecureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null; // SSR - return null
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return; // SSR - no-op
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return; // SSR - no-op
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable for web to handle magic link redirects
  },
});

// Types for database operations
export interface AgentInsert {
  user_id: string;
  type: string;
  name: string;
  persona_json: Record<string, unknown>;
  settings_json?: Record<string, unknown>;
}

export interface AgentUpdate {
  name?: string;
  persona_json?: Record<string, unknown>;
  settings_json?: Record<string, unknown>;
}

export interface MessageInsert {
  agent_id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Auth functions
export const signInWithEmail = async (email: string) => {
  // For development with Expo Go, we use localhost which will then redirect
  // For production, use the app's custom scheme
  let redirectUrl: string;

  if (Platform.OS === 'web') {
    redirectUrl = window.location.origin;
  } else if (__DEV__) {
    // In development, use localhost - the tokens will be in the URL
    // We'll handle them when the user manually returns to the app
    redirectUrl = 'http://localhost:8081';
  } else {
    // Production: use custom scheme
    redirectUrl = 'squish://auth/callback';
  }

  console.log('Magic link redirect URL:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Database helpers
export const getAgents = async (userId: string) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getAgent = async (agentId: string) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();
  return { data, error };
};

export const createAgent = async (agent: AgentInsert) => {
  const { data, error } = await supabase
    .from('agents')
    .insert(agent)
    .select()
    .single();
  return { data, error };
};

export const updateAgent = async (agentId: string, updates: AgentUpdate) => {
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select()
    .single();
  return { data, error };
};

export const deleteAgent = async (agentId: string) => {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId);
  return { error };
};

// Messages - fetch newest messages, then reverse for chronological display
export const getMessages = async (agentId: string, limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Reverse to get chronological order (oldest first for display)
  if (data) {
    data.reverse();
  }

  return { data, error };
};

// Get total message count for an agent
export const getMessageCount = async (agentId: string) => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId);

  return { count, error };
};

// Get the last message for an agent
export const getLastMessage = async (agentId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return { data, error };
};

// Get last messages for multiple agents
export const getLastMessagesForAgents = async (agentIds: string[]) => {
  if (agentIds.length === 0) return { data: [], error: null };

  // Get the most recent message for each agent using a subquery approach
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .in('agent_id', agentIds)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  // Group by agent_id and get only the most recent
  const lastMessages: Record<string, any> = {};
  for (const msg of data || []) {
    if (!lastMessages[msg.agent_id]) {
      lastMessages[msg.agent_id] = msg;
    }
  }

  return { data: lastMessages, error: null };
};

export const createMessage = async (message: MessageInsert) => {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  return { data, error };
};

export const updateMessageContent = async (messageId: string, content: string) => {
  console.log('[updateMessageContent] Attempting to update message:', messageId);
  const { data, error, count } = await supabase
    .from('messages')
    .update({ content })
    .eq('id', messageId)
    .select();

  console.log('[updateMessageContent] Result - data:', data, 'count:', count, 'error:', error);

  if (error) {
    return { data: null, error };
  }

  // Return the first item if available
  return { data: data?.[0] || null, error: null };
};

// Agent Memory
export const getMemories = async (agentId: string) => {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false });
  return { data, error };
};

export const upsertMemory = async (
  agentId: string,
  key: string,
  value: string
) => {
  const { data, error } = await supabase
    .from('agent_memory')
    .upsert(
      { agent_id: agentId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'agent_id,key' }
    )
    .select()
    .single();
  return { data, error };
};

// Push Tokens
export const savePushToken = async (
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web'
) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    )
    .select()
    .single();
  return { data, error };
};

export const deletePushToken = async (token: string) => {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('token', token);
  return { error };
};

export const getPushTokensForUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

// Agent Settings
export const updateAgentSettings = async (
  agentId: string,
  settings: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from('agents')
    .update({ settings_json: settings })
    .eq('id', agentId)
    .select()
    .single();
  return { data, error };
};

// ============================================
// MEAL LOGGING
// ============================================

export interface MealLogInsert {
  agent_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photo_url?: string;
  description?: string;
  ai_analysis?: Record<string, unknown>;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  user_confirmed?: boolean;
}

// Create a meal log entry
export const createMealLog = async (meal: MealLogInsert) => {
  const { data, error } = await supabase
    .from('meal_logs')
    .insert(meal)
    .select()
    .single();
  return { data, error };
};

// Get meal logs for a specific date
export const getMealLogsForDate = async (agentId: string, date: string) => {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  return { data, error };
};

// Get today's nutrition summary for an agent
export const getTodayNutrition = async (agentId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_nutrition')
    .select('*')
    .eq('agent_id', agentId)
    .eq('date', today)
    .single();

  return { data, error };
};

// Update daily nutrition (upsert - creates if not exists, updates if exists)
export const updateDailyNutrition = async (
  agentId: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  targetCalories?: number
) => {
  const today = new Date().toISOString().split('T')[0];

  // First, get current values
  const { data: existing } = await getTodayNutrition(agentId);

  const newValues = {
    agent_id: agentId,
    date: today,
    total_calories: (existing?.total_calories || 0) + calories,
    total_protein_g: (existing?.total_protein_g || 0) + protein,
    total_carbs_g: (existing?.total_carbs_g || 0) + carbs,
    total_fat_g: (existing?.total_fat_g || 0) + fat,
    meal_count: (existing?.meal_count || 0) + 1,
    target_calories: targetCalories || existing?.target_calories,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_nutrition')
    .upsert(newValues, { onConflict: 'agent_id,date' })
    .select()
    .single();

  return { data, error };
};

// Upload meal photo to Supabase Storage
export const uploadMealPhoto = async (
  agentId: string,
  base64Data: string,
  mimeType: string = 'image/jpeg'
) => {
  console.log('uploadMealPhoto called', { agentId, base64Length: base64Data?.length, mimeType });

  try {
    const fileName = `${agentId}/${Date.now()}.jpg`;
    console.log('Filename:', fileName);

    // Convert base64 to ArrayBuffer
    console.log('Importing base64-arraybuffer...');
    const { decode } = await import('base64-arraybuffer');
    console.log('Decoding base64...');
    const arrayBuffer = decode(base64Data);
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

    console.log('Uploading to Supabase Storage...');
    const { data, error } = await supabase.storage
      .from('meal-photos')
      .upload(fileName, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { data: null, error };
    }

    console.log('Upload successful, getting public URL...');
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('meal-photos')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);
    return { data: { path: data.path, publicUrl: urlData.publicUrl }, error: null };
  } catch (err) {
    console.error('uploadMealPhoto exception:', err);
    return { data: null, error: err as Error };
  }
};

// ============================================
// WATER TRACKING
// ============================================

export interface WaterLogInsert {
  agent_id: string;
  amount_ml: number;
}

// Create a water log entry
export const createWaterLog = async (agentId: string, amountMl: number) => {
  const { data, error } = await supabase
    .from('water_logs')
    .insert({ agent_id: agentId, amount_ml: amountMl })
    .select()
    .single();
  return { data, error };
};

// Get water logs for today
export const getTodayWaterLogs = async (agentId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  return { data, error };
};

// Get water logs for a specific date
export const getWaterLogsForDate = async (agentId: string, date: string) => {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  return { data, error };
};

// Update daily water total (adds to existing total)
export const updateDailyWaterTotal = async (agentId: string, amountMl: number, targetCalories?: number) => {
  const today = new Date().toISOString().split('T')[0];

  // First, get current values
  const { data: existing } = await getTodayNutrition(agentId);

  const newValues = {
    agent_id: agentId,
    date: today,
    total_calories: existing?.total_calories || 0,
    total_protein_g: existing?.total_protein_g || 0,
    total_carbs_g: existing?.total_carbs_g || 0,
    total_fat_g: existing?.total_fat_g || 0,
    meal_count: existing?.meal_count || 0,
    total_water_ml: (existing?.total_water_ml || 0) + amountMl,
    target_calories: targetCalories || existing?.target_calories,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_nutrition')
    .upsert(newValues, { onConflict: 'agent_id,date' })
    .select()
    .single();

  return { data, error };
};

// Delete a water log entry (for undo functionality)
export const deleteWaterLog = async (logId: string) => {
  const { error } = await supabase
    .from('water_logs')
    .delete()
    .eq('id', logId);
  return { error };
};

// ============================================
// WORKOUT TRACKING
// ============================================

export interface WorkoutLogInsert {
  agent_id: string;
  workout_type: 'cardio' | 'strength' | 'flexibility' | 'hiit' | 'walk' | 'other';
  duration_mins: number;
  notes?: string;
}

// Create a workout log entry
export const createWorkoutLog = async (workout: WorkoutLogInsert) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .insert(workout)
    .select()
    .single();
  return { data, error };
};

// Get workout logs for today
export const getTodayWorkoutLogs = async (agentId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  return { data, error };
};

// Get workout logs for a date range (for weekly stats)
export const getWorkoutLogsForDateRange = async (
  agentId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lte('created_at', `${endDate}T23:59:59.999Z`)
    .order('created_at', { ascending: false });

  return { data, error };
};

// Get recent workout logs (for "show me my workouts")
export const getRecentWorkoutLogs = async (agentId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
};

// Get the last workout log
export const getLastWorkoutLog = async (agentId: string) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return { data, error };
};

// Update daily workout totals
export const updateDailyWorkoutTotal = async (
  agentId: string,
  durationMins: number
) => {
  const today = new Date().toISOString().split('T')[0];

  // First, get current values
  const { data: existing } = await getTodayNutrition(agentId);

  const newValues = {
    agent_id: agentId,
    date: today,
    total_calories: existing?.total_calories || 0,
    total_protein_g: existing?.total_protein_g || 0,
    total_carbs_g: existing?.total_carbs_g || 0,
    total_fat_g: existing?.total_fat_g || 0,
    meal_count: existing?.meal_count || 0,
    total_water_ml: existing?.total_water_ml || 0,
    target_calories: existing?.target_calories,
    workouts_count: (existing?.workouts_count || 0) + 1,
    workout_mins: (existing?.workout_mins || 0) + durationMins,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_nutrition')
    .upsert(newValues, { onConflict: 'agent_id,date' })
    .select()
    .single();

  return { data, error };
};

// Get weekly workout stats
export const getWeeklyWorkoutStats = async (agentId: string) => {
  // Get start of week (Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const startDate = startOfWeek.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const { data, error } = await getWorkoutLogsForDateRange(agentId, startDate, endDate);

  if (error || !data) {
    return { data: null, error };
  }

  const totalWorkouts = data.length;
  const totalMins = data.reduce((sum, w) => sum + (w.duration_mins || 0), 0);

  // Calculate streak (consecutive days with workouts)
  const workoutDates = new Set(
    data.map((w) => new Date(w.created_at).toISOString().split('T')[0])
  );

  let streak = 0;
  const checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (workoutDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    data: {
      totalWorkouts,
      totalMins,
      streak,
      workouts: data,
    },
    error: null,
  };
};

// ============================================
// WEEKLY SUMMARIES
// ============================================

export interface WeeklySummaryInsert {
  agent_id: string;
  week_start: string;
  week_end: string;
  meals_logged?: number;
  days_with_meals?: number;
  avg_daily_calories?: number;
  avg_daily_protein_g?: number;
  avg_daily_carbs_g?: number;
  avg_daily_fat_g?: number;
  days_at_calorie_goal?: number;
  avg_daily_water_ml?: number;
  days_at_water_goal?: number;
  total_workouts?: number;
  total_workout_mins?: number;
  workout_types_json?: Record<string, number>;
  days_with_workouts?: number;
  calories_trend?: TrendDirection;
  workouts_trend?: TrendDirection;
  water_trend?: TrendDirection;
  longest_logging_streak?: number;
  highlights_json?: string[];
  daily_breakdown_json?: DailyGoalStatus[];
  is_complete?: boolean;
}

// Get cached weekly summary
export const getWeeklySummary = async (agentId: string, weekStart: string) => {
  const { data, error } = await supabase
    .from('weekly_summaries')
    .select('*')
    .eq('agent_id', agentId)
    .eq('week_start', weekStart)
    .single();

  return { data, error };
};

// Upsert weekly summary (create or update)
export const upsertWeeklySummary = async (summary: WeeklySummaryInsert) => {
  const { data, error } = await supabase
    .from('weekly_summaries')
    .upsert(
      {
        ...summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agent_id,week_start' }
    )
    .select()
    .single();

  return { data, error };
};

// Get daily nutrition data for a date range
export const getDailyNutritionRange = async (
  agentId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('daily_nutrition')
    .select('*')
    .eq('agent_id', agentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  return { data, error };
};

// Get previous week's summary for trend comparison
export const getPreviousWeeklySummary = async (
  agentId: string,
  currentWeekStart: string
) => {
  // Calculate previous week's Monday
  const currentMonday = new Date(currentWeekStart);
  const previousMonday = new Date(currentMonday);
  previousMonday.setDate(currentMonday.getDate() - 7);
  const previousWeekStart = previousMonday.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_summaries')
    .select('*')
    .eq('agent_id', agentId)
    .eq('week_start', previousWeekStart)
    .single();

  return { data, error };
};

// Get meal logs for a date range
export const getMealLogsForDateRange = async (
  agentId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lte('created_at', `${endDate}T23:59:59.999Z`)
    .order('created_at', { ascending: true });

  return { data, error };
};

// ============================================
// FINANCE TRACKING
// ============================================

export interface ExpenseInsert {
  agent_id: string;
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
}

export interface IncomeInsert {
  agent_id: string;
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
}

export interface SavingsGoalInsert {
  agent_id: string;
  name: string;
  icon?: string;
  target_amount: number;
  target_date?: string;
  auto_allocate_percentage?: number;
}

export interface WishlistItemInsert {
  agent_id: string;
  name: string;
  estimated_cost: number;
  notes?: string;
}

// Create an expense entry
export const createExpense = async (expense: ExpenseInsert) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();
  return { data, error };
};

// Get expenses for today
export const getTodayExpenses = async (agentId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('agent_id', agentId)
    .eq('expense_date', today)
    .order('created_at', { ascending: false });

  return { data, error };
};

// Get expenses for this month
export const getMonthExpenses = async (agentId: string) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('agent_id', agentId)
    .gte('expense_date', startOfMonth)
    .lte('expense_date', endOfMonth)
    .order('expense_date', { ascending: false });

  return { data, error };
};

// Get expenses by category for month
export const getMonthExpensesByCategory = async (agentId: string) => {
  const { data, error } = await getMonthExpenses(agentId);

  if (error || !data) return { data: null, error };

  // Group by category
  const byCategory: Record<string, number> = {};
  for (const expense of data) {
    const cat = expense.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(expense.amount);
  }

  return { data: byCategory, error: null };
};

// Get expenses for a specific category this month
export const getCategoryExpenses = async (agentId: string, category: string) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('agent_id', agentId)
    .eq('category', category)
    .gte('expense_date', startOfMonth)
    .lte('expense_date', endOfMonth)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  return { data, error };
};

// Get expenses for this week (Monday to Sunday)
export const getWeekExpenses = async (agentId: string) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Calculate Monday of current week (0 = Sunday, so adjust)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + mondayOffset);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  // Sunday is end of week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('agent_id', agentId)
    .gte('expense_date', startOfWeekStr)
    .lte('expense_date', endOfWeekStr)
    .order('expense_date', { ascending: false });

  return { data, error };
};

// Get income for this week (Monday to Sunday)
export const getWeekIncome = async (agentId: string) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + mondayOffset);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('income')
    .select('*')
    .eq('agent_id', agentId)
    .gte('income_date', startOfWeekStr)
    .lte('income_date', endOfWeekStr)
    .order('income_date', { ascending: false });

  return { data, error };
};

// Create an income entry
export const createIncome = async (income: IncomeInsert) => {
  const { data, error } = await supabase
    .from('income')
    .insert(income)
    .select()
    .single();
  return { data, error };
};

// Get income for this month
export const getMonthIncome = async (agentId: string) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('income')
    .select('*')
    .eq('agent_id', agentId)
    .gte('income_date', startOfMonth)
    .lte('income_date', endOfMonth)
    .order('income_date', { ascending: false });

  return { data, error };
};

// Get today's finance summary
export const getTodayFinance = async (agentId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_finance')
    .select('*')
    .eq('agent_id', agentId)
    .eq('date', today)
    .single();

  return { data, error };
};

// Get savings goals (limit to 5 active)
export const getSavingsGoals = async (agentId: string) => {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('agent_id', agentId)
    .is('completed_at', null)
    .order('created_at', { ascending: true })
    .limit(5);

  return { data, error };
};

// Create a savings goal
export const createSavingsGoal = async (goal: SavingsGoalInsert) => {
  // Check if user already has 5 active goals
  const { data: existing } = await getSavingsGoals(goal.agent_id);
  if (existing && existing.length >= 5) {
    return { data: null, error: new Error('Maximum 5 active savings goals allowed') };
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .insert(goal)
    .select()
    .single();
  return { data, error };
};

// Update savings goal (add contribution)
export const updateSavingsGoal = async (
  goalId: string,
  updates: { current_amount?: number; auto_allocate_percentage?: number }
) => {
  const { data, error } = await supabase
    .from('savings_goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();
  return { data, error };
};

// Add contribution to a savings goal
export const addSavingsContribution = async (goalId: string, amount: number) => {
  // First get current goal
  const { data: goal, error: goalError } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (goalError || !goal) {
    return { data: null, error: goalError || new Error('Goal not found') };
  }

  const newAmount = parseFloat(goal.current_amount) + amount;
  const updates: Record<string, unknown> = { current_amount: newAmount };

  // Check if goal is now complete
  if (newAmount >= parseFloat(goal.target_amount)) {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  return { data, error };
};

// Update savings goal details
export const updateSavingsGoalDetails = async (
  goalId: string,
  updates: { name?: string; icon?: string; target_amount?: number; target_date?: string | null }
) => {
  const { data, error } = await supabase
    .from('savings_goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();
  return { data, error };
};

// Delete a savings goal
export const deleteSavingsGoal = async (goalId: string) => {
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId);
  return { error };
};

// Get wishlist items
export const getWishlist = async (agentId: string) => {
  const { data, error } = await supabase
    .from('wishlist')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  return { data, error };
};

// Add wishlist item
export const addWishlistItem = async (item: WishlistItemInsert) => {
  const { data, error } = await supabase
    .from('wishlist')
    .insert(item)
    .select()
    .single();
  return { data, error };
};

// Remove wishlist item
export const removeWishlistItem = async (itemId: string) => {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('id', itemId);
  return { error };
};

// Get monthly budget summary
export const getMonthlyBudgetSummary = async (agentId: string) => {
  const [expensesResult, incomeResult] = await Promise.all([
    getMonthExpenses(agentId),
    getMonthIncome(agentId),
  ]);

  if (expensesResult.error || incomeResult.error) {
    return {
      data: null,
      error: expensesResult.error || incomeResult.error,
    };
  }

  const totalSpent = (expensesResult.data || []).reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  );
  const totalIncome = (incomeResult.data || []).reduce(
    (sum, i) => sum + parseFloat(i.amount),
    0
  );

  // Group expenses by category
  const byCategory: Record<string, number> = {};
  for (const expense of expensesResult.data || []) {
    const cat = expense.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(expense.amount);
  }

  return {
    data: {
      totalSpent,
      totalIncome,
      remaining: totalIncome - totalSpent,
      expenseCount: expensesResult.data?.length || 0,
      incomeCount: incomeResult.data?.length || 0,
      byCategory,
    },
    error: null,
  };
};

// Get weekly budget summary
export const getWeeklyBudgetSummary = async (agentId: string) => {
  const [expensesResult, incomeResult] = await Promise.all([
    getWeekExpenses(agentId),
    getWeekIncome(agentId),
  ]);

  if (expensesResult.error || incomeResult.error) {
    return {
      data: null,
      error: expensesResult.error || incomeResult.error,
    };
  }

  const totalSpent = (expensesResult.data || []).reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  );
  const totalIncome = (incomeResult.data || []).reduce(
    (sum, i) => sum + parseFloat(i.amount),
    0
  );

  // Group expenses by category
  const byCategory: Record<string, number> = {};
  for (const expense of expensesResult.data || []) {
    const cat = expense.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(expense.amount);
  }

  // Calculate daily average (days elapsed in week)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysElapsed = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday = 7, Monday = 1, etc.
  const dailyAverage = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

  return {
    data: {
      totalSpent,
      totalIncome,
      remaining: totalIncome - totalSpent,
      expenseCount: expensesResult.data?.length || 0,
      incomeCount: incomeResult.data?.length || 0,
      byCategory,
      dailyAverage,
    },
    error: null,
  };
};

// ============================================
// BILLS & SUBSCRIPTIONS
// ============================================

export type BillFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringBillInsert {
  agent_id: string;
  name: string;
  icon?: string;
  amount: number;
  currency?: string;
  category?: string;
  frequency: BillFrequency;
  due_day: number; // Day of month (1-31), day of week (0-6 for weekly), or day of year
  reminder_days_before?: number;
  auto_log?: boolean;
  is_subscription?: boolean;
}

export interface RecurringBillUpdate {
  name?: string;
  icon?: string;
  amount?: number;
  category?: string;
  frequency?: BillFrequency;
  due_day?: number;
  reminder_days_before?: number;
  auto_log?: boolean;
  is_subscription?: boolean;
  is_active?: boolean;
  last_paid_date?: string;
  next_due_date?: string;
}

// Calculate next due date based on frequency and due_day
function calculateNextDueDate(frequency: BillFrequency, dueDay: number, fromDate?: Date): string {
  const today = fromDate || new Date();
  let nextDue: Date;

  if (frequency === 'weekly') {
    // dueDay is 0-6 (Sunday-Saturday)
    const currentDay = today.getDay();
    let daysUntil = dueDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    nextDue = new Date(today);
    nextDue.setDate(today.getDate() + daysUntil);
  } else if (frequency === 'monthly') {
    // dueDay is 1-31
    nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (nextDue <= today) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
    // Handle months with fewer days
    if (nextDue.getDate() !== dueDay) {
      nextDue = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0);
    }
  } else {
    // yearly - dueDay is encoded as MMDD (e.g., 315 = March 15, 1225 = December 25)
    let month = 0; // January (0-indexed)
    let day = dueDay;

    if (dueDay > 100) {
      // Decode MMDD format
      month = Math.floor(dueDay / 100) - 1; // Convert to 0-indexed month
      day = dueDay % 100;
    }

    nextDue = new Date(today.getFullYear(), month, day);
    if (nextDue <= today) {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    }
  }

  return nextDue.toISOString().split('T')[0];
}

// Create a recurring bill
export const createRecurringBill = async (bill: RecurringBillInsert) => {
  const nextDueDate = calculateNextDueDate(bill.frequency, bill.due_day);

  const { data, error } = await supabase
    .from('recurring_bills')
    .insert({
      ...bill,
      next_due_date: nextDueDate,
    })
    .select()
    .single();
  return { data, error };
};

// Get all active bills for an agent
export const getRecurringBills = async (agentId: string) => {
  const { data, error } = await supabase
    .from('recurring_bills')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });
  return { data, error };
};

// Get upcoming bills (due within N days)
export const getUpcomingBills = async (agentId: string, daysAhead: number = 7) => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('recurring_bills')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .lte('next_due_date', futureDate.toISOString().split('T')[0])
    .order('next_due_date', { ascending: true });
  return { data, error };
};

// Get bills due today
export const getBillsDueToday = async (agentId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('recurring_bills')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .eq('next_due_date', today);
  return { data, error };
};

// Update a bill
export const updateRecurringBill = async (billId: string, updates: RecurringBillUpdate) => {
  // If due_day or frequency changed, recalculate next_due_date
  if (updates.due_day !== undefined || updates.frequency !== undefined) {
    // Get current bill to fill in missing values
    const { data: currentBill } = await supabase
      .from('recurring_bills')
      .select('frequency, due_day')
      .eq('id', billId)
      .single();

    if (currentBill) {
      const frequency = updates.frequency ?? currentBill.frequency;
      const dueDay = updates.due_day ?? currentBill.due_day;
      const nextDueDate = calculateNextDueDate(frequency, dueDay);
      updates.next_due_date = nextDueDate;
    }
  }

  const { data, error } = await supabase
    .from('recurring_bills')
    .update(updates)
    .eq('id', billId)
    .select()
    .single();
  return { data, error };
};

// Mark bill as paid and update next due date
export const markBillPaid = async (billId: string, paidDate?: string) => {
  // First get the bill to calculate next due date
  const { data: bill, error: billError } = await supabase
    .from('recurring_bills')
    .select('*')
    .eq('id', billId)
    .single();

  if (billError || !bill) {
    return { data: null, error: billError || new Error('Bill not found') };
  }

  const today = paidDate || new Date().toISOString().split('T')[0];
  const nextDue = calculateNextDueDate(
    bill.frequency,
    bill.due_day,
    new Date(bill.next_due_date)
  );

  // Move next_due_date forward
  const { data, error } = await supabase
    .from('recurring_bills')
    .update({
      last_paid_date: today,
      next_due_date: nextDue,
    })
    .eq('id', billId)
    .select()
    .single();

  return { data, error };
};

// Soft delete a bill (set inactive)
export const deleteRecurringBill = async (billId: string) => {
  const { error } = await supabase
    .from('recurring_bills')
    .update({ is_active: false })
    .eq('id', billId);
  return { error };
};

// Pause/unpause a bill
export const toggleBillActive = async (billId: string, isActive: boolean) => {
  const { data, error } = await supabase
    .from('recurring_bills')
    .update({ is_active: isActive })
    .eq('id', billId)
    .select()
    .single();
  return { data, error };
};

// Get bills that need reminders today
export const getBillsNeedingReminder = async (agentId: string) => {
  const today = new Date();
  const bills: any[] = [];

  // Get all active bills
  const { data, error } = await getRecurringBills(agentId);
  if (error || !data) return { data: null, error };

  for (const bill of data) {
    if (!bill.reminder_days_before || bill.reminder_days_before === 0) continue;

    const dueDate = new Date(bill.next_due_date);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(dueDate.getDate() - bill.reminder_days_before);

    // Check if today is the reminder day
    if (reminderDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
      bills.push(bill);
    }
  }

  return { data: bills, error: null };
};

// Get total monthly bills amount
export const getMonthlyBillsTotal = async (agentId: string) => {
  const { data, error } = await getRecurringBills(agentId);
  if (error || !data) return { data: null, error };

  let monthlyTotal = 0;
  for (const bill of data) {
    if (bill.frequency === 'weekly') {
      monthlyTotal += parseFloat(bill.amount) * 4.33; // Average weeks per month
    } else if (bill.frequency === 'monthly') {
      monthlyTotal += parseFloat(bill.amount);
    } else if (bill.frequency === 'yearly') {
      monthlyTotal += parseFloat(bill.amount) / 12;
    }
  }

  const subscriptionsTotal = data
    .filter(b => b.is_subscription)
    .reduce((sum, b) => {
      if (b.frequency === 'monthly') return sum + parseFloat(b.amount);
      if (b.frequency === 'yearly') return sum + parseFloat(b.amount) / 12;
      return sum;
    }, 0);

  return {
    data: {
      monthlyTotal,
      subscriptionsTotal,
      billsCount: data.length,
      subscriptionsCount: data.filter(b => b.is_subscription).length,
    },
    error: null,
  };
};

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

// Delete all user data (agents, messages, etc.)
// Note: This deletes user data but not the auth user itself
// (that requires admin privileges or Edge Function)
export const deleteUserAccountData = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: userError || new Error('No user found') };
    }

    // Delete in order respecting foreign key constraints
    // 1. Delete push tokens
    const { error: pushError } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', user.id);
    if (pushError) console.error('Error deleting push tokens:', pushError);

    // 2. Get all agent IDs for this user
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id);

    if (agents && agents.length > 0) {
      const agentIds = agents.map(a => a.id);

      // 3. Delete messages for all agents
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .in('agent_id', agentIds);
      if (msgError) console.error('Error deleting messages:', msgError);

      // 4. Delete agent memory
      const { error: memError } = await supabase
        .from('agent_memory')
        .delete()
        .in('agent_id', agentIds);
      if (memError) console.error('Error deleting agent memory:', memError);

      // 5. Delete meal logs
      const { error: mealError } = await supabase
        .from('meal_logs')
        .delete()
        .in('agent_id', agentIds);
      if (mealError) console.error('Error deleting meal logs:', mealError);

      // 6. Delete water logs
      const { error: waterError } = await supabase
        .from('water_logs')
        .delete()
        .in('agent_id', agentIds);
      if (waterError) console.error('Error deleting water logs:', waterError);

      // 7. Delete workout logs
      const { error: workoutError } = await supabase
        .from('workout_logs')
        .delete()
        .in('agent_id', agentIds);
      if (workoutError) console.error('Error deleting workout logs:', workoutError);

      // 8. Delete daily nutrition
      const { error: nutritionError } = await supabase
        .from('daily_nutrition')
        .delete()
        .in('agent_id', agentIds);
      if (nutritionError) console.error('Error deleting daily nutrition:', nutritionError);

      // 9. Delete weekly summaries
      const { error: summaryError } = await supabase
        .from('weekly_summaries')
        .delete()
        .in('agent_id', agentIds);
      if (summaryError) console.error('Error deleting weekly summaries:', summaryError);

      // 10. Delete agents
      const { error: agentError } = await supabase
        .from('agents')
        .delete()
        .eq('user_id', user.id);
      if (agentError) console.error('Error deleting agents:', agentError);
    }

    // 11. Delete shared insights
    const { error: insightError } = await supabase
      .from('agent_shared_insights')
      .delete()
      .eq('user_id', user.id);
    if (insightError) console.error('Error deleting shared insights:', insightError);

    return { error: null };
  } catch (error) {
    console.error('deleteUserAccountData error:', error);
    return { error: error as Error };
  }
};

// ============================================
// CROSS-AGENT SHARED INSIGHTS
// ============================================

export interface SharedInsightInsert {
  user_id: string;
  source_agent_id: string;
  source_agent_type: string;
  source_agent_name: string;
  insight_type: string;
  insight_data: Record<string, unknown>;
  expires_at: string;
}

// Post a new insight from an agent
export const postSharedInsight = async (insight: SharedInsightInsert) => {
  const { data, error } = await supabase
    .from('agent_shared_insights')
    .insert(insight)
    .select()
    .single();
  return { data, error };
};

// Get insights from other agents (excluding the current agent)
export const getInsightsForAgent = async (userId: string, excludeAgentId: string) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('agent_shared_insights')
    .select('*')
    .eq('user_id', userId)
    .neq('source_agent_id', excludeAgentId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(10);
  return { data, error };
};

// Get all recent insights for a user (for debugging/admin)
export const getAllUserInsights = async (userId: string) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('agent_shared_insights')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });
  return { data, error };
};

// Delete expired insights for a user
export const cleanupExpiredInsights = async (userId: string) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('agent_shared_insights')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', now);
  return { error };
};

// Delete all insights from a specific agent (when agent is deleted)
export const deleteAgentInsights = async (agentId: string) => {
  const { error } = await supabase
    .from('agent_shared_insights')
    .delete()
    .eq('source_agent_id', agentId);
  return { error };
};
