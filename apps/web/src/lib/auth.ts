import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error && data.user) {
    try {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        display_name: displayName.trim() || null,
      });
    } catch {
      // Non-fatal — profile row is best-effort
    }
  }
  return { data, error };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

/** Returns the display name stored in user_profiles, or null */
export async function getDisplayName(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', userId)
      .single();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}
