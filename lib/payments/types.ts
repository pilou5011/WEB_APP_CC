export type PaymentInvoiceRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  totalAmount: number;
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
