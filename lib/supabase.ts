import { createClient } from '@supabase/supabase-js';
import { getCurrentUserCompanyId } from './auth-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper pour effectuer une suppression logique (soft delete)
 * Met à jour la colonne deleted_at au lieu de supprimer l'enregistrement
 * Filtre par company_id pour garantir l'isolation des données
 */
export async function softDelete(table: string, id: string): Promise<{ error: any }> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    return { error: new Error('Non autorisé : company_id manquant') };
  }

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);
  return { error };
}

/**
 * Helper pour restaurer un enregistrement supprimé (soft undelete)
 * Filtre par company_id pour garantir l'isolation des données
 */
export async function softUndelete(table: string, id: string): Promise<{ error: any }> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    return { error: new Error('Non autorisé : company_id manquant') };
  }

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('company_id', companyId);
  return { error };
}

/**
 * Tables qui supportent le soft delete
 */
const SOFT_DELETE_TABLES = [
  'clients',
  'client_products',
  'client_sub_products',
  'establishment_types',
  'payment_methods',
  'product_categories',
  'product_subcategories',
  'products',
  'sub_products',
  'draft_stock_updates',
  'draft_invoices',
  'draft_credit_notes'
];

/**
 * Helper pour ajouter automatiquement le filtre deleted_at IS NULL aux requêtes SELECT
 * Utilisez cette fonction pour toutes les requêtes sur les tables avec soft delete
 */
export function addSoftDeleteFilter(query: any, table: string): any {
  if (SOFT_DELETE_TABLES.includes(table)) {
    return query.is('deleted_at', null);
  }
  return query;
}

export type Client = {
  id: string;
  name: string;
  company_name: string | null;
  address: string; // Ancien champ, conservé pour compatibilité
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  phone_1_info: string | null;
  phone_2: string | null;
  phone_2_info: string | null;
  phone_3: string | null;
  phone_3_info: string | null;
  siret_number: string | null;
  tva_number: string | null;
  client_number: string | null;
  establishment_type_id: string | null;
  opening_hours: any | null;
  visit_frequency_number: number | null;
  visit_frequency_unit: string | null;
  average_time_hours: number | null;
  average_time_minutes: number | null;
  market_days_schedule: any | null;  // Structure: {"Lundi": [{"start": "08:00", "end": "12:00"}], ...}
  vacation_periods: any | null;      // Structure: [{"id": "period-123", "startDate": "2024-07-01", "endDate": "2024-07-31", "isRecurring": true}]
  payment_method: string | null; // Ancien champ, conservé pour compatibilité
  payment_method_id: string | null;
  email: string | null;
  comment: string | null;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type EstablishmentType = {
  id: string;
  name: string;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
};

export type StockUpdate = {
  id: string;
  client_id: string;
  product_id?: string | null;
  sub_product_id?: string | null;
  invoice_id?: string | null;
  previous_stock: number;
  counted_stock: number;
  stock_sold: number;
  stock_added: number;
  new_stock: number;
  product_info?: string | null;
  unit_price_ht?: number | null; // Prix unitaire HT auquel est vendu le produit
  total_amount_ht?: number | null; // Montant total HT : stock_sold x unit_price_ht
  created_at: string;
};

export type InvoiceAdjustment = {
  id: string;
  client_id: string;
  invoice_id: string;
  operation_name: string;
  amount: number;
  unit_price?: number | null;
  quantity?: number | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  client_id: string;
  total_stock_sold: number;
  total_amount: number;
  invoice_number: string | null;
  discount_percentage: number | null; // Pourcentage de remise commerciale (0-100)
  invoice_pdf_path: string | null;
  stock_report_pdf_path: string | null;
  deposit_slip_pdf_path: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  recommended_sale_price: number | null;
  barcode: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
};

export type ProductSubcategory = {
  id: string;
  category_id: string;
  name: string;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
};

export type SubProduct = {
  id: string;
  product_id: string;
  name: string;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type ClientSubProduct = {
  id: string;
  client_id: string;
  sub_product_id: string;
  initial_stock: number;
  current_stock: number;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type ClientProduct = {
  id: string;
  client_id: string;
  product_id: string;
  initial_stock: number;
  current_stock: number;
  custom_price: number | null;
  custom_recommended_sale_price: number | null;
  display_order: number;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  company_name: string | null;
  company_name_short: string | null;
  first_name: string | null;
  last_name: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  siret: string | null;
  ape_code: string | null;
  tva_number: string | null;
  email: string | null;
  phone: string | null;
  terms_and_conditions: string | null;
  created_at: string;
  updated_at: string;
};

export type DraftStockUpdateData = {
  perProductForm: Record<string, { counted_stock: string; stock_added: string; product_info: string }>;
  perSubProductForm?: Record<string, { counted_stock: string; stock_added: string }>;
  pendingAdjustments: { operation_name: string; unit_price: string; quantity: string }[];
};

export type DraftStockUpdate = {
  id: string;
  client_id: string;
  draft_data: DraftStockUpdateData;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type DraftInvoiceRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  barcode: string;
  quantity: string;
  unit_price_ht: number;
  total_ht: number;
  custom_price: number | null;
};

export type DraftInvoiceData = {
  rows: DraftInvoiceRow[];
  discountPercentage: number | null;
};

export type DraftInvoice = {
  id: string;
  client_id: string;
  company_id: string;
  draft_data: DraftInvoiceData;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type DraftCreditNoteData = {
  invoice_id: string;
  operation_name: string;
  quantity: string;
  unit_price: string;
};

export type DraftCreditNote = {
  id: string;
  client_id: string;
  company_id: string;
  draft_data: DraftCreditNoteData;
  deleted_at: string | null; // Date de suppression logique
  created_at: string;
  updated_at: string;
};

export type CreditNote = {
  id: string;
  invoice_id: string;
  client_id: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  operation_name: string;
  credit_note_number: string | null;
  credit_note_pdf_path: string | null;
  created_at: string;
};

export type StockDirectSold = {
  id: string;
  client_id: string;
  invoice_id: string;
  product_id: string | null;
  sub_product_id: string | null;
  stock_sold: number;
  unit_price_ht: number;
  total_amount_ht: number;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  company_id: string;
  role: 'admin' | 'user';
  created_at: string;
};

export type UserInvitation = {
  id: string;
  email: string;
  company_id: string;
  role: 'admin' | 'user';
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};