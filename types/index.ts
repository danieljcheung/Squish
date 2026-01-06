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
  target?: string;
  timeline?: string;
  workout_days?: string[];
  workout_location?: 'gym' | 'home';
  equipment?: string[];
  dietary_restrictions?: string[];
  current_fitness_level?: 'beginner' | 'intermediate' | 'advanced';
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
