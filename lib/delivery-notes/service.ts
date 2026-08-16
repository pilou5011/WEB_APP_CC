import type {
  DeliveryNote,
  DeliveryNoteLineSubProductWithSubProduct,
  DeliveryNoteLineWithProduct,
  DeliveryNoteStatus,
  DeliveryNoteTemplate,
  DeliveryNoteTemplateProductWithProduct,
  Product,
  SubProduct,
} from '@/lib/supabase';
import { addSoftDeleteFilter, supabase } from '@/lib/supabase';
import {
  deliveryNotesTable,
  ensureDeliveryNotesSoftDeleteColumn,
  nowIso,
  onlyActiveRows,
  softDeleteWhere,
  syncChildRowsByProduct,
  syncDeliveryNoteSubProductLines,
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
  status?: DeliveryNoteStatus | DeliveryNoteStatus[]
): Promise<DeliveryNote[]> {
  let query = deliveryNotesTable('delivery_notes')
    .select('*')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (Array.isArray(status)) {
    query = query.in('status', status);
  } else if (status) {
    query = query.eq('status', status);
  }

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

  return onlyActiveRows(data as DeliveryNoteLineWithProduct[] | null);
}

export async function fetchDeliveryNoteSubProductLines(
  deliveryNoteId: string,
  companyId: string
): Promise<DeliveryNoteLineSubProductWithSubProduct[]> {
  const { data, error } = await deliveryNotesTable('delivery_note_line_sub_products')
    .select('*, sub_product:sub_products(*)')
    .eq('delivery_note_id', deliveryNoteId)
    .eq('company_id', companyId)
    .order('display_order', { ascending: true });

  if (error) {
    const message = error.message || '';
    if (
      error.code === 'PGRST205' ||
      error.code === '42P01' ||
      message.includes('delivery_note_line_sub_products')
    ) {
      return [];
    }
    throw error;
  }
  return onlyActiveRows(data as DeliveryNoteLineSubProductWithSubProduct[] | null);
}

export async function fetchActiveSubProductsByProductIds(
  companyId: string,
  productIds: string[]
): Promise<Map<string, SubProduct[]>> {
  const result = new Map<string, SubProduct[]>();
  if (productIds.length === 0) return result;

  const { data, error } = await addSoftDeleteFilter(
    supabase
      .from('sub_products')
      .select('*')
      .eq('company_id', companyId)
      .in('product_id', productIds)
      .order('display_order', { ascending: true }),
    'sub_products'
  );

  if (error) throw error;

  for (const sub of (data || []) as SubProduct[]) {
    const list = result.get(sub.product_id) ?? [];
    list.push(sub);
    result.set(sub.product_id, list);
  }

  return result;
}

export type ResolvedDeliveryNoteSubLine = {
  sub_product_id: string;
  sub_product_name: string;
  quantity: number;
};

export type ResolvedDeliveryNoteLine = {
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  subLines: ResolvedDeliveryNoteSubLine[];
  productDeleted: boolean;
};

function storedSubQuantityMap(
  stored: DeliveryNoteLineSubProductWithSubProduct[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of stored) {
    map.set(row.sub_product_id, row.quantity);
  }
  return map;
}

export async function resolveDeliveryNoteLines(
  deliveryNoteId: string,
  companyId: string,
  options: { mergeCurrentSubProducts: boolean }
): Promise<ResolvedDeliveryNoteLine[]> {
  const [parentLines, storedSubs] = await Promise.all([
    fetchDeliveryNoteLines(deliveryNoteId, companyId),
    fetchDeliveryNoteSubProductLines(deliveryNoteId, companyId),
  ]);

  const storedByProduct = new Map<string, DeliveryNoteLineSubProductWithSubProduct[]>();
  for (const row of storedSubs) {
    const list = storedByProduct.get(row.product_id) ?? [];
    list.push(row);
    storedByProduct.set(row.product_id, list);
  }

  const productIds = parentLines.map((line) => line.product_id);
  const catalogSubs = options.mergeCurrentSubProducts
    ? await fetchActiveSubProductsByProductIds(companyId, productIds)
    : new Map<string, SubProduct[]>();

  return parentLines
    .filter((line) => {
      if (options.mergeCurrentSubProducts) {
        return Boolean(line.product && !line.product.deleted_at);
      }
      return true;
    })
    .map((line) => {
      const stored = storedByProduct.get(line.product_id) ?? [];
      const qtyMap = storedSubQuantityMap(stored);
      let subLines: ResolvedDeliveryNoteSubLine[];

      if (options.mergeCurrentSubProducts) {
        const current = catalogSubs.get(line.product_id) ?? [];
        subLines = current.map((sp) => ({
          sub_product_id: sp.id,
          sub_product_name: sp.name,
          quantity: qtyMap.get(sp.id) ?? 0,
        }));
      } else {
        subLines = stored.map((row) => ({
          sub_product_id: row.sub_product_id,
          sub_product_name: row.sub_product?.name || 'Sous-produit',
          quantity: row.quantity,
        }));
      }

      const quantity =
        subLines.length > 0
          ? subLines.reduce((sum, sub) => sum + sub.quantity, 0)
          : line.quantity;

      return {
        product_id: line.product_id,
        product_name: line.product?.name || 'Produit',
        barcode: line.product?.barcode || '',
        quantity,
        subLines,
        productDeleted: Boolean(line.product?.deleted_at),
      };
    });
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

    const subByProduct = await fetchActiveSubProductsByProductIds(
      companyId,
      templateProducts.map((tp) => tp.product_id)
    );
    const subRows = templateProducts.flatMap((tp) => {
      const subs = subByProduct.get(tp.product_id) ?? [];
      return subs.map((sp, index) => ({
        product_id: tp.product_id,
        sub_product_id: sp.id,
        display_order: index + 1,
        quantity: 0,
      }));
    });
    if (subRows.length > 0) {
      await syncDeliveryNoteSubProductLines(note.id, companyId, subRows);
    }
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

  await softDeleteWhere('delivery_note_line_sub_products', companyId, {
    delivery_note_id: deliveryNoteId,
  });
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
  lines: Array<{
    product_id: string;
    quantity: number;
    display_order: number;
    subLines?: Array<{ sub_product_id: string; quantity: number; display_order: number }>;
  }>
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

  const subRows = lines.flatMap((line) =>
    (line.subLines ?? []).map((sub) => ({
      product_id: line.product_id,
      sub_product_id: sub.sub_product_id,
      display_order: sub.display_order,
      quantity: sub.quantity,
    }))
  );
  await syncDeliveryNoteSubProductLines(deliveryNoteId, companyId, subRows);

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
  return products || [];
}

export async function fetchValidatedDeliveryNotesForImport(
  clientId: string,
  companyId: string
): Promise<DeliveryNote[]> {
  return fetchClientDeliveryNotes(clientId, companyId, 'validated');
}

/** @deprecated Use fetchValidatedDeliveryNotesForImport — seuls les BL validés sont importables. */
export async function fetchDraftDeliveryNotesForImport(
  clientId: string,
  companyId: string
): Promise<DeliveryNote[]> {
  return fetchValidatedDeliveryNotesForImport(clientId, companyId);
}
