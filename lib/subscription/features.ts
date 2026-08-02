import type { SubscriptionPlan } from './types';

/**
 * Catalogue central des fonctionnalités de l'application.
 * Pour restreindre une nouvelle fonctionnalité à Gold uniquement :
 * définir son entrée dans FEATURE_MIN_PLAN à 'gold'.
 */
export const FEATURES = {
  CLIENTS: 'clients',
  CLIENT_INFO: 'client_info',
  PRODUCTS: 'products',
  LIBRARY: 'library',
  INVOICING_DEPOSIT: 'invoicing_deposit',
  INVOICING_DIRECT: 'invoicing_direct',
  STOCK_MANAGEMENT: 'stock_management',
  DOCUMENTS: 'documents',
  CREDIT_NOTES: 'credit_notes',
  PDF_GENERATION: 'pdf_generation',
  EMAIL_DOCUMENTS: 'email_documents',
  TOURS_CALENDAR: 'tours_calendar',
  USER_MANAGEMENT: 'user_management',
  COMPANY_PROFILE: 'company_profile',
  DELIVERY_NOTES: 'delivery_notes',
  DASHBOARD: 'dashboard',
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * Formule minimale requise pour accéder à chaque fonctionnalité.
 * Toutes les fonctionnalités actuelles sont en « standard » : aucune restriction pour l'instant.
 */
export const FEATURE_MIN_PLAN: Record<Feature, SubscriptionPlan> = {
  [FEATURES.CLIENTS]: 'standard',
  [FEATURES.CLIENT_INFO]: 'standard',
  [FEATURES.PRODUCTS]: 'standard',
  [FEATURES.LIBRARY]: 'standard',
  [FEATURES.INVOICING_DEPOSIT]: 'standard',
  [FEATURES.INVOICING_DIRECT]: 'standard',
  [FEATURES.STOCK_MANAGEMENT]: 'standard',
  [FEATURES.DOCUMENTS]: 'standard',
  [FEATURES.CREDIT_NOTES]: 'standard',
  [FEATURES.PDF_GENERATION]: 'standard',
  [FEATURES.EMAIL_DOCUMENTS]: 'standard',
  [FEATURES.TOURS_CALENDAR]: 'standard',
  [FEATURES.USER_MANAGEMENT]: 'standard',
  [FEATURES.COMPANY_PROFILE]: 'standard',
  [FEATURES.DELIVERY_NOTES]: 'gold',
  [FEATURES.DASHBOARD]: 'gold',
};
