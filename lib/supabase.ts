import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Client = {
  id: string;
  name: string;
  address: string; // Ancien champ, conservé pour compatibilité
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  phone_1_info: string | null;
  phone_2: string | null;
  phone_2_info: string | null;
  phone_3: string | null;
  phone_3_info: string | null;
  rcs_number: string | null;
  naf_code: string | null;
  client_number: string | null;
  establishment_type_id: string | null;
  opening_hours: any | null;
  visit_frequency_number: number | null;
  visit_frequency_unit: string | null;
  average_time_hours: number | null;
  average_time_minutes: number | null;
  vacation_start_date: string | null;
  vacation_end_date: string | null;
  market_days: string[] | null;
  closing_day: string | null;
  payment_method: string | null;
  email: string | null;
  comment: string | null;
  initial_stock: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
};

export type EstablishmentType = {
  id: string;
  name: string;
  created_at: string;
};

export type StockUpdate = {
  id: string;
  client_id: string;
  collection_id?: string | null;
  invoice_id?: string | null;
  previous_stock: number;
  counted_stock: number;
  cards_sold: number;
  cards_added: number;
  new_stock: number;
  collection_info?: string | null;
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
  total_cards_sold: number;
  total_amount: number;
  created_at: string;
};

export type Collection = {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientCollection = {
  id: string;
  client_id: string;
  collection_id: string;
  initial_stock: number;
  current_stock: number;
  custom_price: number | null;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  siret: string | null;
  ape_code: string | null;
  tva_number: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type DraftStockUpdateData = {
  perCollectionForm: Record<string, { counted_stock: string; cards_added: string; collection_info: string }>;
  pendingAdjustments: { operation_name: string; unit_price: string; quantity: string }[];
};

export type DraftStockUpdate = {
  id: string;
  client_id: string;
  draft_data: DraftStockUpdateData;
  created_at: string;
  updated_at: string;
};