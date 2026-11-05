import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Web pages are also rendered on the server, where there is no storage to keep a session in. */
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

/** Give up on a request after 15 s so a weak mobile connection shows an error instead of loading forever. */
const REQUEST_TIMEOUT_MS = 15_000;
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init?.signal?.addEventListener('abort', () => controller.abort());
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

/**
 * `null` when no project is configured (or set EXPO_PUBLIC_SUPABASE_DISABLED=1):
 * the app then runs in local demo mode with sample data held in memory.
 */
export const supabase: SupabaseClient | null =
  url && key && process.env.EXPO_PUBLIC_SUPABASE_DISABLED !== '1'
    ? createClient(url, key, {
        global: { fetch: fetchWithTimeout },
        auth: {
          storage: isServer ? undefined : AsyncStorage,
          persistSession: !isServer,
          autoRefreshToken: !isServer,
          detectSessionInUrl: false,
        },
      })
    : null;

// On phones, only refresh the login token while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const PHOTO_BUCKET = 'review-photos';

export function photoUrl(storagePath: string): string {
  if (!supabase) return storagePath;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
