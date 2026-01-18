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

  if (error) {
    console.error('Error fetching user:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    // Si l'erreur est 406 (Not Acceptable), cela peut indiquer un problème RLS
    // Essayons une approche alternative en utilisant auth.uid() directement
    if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('row-level security')) {
      console.warn('RLS issue detected, user might not exist in users table or RLS is blocking access');
      console.warn('User ID from auth:', user.id);
    }
    return null;
  }

  if (!userData) {
    console.warn('User not found in users table for id:', user.id);
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
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('isCurrentUserAdmin: User not found in users table');
      return false;
    }
    
    const isAdmin = user.role === 'admin';
    console.log('isCurrentUserAdmin:', { userId: user.id, role: user.role, isAdmin });
    return isAdmin;
  } catch (error) {
    console.error('Error in isCurrentUserAdmin:', error);
    return false;
  }
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

