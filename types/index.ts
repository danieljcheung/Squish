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

export interface AgentSettings {
  notifications_enabled: boolean;
  morning_checkin: boolean;
  evening_checkin: boolean;
  meal_reminders: boolean;
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
