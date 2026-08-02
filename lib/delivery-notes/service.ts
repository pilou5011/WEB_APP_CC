import type {
  DeliveryNote,
  DeliveryNoteLineWithProduct,
  DeliveryNoteTemplate,
  DeliveryNoteTemplateProductWithProduct,
  Product,
} from '@/lib/supabase';
import { addSoftDeleteFilter, supabase } from '@/lib/supabase';
import {
  deliveryNotesTable,
  ensureDeliveryNotesSoftDeleteColumn,
  nowIso,
  onlyActiveRows,
  softDeleteWhere,
  syncChildRowsByProduct,
  withActiveSqlFilter,
} from './db-helpers';

export async function generateDeliveryNoteNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await supabase.rpc('get_next_delivery_note_number', {
    p_company_id: companyId,
    p_year: year,
  });

  if (error) throw error;
  return data as string;
}

export async function fetchDeliveryNoteTemplates(
  companyId: string
): Promise<DeliveryNoteTemplate[]> {
  const { data, error } = await deliveryNotesTable('delivery_note_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) throw error;
  return onlyActiveRows(data);
}

export async function fetchTemplateProducts(
  templateId: string,
  companyId: string
): Promise<DeliveryNoteTemplateProductWithProduct[]> {
  const { data, error } = await deliveryNotesTable('delivery_note_template_products')
    .select('*, product:products(*)')
    .eq('template_id', templateId)
    .eq('company_id', companyId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return onlyActiveRows(data as DeliveryNoteTemplateProductWithProduct[] | null).filter(
    (row) => row.product && !row.product.deleted_at
  );
}

export async function createTemplate(companyId: string, name: string): Promise<DeliveryNoteTemplate> {
  const { data, error } = await deliveryNotesTable('delivery_note_templates')
    .insert({ company_id: companyId, name: name.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameTemplate(
  templateId: string,
  companyId: string,
  name: string
): Promise<void> {
  await ensureDeliveryNotesSoftDeleteColumn();

  const { error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_note_templates')
      .update({ name: name.trim(), updated_at: nowIso() })
      .eq('id', templateId)
      .eq('company_id', companyId)
  );

  if (error) throw error;
}

export async function deleteTemplate(templateId: string, companyId: string): Promise<void> {
  await softDeleteWhere('delivery_note_template_products', companyId, { template_id: templateId });

  const { error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_note_templates')
      .update({ deleted_at: nowIso(), updated_at: nowIso() })
      .eq('id', templateId)
      .eq('company_id', companyId)
  );

  if (error) throw error;
}

export async function duplicateTemplate(
  templateId: string,
  companyId: string
): Promise<DeliveryNoteTemplate> {
  const { data: source, error: sourceError } = await deliveryNotesTable('delivery_note_templates')
    .select('*')
    .eq('id', templateId)
    .eq('company_id', companyId)
    .single();

  if (sourceError || !source || source.deleted_at) {
    throw sourceError || new Error('Modèle introuvable');
  }

  const products = await fetchTemplateProducts(templateId, companyId);
  const copyName = `${source.name} (copie)`;

  const { data: created, error: createError } = await deliveryNotesTable('delivery_note_templates')
    .insert({ company_id: companyId, name: copyName })
    .select()
    .single();

  if (createError || !created) throw createError || new Error('Erreur duplication');

  if (products.length > 0) {
    await syncChildRowsByProduct(
      'delivery_note_template_products',
      'template_id',
      created.id,
      companyId,
      products.map((p, index) => ({
        product_id: p.product_id,
        display_order: index + 1,
      }))
    );
  }

  return created;
}

export async function setTemplateProducts(
  templateId: string,
  companyId: string,
  productIds: string[]
): Promise<void> {
  await syncChildRowsByProduct(
    'delivery_note_template_products',
    'template_id',
    templateId,
    companyId,
    productIds.map((productId, index) => ({
      product_id: productId,
      display_order: index + 1,
    }))
  );

  await ensureDeliveryNotesSoftDeleteColumn();

  const { error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_note_templates')
      .update({ updated_at: nowIso() })
      .eq('id', templateId)
      .eq('company_id', companyId)
  );

  if (error) throw error;
}

export async function fetchClientDeliveryNotes(
  clientId: string,
  companyId: string,
  status?: 'draft' | 'imported'
): Promise<DeliveryNote[]> {
  let query = deliveryNotesTable('delivery_notes')
    .select('*')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return onlyActiveRows(data);
}

export async function fetchDeliveryNoteLines(
  deliveryNoteId: string,
  companyId: string
): Promise<DeliveryNoteLineWithProduct[]> {
  const { data, error } = await deliveryNotesTable('delivery_note_lines')
    .select('*, product:products(*)')
    .eq('delivery_note_id', deliveryNoteId)
    .eq('company_id', companyId)
    .order('display_order', { ascending: true });

  if (error) throw error;

  return onlyActiveRows(data as DeliveryNoteLineWithProduct[] | null).filter(
    (line) => line.product && !line.product.deleted_at
  );
}

export async function createEmptyDeliveryNote(
  clientId: string,
  companyId: string
): Promise<DeliveryNote> {
  const deliveryNumber = await generateDeliveryNoteNumber(companyId);
  const { data, error } = await deliveryNotesTable('delivery_notes')
    .insert({
      client_id: clientId,
      company_id: companyId,
      delivery_number: deliveryNumber,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDeliveryNoteFromTemplate(
  clientId: string,
  companyId: string,
  templateId: string
): Promise<DeliveryNote> {
  const { data: template, error: templateError } = await deliveryNotesTable('delivery_note_templates')
    .select('id, deleted_at')
    .eq('id', templateId)
    .eq('company_id', companyId)
    .single();

  if (templateError || !template || template.deleted_at) {
    throw templateError || new Error('Modèle introuvable');
  }

  const note = await createEmptyDeliveryNote(clientId, companyId);
  const templateProducts = await fetchTemplateProducts(templateId, companyId);

  if (templateProducts.length > 0) {
    await syncChildRowsByProduct(
      'delivery_note_lines',
      'delivery_note_id',
      note.id,
      companyId,
      templateProducts.map((tp, index) => ({
        product_id: tp.product_id,
        display_order: index + 1,
        quantity: 0,
      }))
    );
  }

  return note;
}

export async function deleteDraftDeliveryNote(
  deliveryNoteId: string,
  companyId: string
): Promise<void> {
  const { data: note, error: fetchError } = await deliveryNotesTable('delivery_notes')
    .select('status, deleted_at')
    .eq('id', deliveryNoteId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !note || note.deleted_at) throw fetchError || new Error('Bon introuvable');
  if (note.status !== 'draft') throw new Error('Seuls les brouillons peuvent être supprimés');

  await softDeleteWhere('delivery_note_lines', companyId, { delivery_note_id: deliveryNoteId });

  const { error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({ deleted_at: nowIso(), updated_at: nowIso() })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
  );

  if (error) throw error;
}

export async function saveDeliveryNoteLines(
  deliveryNoteId: string,
  companyId: string,
  lines: Array<{ product_id: string; quantity: number; display_order: number }>
): Promise<void> {
  const { data: note, error: noteError } = await deliveryNotesTable('delivery_notes')
    .select('status, deleted_at')
    .eq('id', deliveryNoteId)
    .eq('company_id', companyId)
    .single();

  if (noteError || !note || note.deleted_at) throw noteError || new Error('Bon introuvable');
  if (note.status !== 'draft') throw new Error('Ce bon de livraison est figé');

  const productIds = lines.map((l) => l.product_id);
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('Chaque produit ne peut apparaître qu\'une seule fois');
  }

  await syncChildRowsByProduct(
    'delivery_note_lines',
    'delivery_note_id',
    deliveryNoteId,
    companyId,
    lines.map((line) => ({
      product_id: line.product_id,
      display_order: line.display_order,
      quantity: line.quantity,
    }))
  );

  await ensureDeliveryNotesSoftDeleteColumn();

  const { error: updateError } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({ updated_at: nowIso() })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
  );

  if (updateError) throw updateError;
}

export async function fetchImportableProducts(companyId: string): Promise<Product[]> {
  const { data: products, error: productsError } = await addSoftDeleteFilter(
    supabase.from('products').select('*').eq('company_id', companyId),
    'products'
  ).order('name', { ascending: true });

  if (productsError) throw productsError;

  const { data: subProducts, error: subError } = await addSoftDeleteFilter(
    supabase.from('sub_products').select('product_id').eq('company_id', companyId),
    'sub_products'
  );

  if (subError) throw subError;

  const withSubProducts = new Set(
    (subProducts || []).map((sp: { product_id: string }) => sp.product_id)
  );
  return (products || []).filter((p: Product) => !withSubProducts.has(p.id));
}

export async function fetchDraftDeliveryNotesForImport(
  clientId: string,
  companyId: string
): Promise<DeliveryNote[]> {
  return fetchClientDeliveryNotes(clientId, companyId, 'draft');
}
