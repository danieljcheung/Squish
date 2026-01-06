import { useState, useEffect, useCallback } from 'react';
import { Agent, AgentMemory } from '@/types';
import {
  getAgent,
  getAgents,
  updateAgent as updateAgentApi,
  deleteAgent as deleteAgentApi,
  getMemories,
  upsertMemory,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(fetchError.message);
      } else {
        setAgent(data as Agent);
      }

      // Also fetch memories
      const { data: memoriesData } = await getMemories(agentId);
      if (memoriesData) {
        setMemories(memoriesData as AgentMemory[]);
      }
    } catch (err) {
      setError('Failed to fetch agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const updateAgent = async (updates: Partial<Agent>) => {
    if (!agentId) return { error: 'No agent ID' };

    const { data, error: updateError } = await updateAgentApi(agentId, {
      name: updates.name,
      persona_json: updates.persona_json,
      settings_json: updates.settings_json,
    });

    if (!updateError && data) {
      setAgent(data as Agent);
    }

    return { data, error: updateError };
  };

  const addMemory = async (key: string, value: string) => {
    if (!agentId) return { error: 'No agent ID' };

    const { data, error: memoryError } = await upsertMemory(agentId, key, value);

    if (!memoryError && data) {
      setMemories((prev) => {
        const existing = prev.findIndex((m) => m.key === key);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data as AgentMemory;
          return updated;
        }
        return [data as AgentMemory, ...prev];
      });
    }

    return { data, error: memoryError };
  };

  const deleteAgent = async () => {
    if (!agentId) return { error: 'No agent ID' };

    const { error: deleteError } = await deleteAgentApi(agentId);
    return { error: deleteError };
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(fetchError.message);
      } else {
        setAgents((data as Agent[]) || []);
      }
    } catch (err) {
      setError('Failed to fetch agents');
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
