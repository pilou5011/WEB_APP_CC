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
  initial_stock: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
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