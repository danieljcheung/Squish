import { AgentType } from '@/constants/agents';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  type: AgentType;
  name: string;
  persona_json: PersonaJson;
  settings_json: AgentSettings;
  created_at: string;
}

export interface PersonaJson {
  name: string;
  style: 'tough_love' | 'gentle' | 'balanced';
  user_goal: string;
  slime_color?: 'mint' | 'peach' | 'lavender' | 'skyBlue' | 'coral' | 'lemon' | 'rose' | 'sage';
  target?: string;
  timeline?: string;
  workout_days?: string[];
  workout_location?: 'gym' | 'home';
  equipment?: string[];
  dietary_restrictions?: string[];
  current_fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  // Nutrition tracking
  userMetrics?: UserMetrics;
  nutritionGoals?: NutritionGoals;
  // Water tracking
  daily_water_goal_ml?: number; // default: 2000
  show_water_as_glasses?: boolean; // default: true
}

export interface NotificationTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface WorkoutReminderSettings {
  enabled: boolean;
  days: number[]; // 0=Sunday, 1=Monday, etc.
  time: NotificationTime;
}

export interface AgentSettings {
  notifications_enabled: boolean;
  morning_checkin: {
    enabled: boolean;
    time: NotificationTime;
  };
  meal_reminders: boolean;
  workout_reminders: WorkoutReminderSettings;
  water_reminders: boolean; // Smart water reminders
  timezone: string; // e.g., "America/New_York"
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  agent_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AgentMemory {
  id: string;
  agent_id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface OnboardingAnswer {
  question_id: string;
  answer: string;
}

// ============================================
// MEAL LOGGING TYPES
// ============================================

export interface UserMetrics {
  age: number;
  gender: 'male' | 'female' | 'other';
  weightKg: number;
  heightCm: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface NutritionGoals {
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  goal: 'lose' | 'maintain' | 'gain';
}

export interface MealAnalysis {
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: 'high' | 'medium' | 'low';
  breakdown: Array<{
    item: string;
    calories: number;
    portion: string;
  }>;
  notes?: string;
}

export interface MealLog {
  id: string;
  agent_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photo_url?: string;
  description?: string;
  ai_analysis?: MealAnalysis;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  user_confirmed: boolean;
  created_at: string;
}

export interface DailyNutrition {
  id: string;
  agent_id: string;
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meal_count: number;
  target_calories?: number;
  total_water_ml: number; // Water tracking
  // Workout tracking
  workouts_count: number;
  workout_mins: number;
  updated_at: string;
}

// ============================================
// WATER TRACKING TYPES
// ============================================

export interface WaterLog {
  id: string;
  agent_id: string;
  amount_ml: number;
  created_at: string;
}

export interface WaterPreset {
  id: string;
  label: string;
  amount_ml: number;
  icon?: string;
}

// Default water presets
export const WATER_PRESETS: WaterPreset[] = [
  { id: 'small', label: 'Small glass', amount_ml: 150, icon: '🥛' },
  { id: 'glass', label: 'Glass', amount_ml: 250, icon: '🥤' },
  { id: 'bottle', label: 'Bottle', amount_ml: 500, icon: '🍶' },
  { id: 'large', label: 'Large bottle', amount_ml: 750, icon: '🧴' },
];

// Constants
export const WATER_GLASS_ML = 250;
export const DEFAULT_WATER_GOAL_ML = 2000;

// ============================================
// WORKOUT TRACKING TYPES
// ============================================

export type WorkoutType = 'cardio' | 'strength' | 'flexibility' | 'hiit' | 'walk' | 'other';

export interface WorkoutLog {
  id: string;
  agent_id: string;
  workout_type: WorkoutType;
  duration_mins: number;
  notes?: string;
  created_at: string;
}

// Workout type detection keywords
export const WORKOUT_KEYWORDS: Record<WorkoutType, string[]> = {
  cardio: ['run', 'running', 'ran', 'jog', 'jogging', 'cycling', 'bike', 'biking', 'swim', 'swimming', 'treadmill', 'elliptical', 'rowing'],
  strength: ['weights', 'lifting', 'lifted', 'gym', 'chest', 'back', 'legs', 'arms', 'shoulders', 'bench', 'squat', 'deadlift', 'push', 'pull', 'dumbbell', 'barbell'],
  flexibility: ['yoga', 'stretching', 'stretched', 'pilates', 'mobility'],
  hiit: ['hiit', 'circuit', 'intervals', 'crossfit', 'bootcamp', 'class'],
  walk: ['walk', 'walking', 'walked', 'steps', 'hike', 'hiking'],
  other: [],
};

// Workout type display info
export const WORKOUT_TYPE_INFO: Record<WorkoutType, { label: string; emoji: string }> = {
  cardio: { label: 'Cardio', emoji: '🏃' },
  strength: { label: 'Strength', emoji: '💪' },
  flexibility: { label: 'Flexibility', emoji: '🧘' },
  hiit: { label: 'HIIT', emoji: '🔥' },
  walk: { label: 'Walk', emoji: '🚶' },
  other: { label: 'Workout', emoji: '🏋️' },
};

// ============================================
// WEEKLY SUMMARY TYPES
// ============================================

export type TrendDirection = 'up' | 'down' | 'stable' | 'new';

export interface DailyGoalStatus {
  date: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  caloriesHit: boolean; // within 10% of target
  waterHit: boolean; // 100%+ of target
  workoutDone: boolean;
  totalCalories: number;
  totalWaterMl: number;
  workoutMins: number;
}

export interface WeeklySummary {
  id: string;
  agent_id: string;
  week_start: string; // Monday YYYY-MM-DD
  week_end: string; // Sunday YYYY-MM-DD

  // Meals
  meals_logged: number;
  days_with_meals: number;
  avg_daily_calories: number;
  avg_daily_protein_g: number;
  avg_daily_carbs_g: number;
  avg_daily_fat_g: number;
  days_at_calorie_goal: number;

  // Water
  avg_daily_water_ml: number;
  days_at_water_goal: number;

  // Workouts
  total_workouts: number;
  total_workout_mins: number;
  workout_types_json: Record<string, number>;
  days_with_workouts: number;

  // Trends (vs previous week)
  calories_trend: TrendDirection;
  workouts_trend: TrendDirection;
  water_trend: TrendDirection;

  // Streaks & highlights
  longest_logging_streak: number;
  highlights_json: string[];
  daily_breakdown_json: DailyGoalStatus[];

  is_complete: boolean;
  created_at: string;
  updated_at: string;
}
