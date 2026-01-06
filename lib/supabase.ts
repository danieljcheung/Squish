import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

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
