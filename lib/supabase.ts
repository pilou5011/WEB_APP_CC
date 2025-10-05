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
  previous_stock: number;
  counted_stock: number;
  cards_sold: number;
  cards_added: number;
  new_stock: number;
  created_at: string;
};