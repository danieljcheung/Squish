import { colors } from './colors';

export type AgentType = 'fitness_coach' | 'budget_helper' | 'study_buddy';

export interface AgentTypeConfig {
  id: AgentType;
  name: string;
  description: string;
  color: string;
  icon: string;
  available: boolean;
}

export const agentTypes: Record<AgentType, AgentTypeConfig> = {
  fitness_coach: {
    id: 'fitness_coach',
    name: 'Fitness Coach',
    description: 'Workouts, meal logging, and motivation',
    color: colors.slimeCoach,
    icon: 'dumbbell',
    available: true,
  },
  budget_helper: {
    id: 'budget_helper',
    name: 'Budget Helper',
    description: 'Track spending and savings goals',
    color: colors.slimeBudget,
    icon: 'calculator',
    available: false,
  },
  study_buddy: {
    id: 'study_buddy',
    name: 'Study Buddy',
    description: 'Study schedules and learning support',
    color: colors.slimeStudy,
    icon: 'book',
    available: false,
  },
};

export const coachingStyles = {
  tough_love: {
    id: 'tough_love',
    name: 'Tough Love',
    description: 'No excuses, push through the pain',
  },
  gentle: {
    id: 'gentle',
    name: 'Gentle',
    description: 'Patient, understanding, celebrates small wins',
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Mix of encouragement and accountability',
  },
};
