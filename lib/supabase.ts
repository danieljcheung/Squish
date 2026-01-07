import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

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

// Messages
export const getMessages = async (agentId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return { data, error };
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
