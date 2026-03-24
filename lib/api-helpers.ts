/**
 * Helpers pour les routes API - authentification et clients Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export function getBearerToken(request: NextRequest): string | null {
  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

/**
 * Crée un client Supabase authentifié avec le token utilisateur.
 * RLS s'applique automatiquement.
 */
export function createSupabaseClientWithToken(
  token: string
): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Crée un client Supabase avec la service role (contourne RLS).
 * À utiliser uniquement après validation de l'utilisateur.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
