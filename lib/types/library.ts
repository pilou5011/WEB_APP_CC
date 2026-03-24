/**
 * Types pour la section Bibliothèque - consultation et export des documents
 */

export type LibraryDocumentType =
  | 'invoice'
  | 'stock_report'
  | 'deposit_slip'
  | 'credit_note';

export const DOCUMENT_TYPE_LABELS: Record<LibraryDocumentType, string> = {
  invoice: 'Facture',
  stock_report: 'Relevé de stock',
  deposit_slip: 'Bon de dépôt',
  credit_note: 'Avoir',
};

export interface LibraryDocument {
  /** Identifiant unique composite (pour le téléchargement) */
  id: string;
  type: LibraryDocumentType;
  /** Nom d'affichage du document */
  name: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  /** Chemin dans Supabase Storage (bucket documents) */
  storagePath: string;
}

export interface LibraryFilters {
  clientId: string | null;
  startDate: string | null;
  endDate: string | null;
  documentTypes: LibraryDocumentType[];
}
