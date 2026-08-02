import { addSoftDeleteFilter, supabase } from '@/lib/supabase';
import type { DashboardFilters } from '../types';
import type { ClientSummary, RevenueDocument } from './types';
import { normalizeFiscalYearConfig } from './fiscal-year';

function hasClientFilters(filters: DashboardFilters): boolean {
  return (
    filters.clientIds.length > 0 ||
    filters.departments.length > 0 ||
    filters.establishmentTypeIds.length > 0 ||
    filters.tourIds.length > 0
  );
}

/**
 * Résout les IDs clients éligibles selon les filtres dashboard.
 * Retourne `null` si aucun filtre client → tous les clients de l'entreprise.
 */
export async function resolveFilteredClientIds(
  companyId: string,
  filters: DashboardFilters
): Promise<string[] | null> {
  if (!hasClientFilters(filters)) {
    return null;
  }

  let query = supabase.from('clients').select('id').eq('company_id', companyId);

  if (filters.clientIds.length > 0) {
    query = query.in('id', filters.clientIds);
  }
  if (filters.departments.length > 0) {
    query = query.in('department', filters.departments);
  }
  if (filters.establishmentTypeIds.length > 0) {
    query = query.in('establishment_type_id', filters.establishmentTypeIds);
  }
  if (filters.tourIds.length > 0) {
    query = query.in('tour_name_id', filters.tourIds);
  }

  const { data, error } = await addSoftDeleteFilter(query, 'clients');
  if (error) throw error;

  return (data ?? []).map((row: { id: string }) => row.id);
}

function mapInvoiceRows(
  rows: Array<{ client_id: string; total_amount: number | string; invoice_date: string }>
): RevenueDocument[] {
  return rows.map((row) => ({
    type: 'invoice' as const,
    client_id: row.client_id,
    amount_ht: Number(row.total_amount) || 0,
    document_date: row.invoice_date,
  }));
}

function mapCreditNoteRows(
  rows: Array<{ client_id: string; total_amount: number | string; credit_note_date: string }>
): RevenueDocument[] {
  return rows.map((row) => ({
    type: 'credit_note' as const,
    client_id: row.client_id,
    amount_ht: Number(row.total_amount) || 0,
    document_date: row.credit_note_date,
  }));
}

export async function fetchRevenueDocuments(
  companyId: string,
  rangeStart: string,
  rangeEnd: string,
  clientIds: string[] | null
): Promise<RevenueDocument[]> {
  if (clientIds !== null && clientIds.length === 0) {
    return [];
  }

  let invoiceQuery = supabase
    .from('invoices')
    .select('client_id, total_amount, invoice_date')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('invoice_date', rangeStart)
    .lte('invoice_date', rangeEnd);

  let creditNoteQuery = supabase
    .from('credit_notes')
    .select('client_id, total_amount, credit_note_date')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('credit_note_date', rangeStart)
    .lte('credit_note_date', rangeEnd);

  if (clientIds !== null) {
    invoiceQuery = invoiceQuery.in('client_id', clientIds);
    creditNoteQuery = creditNoteQuery.in('client_id', clientIds);
  }

  const [invoicesResult, creditNotesResult] = await Promise.all([invoiceQuery, creditNoteQuery]);

  if (invoicesResult.error) throw invoicesResult.error;
  if (creditNotesResult.error) throw creditNotesResult.error;

  return [
    ...mapInvoiceRows(invoicesResult.data ?? []),
    ...mapCreditNoteRows(creditNotesResult.data ?? []),
  ];
}

export async function fetchClientSummaries(
  companyId: string,
  clientIds: string[] | null
): Promise<ClientSummary[]> {
  if (clientIds !== null && clientIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('clients')
    .select('id, name, average_time_hours, average_time_minutes')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (clientIds !== null) {
    query = query.in('id', clientIds);
  }

  const { data, error } = await addSoftDeleteFilter(query, 'clients');
  if (error) throw error;

  return (
    data ?? []
  ).map(
    (row: {
      id: string;
      name: string;
      average_time_hours: number | null;
      average_time_minutes: number | null;
    }) => ({
    id: row.id,
    name: row.name,
      averageTimeHours: row.average_time_hours,
      averageTimeMinutes: row.average_time_minutes,
    })
  );
}

export async function fetchFiscalYearConfig(companyId: string) {
  const { data, error } = await supabase
    .from('user_profile')
    .select('fiscal_year_end_month, fiscal_year_end_day')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return normalizeFiscalYearConfig(data?.fiscal_year_end_month, data?.fiscal_year_end_day);
}
