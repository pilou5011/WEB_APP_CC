import { supabase } from '@/lib/supabase';

export const DELIVERY_NOTE_TABLES = [
  'delivery_note_templates',
  'delivery_note_template_products',
  'delivery_notes',
  'delivery_note_lines',
] as const;

export type DeliveryNoteTable = (typeof DELIVERY_NOTE_TABLES)[number];

/** Accès direct à une table BL (sans filtre SQL deleted_at). */
export function deliveryNotesTable(table: DeliveryNoteTable) {
  return supabase.from(table);
}

/**
 * Filtre les lignes actives côté application.
 * Compatible si la colonne deleted_at n'existe pas encore en base (undefined === actif).
 */
export function onlyActiveRows<T extends { deleted_at?: string | null }>(rows: T[] | null): T[] {
  return (rows || []).filter((row) => row.deleted_at == null);
}

let softDeleteColumnAvailable: boolean | null = null;

/**
 * Détecte si la migration soft delete BL est appliquée (colonne deleted_at présente).
 * Lance l'erreur Supabase d'origine si les tables BL n'existent pas.
 */
export async function ensureDeliveryNotesSoftDeleteColumn(): Promise<boolean> {
  if (softDeleteColumnAvailable !== null) return softDeleteColumnAvailable;

  const { error } = await supabase.from('delivery_note_templates').select('deleted_at').limit(1);

  if (!error) {
    softDeleteColumnAvailable = true;
    return true;
  }

  const message = error.message || '';
  if (message.includes('deleted_at') || error.code === 'PGRST204') {
    softDeleteColumnAvailable = false;
    return false;
  }

  throw error;
}

/** Filtre SQL deleted_at IS NULL pour les écritures (si la colonne existe). */
export function withActiveSqlFilter(query: any): any {
  if (softDeleteColumnAvailable && query != null && typeof query.is === 'function') {
    return query.is('deleted_at', null);
  }
  return query;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function softDeleteById(
  table: DeliveryNoteTable,
  id: string,
  companyId: string
): Promise<void> {
  await ensureDeliveryNotesSoftDeleteColumn();
  if (!softDeleteColumnAvailable) {
    throw new Error('La migration soft delete des bons de livraison doit être appliquée');
  }

  const { error } = await withActiveSqlFilter(
    deliveryNotesTable(table).update({ deleted_at: nowIso() }).eq('id', id).eq('company_id', companyId)
  );

  if (error) throw error;
}

export async function softDeleteWhere(
  table: DeliveryNoteTable,
  companyId: string,
  filters: Record<string, string>
): Promise<void> {
  await ensureDeliveryNotesSoftDeleteColumn();
  if (!softDeleteColumnAvailable) {
    throw new Error('La migration soft delete des bons de livraison doit être appliquée');
  }

  let query = deliveryNotesTable(table)
    .update({ deleted_at: nowIso() })
    .eq('company_id', companyId);

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { error } = await withActiveSqlFilter(query);
  if (error) throw error;
}

type SyncChildRow = {
  product_id: string;
  display_order: number;
  quantity?: number;
};

/**
 * Synchronise les lignes enfants (modèle ou BL) sans suppression physique.
 */
export async function syncChildRowsByProduct(
  table: 'delivery_note_template_products' | 'delivery_note_lines',
  parentKey: 'template_id' | 'delivery_note_id',
  parentId: string,
  companyId: string,
  rows: SyncChildRow[]
): Promise<void> {
  const hasSoftDelete = await ensureDeliveryNotesSoftDeleteColumn();
  const deletedAt = nowIso();

  const { data: existingAll, error: fetchError } = await deliveryNotesTable(table)
    .select('*')
    .eq(parentKey, parentId)
    .eq('company_id', companyId);

  if (fetchError) throw fetchError;

  const existing = existingAll || [];
  const desiredProductIds = new Set(rows.map((r) => r.product_id));

  const toRemove = existing.filter((r) => r.deleted_at == null && !desiredProductIds.has(r.product_id));
  if (toRemove.length > 0) {
    if (hasSoftDelete) {
      const { error } = await withActiveSqlFilter(
        deliveryNotesTable(table)
          .update({ deleted_at: deletedAt })
          .in(
            'id',
            toRemove.map((r) => r.id)
          )
          .eq('company_id', companyId)
      );
      if (error) throw error;
    } else {
      throw new Error('La migration soft delete des bons de livraison doit être appliquée');
    }
  }

  for (const row of rows) {
    const match = existing.find((r) => r.product_id === row.product_id);
    if (match) {
      const updatePayload: Record<string, unknown> = {
        display_order: row.display_order,
      };
      if (hasSoftDelete) {
        updatePayload.deleted_at = null;
      }
      if (table === 'delivery_note_lines' && row.quantity !== undefined) {
        updatePayload.quantity = row.quantity;
      }

      const { error } = await deliveryNotesTable(table)
        .update(updatePayload)
        .eq('id', match.id)
        .eq('company_id', companyId);

      if (error) throw error;
    } else {
      const insertPayload: Record<string, unknown> = {
        [parentKey]: parentId,
        company_id: companyId,
        product_id: row.product_id,
        display_order: row.display_order,
      };
      if (table === 'delivery_note_lines' && row.quantity !== undefined) {
        insertPayload.quantity = row.quantity;
      }

      const { error } = await deliveryNotesTable(table).insert(insertPayload);
      if (error) throw error;
    }
  }
}
