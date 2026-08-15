export {
  buildDeliveryNoteImportPreview,
  executeDeliveryNoteImport,
  getLastAncienDepotByProduct,
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
  generateDeliveryNoteNumber,
  renameTemplate,
  resolveDeliveryNoteLines,
  saveDeliveryNoteLines,
  setTemplateProducts,
  type ResolvedDeliveryNoteLine,
} from './service';
