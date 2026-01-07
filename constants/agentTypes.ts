import { SlimeColor, SlimeType } from '@/components/slime';

export type AgentTypeId = 'fitness_coach' | 'finance' | 'study_buddy';

export interface AgentTypeConfig {
  id: AgentTypeId;
  name: string;
  description: string;
  slimeType: SlimeType;
  defaultColor: SlimeColor;
  available: boolean;
}

export const AGENT_TYPES: AgentTypeConfig[] = [
  {
    id: 'fitness_coach',
    name: 'Fitness Coach',
    description: 'Workouts, meal tracking, and motivation to hit your goals',
    slimeType: 'fitness_coach',
    defaultColor: 'coral',
    available: true,
  },
  {
    id: 'finance',
    name: 'Finance Buddy',
    description: 'Budget tracking, spending insights, and savings goals',
    slimeType: 'budget_helper',
    defaultColor: 'skyBlue',
    available: false,
  },
  {
    id: 'study_buddy',
    name: 'Study Buddy',
    description: 'Study schedules, quiz prep, and learning support',
    slimeType: 'study_buddy',
    defaultColor: 'lavender',
    available: false,
  },
];

export const getAgentType = (id: AgentTypeId): AgentTypeConfig | undefined => {
  return AGENT_TYPES.find((type) => type.id === id);
};

export const getAvailableAgentTypes = (): AgentTypeConfig[] => {
  return AGENT_TYPES.filter((type) => type.available);
};
