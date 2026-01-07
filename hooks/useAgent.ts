import { useState, useEffect, useCallback } from 'react';
import { Agent, AgentMemory, Message } from '@/types';
import {
  getAgent,
  getAgents,
  updateAgent as updateAgentApi,
  deleteAgent as deleteAgentApi,
  getMemories,
  upsertMemory,
  getLastMessagesForAgents,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { parseError, AppError, ErrorType } from '@/lib/errors';

// Type for agent with last message info
export interface AgentWithLastMessage extends Agent {
  lastMessage?: Message;
}

export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getAgent(agentId);
      if (fetchError) {
        const appError = parseError(fetchError);
        setError(appError);
        return;
      }
      setAgent(data as Agent);

      // Also fetch memories
      const { data: memoriesData, error: memoriesError } = await getMemories(agentId);
      if (memoriesError) {
        console.error('Failed to fetch memories:', memoriesError);
      } else if (memoriesData) {
        setMemories(memoriesData as AgentMemory[]);
      }
    } catch (err) {
      const appError = parseError(err);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const updateAgent = async (updates: Partial<Agent>): Promise<{ data?: Agent; error?: AppError }> => {
    if (!agentId) {
      return { error: { type: ErrorType.VALIDATION, message: 'No agent ID', retryable: false } };
    }

    try {
      const { data, error: updateError } = await updateAgentApi(agentId, {
        name: updates.name,
        persona_json: updates.persona_json,
        settings_json: updates.settings_json,
      });

      if (updateError) {
        return { error: parseError(updateError) };
      }

      if (data) {
        setAgent(data as Agent);
        return { data: data as Agent };
      }

      return {};
    } catch (err) {
      return { error: parseError(err) };
    }
  };

  const addMemory = async (key: string, value: string): Promise<{ data?: AgentMemory; error?: AppError }> => {
    if (!agentId) {
      return { error: { type: ErrorType.VALIDATION, message: 'No agent ID', retryable: false } };
    }

    try {
      const { data, error: memoryError } = await upsertMemory(agentId, key, value);

      if (memoryError) {
        return { error: parseError(memoryError) };
      }

      if (data) {
        setMemories((prev) => {
          const existing = prev.findIndex((m) => m.key === key);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data as AgentMemory;
            return updated;
          }
          return [data as AgentMemory, ...prev];
        });
        return { data: data as AgentMemory };
      }

      return {};
    } catch (err) {
      return { error: parseError(err) };
    }
  };

  const deleteAgent = async (): Promise<{ error?: AppError }> => {
    if (!agentId) {
      return { error: { type: ErrorType.VALIDATION, message: 'No agent ID', retryable: false } };
    }

    try {
      const { error: deleteError } = await deleteAgentApi(agentId);
      if (deleteError) {
        return { error: parseError(deleteError) };
      }
      return {};
    } catch (err) {
      return { error: parseError(err) };
    }
  };

  return {
    agent,
    memories,
    loading,
    error,
    refetch: fetchAgent,
    updateAgent,
    addMemory,
    deleteAgent,
  };
}

export function useAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!user) {
      setAgents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getAgents(user.id);
      if (fetchError) {
        const appError = parseError(fetchError);
        setError(appError);
        return;
      }

      const agentsList = (data as Agent[]) || [];

      // Fetch last messages for all agents
      if (agentsList.length > 0) {
        const agentIds = agentsList.map((a) => a.id);
        const { data: lastMessages } = await getLastMessagesForAgents(agentIds);

        // Merge agents with their last messages
        const agentsWithMessages: AgentWithLastMessage[] = agentsList.map((agent) => ({
          ...agent,
          lastMessage: lastMessages?.[agent.id] as Message | undefined,
        }));

        setAgents(agentsWithMessages);
      } else {
        setAgents([]);
      }
    } catch (err) {
      const appError = parseError(err);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
  };
}
