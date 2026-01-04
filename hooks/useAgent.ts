import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent, AgentMemory } from '@/types';

export function useAgent(agentId: string) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch agent and memories from Supabase
    setLoading(false);
  }, [agentId]);

  const updateAgent = async (updates: Partial<Agent>) => {
    // TODO: Update agent in Supabase
  };

  const addMemory = async (key: string, value: string) => {
    // TODO: Add or update memory in Supabase
  };

  const deleteAgent = async () => {
    // TODO: Delete agent from Supabase
  };

  return {
    agent,
    memories,
    loading,
    updateAgent,
    addMemory,
    deleteAgent,
  };
}

export function useAgents(userId: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch all agents for user from Supabase
    setLoading(false);
  }, [userId]);

  const createAgent = async (agentData: Partial<Agent>) => {
    // TODO: Create new agent in Supabase
  };

  return {
    agents,
    loading,
    createAgent,
  };
}
