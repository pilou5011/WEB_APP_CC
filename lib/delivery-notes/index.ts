export {
  assertDeliveryNoteImportable,
  buildCashInvoiceImportPreview,
  buildDeliveryNoteImportPreview,
  convertResolvedLinesToCashInvoiceLines,
  executeDeliveryNoteImport,
  getLastAncienDepotByProduct,
  markDeliveryNoteAsImported,
  revertDeliveryNoteToValidated,
  type CashInvoiceImportLine,
  type CashInvoiceImportPreview,
  type DeliveryNoteImportLinePreview,
  type DeliveryNoteImportPreview,
  type DeliveryNoteImportSubLinePreview,
} from './import-service';

export {
  fetchClientProductSalesByYear,
  fetchClientSubProductSalesByYear,
  getSalesHistoryYears,
  type ProductSalesByYear,
} from './sales-history';

export {
  createDeliveryNoteFromTemplate,
  createEmptyDeliveryNote,
  createTemplate,
  deleteDraftDeliveryNote,
  deleteTemplate,
  duplicateTemplate,
  fetchActiveSubProductsByProductIds,
  fetchClientDeliveryNotes,
  fetchDeliveryNoteLines,
  fetchDeliveryNoteTemplates,
  fetchDraftDeliveryNotesForImport,
  fetchImportableProducts,
  fetchTemplateProducts,
  fetchValidatedDeliveryNotesForImport,
  generateDeliveryNoteNumber,
  renameTemplate,
  resolveDeliveryNoteLines,
  saveDeliveryNoteLines,
  setTemplateProducts,
  updateDeliveryNoteFreeText,
  type ResolvedDeliveryNoteLine,
} from './service';

export {
  cancelValidatedDeliveryNote,
  fetchDocumentDeliveryNotes,
  markDeliveryNoteEmailSent,
  pruneSoftDeletedProductsFromDraft,
  validateDeliveryNote,
} from './validation-service';
