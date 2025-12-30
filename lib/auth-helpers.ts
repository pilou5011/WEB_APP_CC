import { supabase } from './supabase';

/**
 * Obtient l'utilisateur connecté avec ses informations (company_id, role)
 */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    return null;
  }

  return userData;
}

/**
 * Obtient le company_id de l'utilisateur connecté
 */
export async function getCurrentUserCompanyId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.company_id || null;
}

/**
 * Vérifie si l'utilisateur connecté est administrateur
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Obtient la session actuelle
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Helper pour obtenir le company_id et lancer une erreur si non disponible
 * À utiliser au début de chaque fonction qui fait des requêtes Supabase
 */
export async function requireCompanyId(): Promise<string> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Non autorisé : company_id manquant');
  }
  return companyId;
}

