import {
  Client,
  DeliveryNote,
  DeliveryNoteStatus,
  Product,
  addSoftDeleteFilter,
  supabase,
} from '@/lib/supabase';
import {
  deliveryNotesTable,
  ensureDeliveryNotesSoftDeleteColumn,
  nowIso,
  softDeleteWhere,
  withActiveSqlFilter,
} from '@/lib/delivery-notes/db-helpers';
import {
  fetchDeliveryNoteLines,
  fetchDeliveryNoteSubProductLines,
  resolveDeliveryNoteLines,
  saveDeliveryNoteLines,
} from '@/lib/delivery-notes/service';

export async function pruneSoftDeletedProductsFromDraft(
  deliveryNoteId: string,
  companyId: string
): Promise<void> {
  const lines = await resolveDeliveryNoteLines(deliveryNoteId, companyId, {
    mergeCurrentSubProducts: true,
  });

  const kept = lines.filter((line) => {
    // resolve already skips soft-deleted products; keep only active ones with qty structure
    return Boolean(line.product_id);
  });

  await saveDeliveryNoteLines(
    deliveryNoteId,
    companyId,
    kept.map((line, index) => ({
      product_id: line.product_id,
      quantity: line.quantity,
      display_order: index,
      subLines: line.subLines.map((sub, subIndex) => ({
        sub_product_id: sub.sub_product_id,
        quantity: sub.quantity,
        display_order: subIndex + 1,
      })),
    }))
  );
}

export async function validateDeliveryNote(
  deliveryNoteId: string,
  companyId: string,
  client: Client
): Promise<DeliveryNote> {
  await ensureDeliveryNotesSoftDeleteColumn();

  const { data: note, error: fetchError } = await deliveryNotesTable('delivery_notes')
    .select('*')
    .eq('id', deliveryNoteId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !note || note.deleted_at) {
    throw fetchError || new Error('Bon de livraison introuvable');
  }
  if (note.status !== 'draft') {
    throw new Error('Seul un brouillon peut être validé');
  }

  await pruneSoftDeletedProductsFromDraft(deliveryNoteId, companyId);

  const lines = await resolveDeliveryNoteLines(deliveryNoteId, companyId, {
    mergeCurrentSubProducts: true,
  });
  if (lines.length === 0) {
    throw new Error('Ajoutez au moins un produit avant de valider');
  }

  const { generateAndSaveDeliveryNotePDF } = await import('@/lib/pdf-generators');
  const pdfPath = await generateAndSaveDeliveryNotePDF({
    deliveryNote: note as DeliveryNote,
    client,
    lines,
  });

  const validatedAt = nowIso();
  const updateQuery = withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({
        status: 'validated' satisfies DeliveryNoteStatus,
        validated_at: validatedAt,
        pdf_path: pdfPath,
        updated_at: validatedAt,
      })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
      .eq('status', 'draft')
  );
  const { data: updated, error: updateError } = await updateQuery.select('*').maybeSingle();

  if (updateError) throw updateError;
  if (!updated) {
    throw new Error('La validation a échoué (le bon a peut-être déjà été traité)');
  }

  return updated as DeliveryNote;
}

export async function cancelValidatedDeliveryNote(
  deliveryNoteId: string,
  companyId: string
): Promise<void> {
  await ensureDeliveryNotesSoftDeleteColumn();

  const { data: note, error: fetchError } = await deliveryNotesTable('delivery_notes')
    .select('status, deleted_at')
    .eq('id', deliveryNoteId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !note || note.deleted_at) {
    throw fetchError || new Error('Bon de livraison introuvable');
  }
  if (note.status !== 'validated') {
    throw new Error('Seuls les bons validés non importés peuvent être annulés');
  }

  const deletedAt = nowIso();

  await softDeleteWhere('delivery_note_line_sub_products', companyId, {
    delivery_note_id: deliveryNoteId,
  });
  await softDeleteWhere('delivery_note_lines', companyId, { delivery_note_id: deliveryNoteId });

  const cancelQuery = withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({
        status: 'cancelled' satisfies DeliveryNoteStatus,
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
      .eq('status', 'validated')
  );
  const { data: updated, error } = await cancelQuery.select('id').maybeSingle();

  if (error) throw error;
  if (!updated) {
    throw new Error("L'annulation a échoué (le bon a peut-être déjà été importé ou annulé)");
  }
}

export async function markDeliveryNoteEmailSent(
  deliveryNoteId: string,
  companyId: string
): Promise<void> {
  const { error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({ email_sent_at: nowIso(), updated_at: nowIso() })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
      .in('status', ['validated', 'imported'])
  );
  if (error) throw error;
}

export async function fetchDocumentDeliveryNotes(
  clientId: string,
  companyId: string
): Promise<DeliveryNote[]> {
  const { data, error } = await deliveryNotesTable('delivery_notes')
    .select('*')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .in('status', ['validated', 'imported'])
    .not('pdf_path', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).filter((n) => !n.deleted_at) as DeliveryNote[];
}

export async function fetchValidatedDeliveryNotesForImport(
  clientId: string,
  companyId: string
): Promise<DeliveryNote[]> {
  const { data, error } = await deliveryNotesTable('delivery_notes')
    .select('*')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .eq('status', 'validated')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).filter((n) => !n.deleted_at) as DeliveryNote[];
}

export async function fetchProductsMapForDeliveryNote(
  companyId: string,
  productIds: string[]
): Promise<Map<string, Product>> {
  const map = new Map<string, Product>();
  if (productIds.length === 0) return map;

  const { data, error } = await addSoftDeleteFilter(
    supabase.from('products').select('*').eq('company_id', companyId).in('id', productIds),
    'products'
  );
  if (error) throw error;
  for (const p of (data || []) as Product[]) {
    map.set(p.id, p);
  }
  return map;
}

export async function loadDeliveryNoteLinesForPdf(deliveryNoteId: string, companyId: string) {
  const [lines, subLines] = await Promise.all([
    fetchDeliveryNoteLines(deliveryNoteId, companyId),
    fetchDeliveryNoteSubProductLines(deliveryNoteId, companyId),
  ]);
  return { lines, subLines };
}
