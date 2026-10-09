export type PaymentInvoiceRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  /** Horodatage technique de création, utilisé pour départager un même jour. */
  createdAt: string | null;
  dueDate: string | null;
  /** Total HT enregistré (invoices.total_amount). Sert aux chiffres clés. */
  totalAmount: number;
  /** Total TTC = HT + TVA 20 %, comme sur le PDF de facture. */
  totalAmountTtc: number;
  paidAt: string | null;
  pdfPath: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
};

export type PaymentsListFilters = {
  clientId: string | null;
  startDate: string | null;
  endDate: string | null;
  unpaidOnly: boolean;
  invoiceNumberQuery: string;
};
