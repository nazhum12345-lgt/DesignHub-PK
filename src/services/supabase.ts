// ==============================================================================
// DESIGNHUB PK — Frontend Supabase Client & Authentication Service
// Connects to project https://vrmopkszhyotytfknjrw.supabase.co
// Provides Supabase Auth, customer profile persistence, and data hooks.
// ==============================================================================

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://vrmopkszhyotytfknjrw.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_Yz4NZvZ2vl6Yi1MoYH1kgA_g-HX1d54';

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) return clientInstance;
  clientInstance = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  return clientInstance;
}

export const supabase = getSupabaseClient();

/**
 * Customer Sign Up with Supabase Auth
 */
export async function supabaseSignUp(
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || '',
        },
      },
    });

    if (error) {
      return { user: null, session: null, error };
    }

    // Try upserting customer profile table if available
    if (data.user) {
      try {
        await supabase.from('customer_profiles').upsert(
          {
            id: data.user.id,
            name,
            email,
            phone: phone || '',
            wishlist: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch {
        // Table might not be migrated yet; metadata on user is preserved
      }
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

/**
 * Customer Sign In with Supabase Auth
 */
export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { user: null, session: null, error };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

/**
 * Customer Sign Out from Supabase Auth
 */
export async function supabaseSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

/**
 * Get active session
 */
export async function supabaseGetSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to Supabase Auth state changes
 */
export function onSupabaseAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  try {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return authListener?.subscription;
  } catch {
    return null;
  }
}
