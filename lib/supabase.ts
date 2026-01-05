import 'react-native-url-polyfill/dist/setup';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'squish://auth/callback',
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
