export {
  buildDeliveryNoteImportPreview,
  executeDeliveryNoteImport,
  getLastAncienDepotByProduct,
  type DeliveryNoteImportLinePreview,
  type DeliveryNoteImportPreview,
} from './import-service';

export {
  fetchClientProductSalesByYear,
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
  fetchClientDeliveryNotes,
  fetchDeliveryNoteLines,
  fetchDeliveryNoteTemplates,
  fetchDraftDeliveryNotesForImport,
  fetchImportableProducts,
  fetchTemplateProducts,
  generateDeliveryNoteNumber,
  renameTemplate,
  saveDeliveryNoteLines,
  setTemplateProducts,
} from './service';
