/**
 * Fonctions utilitaires pour gérer le rollback des documents en cas d'échec de génération PDF
 */

import { supabase } from './supabase';
import { getCurrentUserCompanyId } from './auth-helpers';

export type DocumentType = 'invoice' | 'credit_note';

/**
 * Annule toutes les actions liées à une facture échouée
 * - Supprime les entrées stock_direct_sold liées
 * - Supprime les entrées stock_updates liées
 * - Restaure les stocks dans client_products et client_sub_products
 * - Met à jour le statut du document à 'failed'
 */
export async function rollbackFailedInvoice(invoiceId: string): Promise<void> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Non autorisé');
  }

  console.error(`[Document Rollback] Starting rollback for failed invoice: ${invoiceId}`);

  try {
    // 1. Récupérer les stock_direct_sold liés à cette facture
    const { data: stockDirectSold, error: sdsError } = await supabase
      .from('stock_direct_sold')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('company_id', companyId);

    if (sdsError) {
      console.error('[Document Rollback] Error fetching stock_direct_sold:', sdsError);
      throw sdsError;
    }

    // 2. Récupérer les stock_updates liés à cette facture
    const { data: stockUpdates, error: suError } = await supabase
      .from('stock_updates')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('company_id', companyId);

    if (suError) {
      console.error('[Document Rollback] Error fetching stock_updates:', suError);
      throw suError;
    }

    // 3. Restaurer les stocks pour stock_updates
    if (stockUpdates && stockUpdates.length > 0) {
      // Récupérer le client_id depuis la facture pour filtrer les produits
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('client_id')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .single();

      if (invoiceError) {
        console.error('[Document Rollback] Error fetching invoice:', invoiceError);
        throw invoiceError;
      }

      const clientId = invoice.client_id;

      // Grouper les updates par client_product_id et client_sub_product_id pour éviter les doublons
      // Utiliser une clé composite pour éviter les conflits
      const productRestorations = new Map<string, number>(); // key: client_product_id, value: previous_stock
      const subProductRestorations = new Map<string, number>(); // key: client_sub_product_id, value: previous_stock

      for (const update of stockUpdates) {
        // Pour les produits parents
        if (update.product_id && update.previous_stock !== null && update.previous_stock !== undefined) {
          // Récupérer le client_product_id depuis client_products
          const { data: clientProduct, error: cpError } = await supabase
            .from('client_products')
            .select('id')
            .eq('client_id', clientId)
            .eq('product_id', update.product_id)
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .maybeSingle();

          if (!cpError && clientProduct) {
            // Utiliser le maximum si plusieurs updates pour le même produit
            const existing = productRestorations.get(clientProduct.id);
            if (existing === undefined || update.previous_stock > existing) {
              productRestorations.set(clientProduct.id, update.previous_stock);
            }
          }
        }

        // Pour les sous-produits
        if (update.sub_product_id && update.previous_stock !== null && update.previous_stock !== undefined) {
          // Récupérer le client_sub_product_id depuis client_sub_products
          const { data: clientSubProduct, error: cspError } = await supabase
            .from('client_sub_products')
            .select('id')
            .eq('client_id', clientId)
            .eq('sub_product_id', update.sub_product_id)
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .maybeSingle();

          if (!cspError && clientSubProduct) {
            // Utiliser le maximum si plusieurs updates pour le même sous-produit
            const existing = subProductRestorations.get(clientSubProduct.id);
            if (existing === undefined || update.previous_stock > existing) {
              subProductRestorations.set(clientSubProduct.id, update.previous_stock);
            }
          }
        }
      }

      // Restaurer les stocks des produits parents
      await Promise.all(
        Array.from(productRestorations.entries()).map(async ([clientProductId, previousStock]) => {
          const { error: restoreError } = await supabase
            .from('client_products')
            .update({ current_stock: previousStock, updated_at: new Date().toISOString() })
            .eq('id', clientProductId)
            .eq('company_id', companyId);

          if (restoreError) {
            console.error(`[Document Rollback] Error restoring stock for client_product ${clientProductId}:`, restoreError);
            // Continue malgré l'erreur pour restaurer les autres stocks
          }
        })
      );

      // Restaurer les stocks des sous-produits
      await Promise.all(
        Array.from(subProductRestorations.entries()).map(async ([clientSubProductId, previousStock]) => {
          const { error: restoreError } = await supabase
            .from('client_sub_products')
            .update({ current_stock: previousStock, updated_at: new Date().toISOString() })
            .eq('id', clientSubProductId)
            .eq('company_id', companyId);

          if (restoreError) {
            console.error(`[Document Rollback] Error restoring stock for client_sub_product ${clientSubProductId}:`, restoreError);
            // Continue malgré l'erreur pour restaurer les autres stocks
          }
        })
      );

      // Supprimer les stock_updates
      const { error: deleteSuError } = await supabase
        .from('stock_updates')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('company_id', companyId);

      if (deleteSuError) {
        console.error('[Document Rollback] Error deleting stock_updates:', deleteSuError);
        throw deleteSuError;
      }
    }

      // 4. Supprimer les stock_direct_sold
      if (stockDirectSold && stockDirectSold.length > 0) {
        const { error: deleteSdsError } = await supabase
          .from('stock_direct_sold')
          .delete()
          .eq('invoice_id', invoiceId)
          .eq('company_id', companyId);

        if (deleteSdsError) {
          console.error('[Document Rollback] Error deleting stock_direct_sold:', deleteSdsError);
          throw deleteSdsError;
        }
      }

      // 5. Supprimer les invoice_adjustments liés à cette facture
      const { error: deleteAdjError } = await supabase
        .from('invoice_adjustments')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('company_id', companyId);

      if (deleteAdjError) {
        console.error('[Document Rollback] Error deleting invoice_adjustments:', deleteAdjError);
        // Continue malgré l'erreur
      }

      // 6. Marquer la facture comme 'failed'
    const { error: statusError } = await supabase
      .from('invoices')
      .update({ status: 'failed' })
      .eq('id', invoiceId)
      .eq('company_id', companyId);

    if (statusError) {
      console.error('[Document Rollback] Error updating invoice status:', statusError);
      throw statusError;
    }

    console.error(`[Document Rollback] Successfully rolled back invoice: ${invoiceId}`);
  } catch (error) {
    console.error(`[Document Rollback] Critical error during rollback for invoice ${invoiceId}:`, error);
    // Mettre quand même le statut à 'failed' même si le rollback partiel a échoué
    try {
      await supabase
        .from('invoices')
        .update({ status: 'failed' })
        .eq('id', invoiceId)
        .eq('company_id', companyId);
    } catch (statusError) {
      console.error('[Document Rollback] Failed to set status to failed:', statusError);
    }
    throw error;
  }
}

