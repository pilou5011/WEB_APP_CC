/**
 * Utility functions for generating and storing PDFs in Supabase Storage
 * This ensures documents are frozen in time and don't change when data is updated
 */

import { supabase } from './supabase';
import { Client, Invoice, StockUpdate, Collection, ClientCollection, UserProfile, InvoiceAdjustment } from './supabase';
import { getCurrentUserCompanyId } from './auth-helpers';

const STORAGE_BUCKET = 'documents'; // Bucket name in Supabase Storage

/**
 * Initialize the storage bucket if it doesn't exist
 * This should be called once during setup
 */
export async function initializeStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      // Create bucket (this requires admin privileges, might need to be done manually in Supabase dashboard)
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: false, // Private bucket for security
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: ['application/pdf']
      });
      
      if (createError) {
        console.warn('Could not create bucket automatically. Please create it manually in Supabase dashboard:', createError);
      }
    }
  } catch (error) {
    console.error('Error initializing storage bucket:', error);
  }
}

/**
 * Upload a PDF blob to Supabase Storage
 */
async function uploadPDF(blob: Blob, filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading PDF:', error);
      return null;
    }

    // Get public URL (or signed URL for private buckets)
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadPDF:', error);
    return null;
  }
}

/**
 * Get a signed URL for a PDF file (for private buckets)
 */
export async function getPDFUrl(filePath: string | null): Promise<string | null> {
  if (!filePath) return null;

  try {
    // For private buckets, use signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getPDFUrl:', error);
    return null;
  }
}

/**
 * Generate file path for a document
 */
function getDocumentPath(invoiceId: string, documentType: 'invoice' | 'stock_report' | 'deposit_slip'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `invoices/${invoiceId}/${documentType}_${timestamp}.pdf`;
}

/**
 * Generate and save invoice PDF
 */
export async function generateAndSaveInvoicePDF(
  invoice: Invoice,
  client: Client,
  stockUpdates: StockUpdate[],
  collections: Collection[],
  clientCollections: (ClientCollection & { collection?: Collection })[],
  userProfile: UserProfile | null,
  adjustments: InvoiceAdjustment[]
): Promise<string | null> {
  try {
    // Import PDF generation libraries
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    // This is a simplified version - you'll need to copy the full PDF generation logic
    // from GlobalInvoiceDialog.generatePDFPreview()
    const doc = new jsPDF();
    
    // TODO: Copy the full PDF generation logic from GlobalInvoiceDialog
    // For now, this is a placeholder that generates a basic PDF
    
    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    
    // Upload to storage
    const filePath = getDocumentPath(invoice.id, 'invoice');
    const url = await uploadPDF(pdfBlob, filePath);
    
    if (url) {
      // Update invoice record with PDF path
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ invoice_pdf_path: filePath })
        .eq('id', invoice.id)
        .eq('company_id', companyId);
      
      if (updateError) {
        console.error('Error updating invoice with PDF path:', updateError);
      }
    }
    
    return url;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return null;
  }
}

/**
 * Generate and save stock report PDF
 */
export async function generateAndSaveStockReportPDF(
  invoice: Invoice,
  client: Client,
  stockUpdates: StockUpdate[],
  collections: Collection[],
  clientCollections: (ClientCollection & { collection?: Collection })[],
  userProfile: UserProfile | null
): Promise<string | null> {
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // TODO: Copy the full PDF generation logic from StockReportDialog.generatePDFPreview()
    
    const pdfBlob = doc.output('blob');
    const filePath = getDocumentPath(invoice.id, 'stock_report');
    const url = await uploadPDF(pdfBlob, filePath);
    
    if (url) {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ stock_report_pdf_path: filePath })
        .eq('id', invoice.id)
        .eq('company_id', companyId);
      
      if (updateError) {
        console.error('Error updating invoice with PDF path:', updateError);
      }
    }
    
    return url;
  } catch (error) {
    console.error('Error generating stock report PDF:', error);
    return null;
  }
}

/**
 * Generate and save deposit slip PDF
 */
export async function generateAndSaveDepositSlipPDF(
  invoice: Invoice,
  client: Client,
  clientCollections: (ClientCollection & { collection?: Collection })[],
  stockUpdates: StockUpdate[],
  userProfile: UserProfile | null,
  collectionInfos: Record<string, string>
): Promise<string | null> {
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // TODO: Copy the full PDF generation logic from DepositSlipDialog.generatePDFPreview()
    
    const pdfBlob = doc.output('blob');
    const filePath = getDocumentPath(invoice.id, 'deposit_slip');
    const url = await uploadPDF(pdfBlob, filePath);
    
    if (url) {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ deposit_slip_pdf_path: filePath })
        .eq('id', invoice.id)
        .eq('company_id', companyId);
      
      if (updateError) {
        console.error('Error updating invoice with PDF path:', updateError);
      }
    }
    
    return url;
  } catch (error) {
    console.error('Error generating deposit slip PDF:', error);
    return null;
  }
}

