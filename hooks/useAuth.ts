import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Get initial session and subscribe to auth changes
    setLoading(false);
  }, []);

  const signIn = async (email: string) => {
    // TODO: Implement magic link sign in
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signOut,
  };
}