/**
 * Annule toutes les actions liées à un avoir échoué
 * Note: Les avoirs ne modifient généralement pas les stocks directement,
 * mais on marque quand même le statut comme 'failed' pour cohérence
 */
export async function rollbackFailedCreditNote(creditNoteId: string): Promise<void> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Non autorisé');
  }

  console.error(`[Document Rollback] Starting rollback for failed credit note: ${creditNoteId}`);

  try {
    // Marquer l'avoir comme 'failed'
    const { error: statusError } = await supabase
      .from('credit_notes')
      .update({ status: 'failed' })
      .eq('id', creditNoteId)
      .eq('company_id', companyId);

    if (statusError) {
      console.error('[Document Rollback] Error updating credit note status:', statusError);
      throw statusError;
    }

    console.error(`[Document Rollback] Successfully rolled back credit note: ${creditNoteId}`);
  } catch (error) {
    console.error(`[Document Rollback] Critical error during rollback for credit note ${creditNoteId}:`, error);
    throw error;
  }
}

/**
 * Fonction générique pour rollback selon le type de document
 */
export async function rollbackFailedDocument(
  documentId: string,
  documentType: DocumentType
): Promise<void> {
  if (documentType === 'invoice') {
    return rollbackFailedInvoice(documentId);
  } else if (documentType === 'credit_note') {
    return rollbackFailedCreditNote(documentId);
  } else {
    throw new Error(`Unknown document type: ${documentType}`);
  }
}

