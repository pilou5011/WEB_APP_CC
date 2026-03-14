'use client';

import { useState, useEffect, useRef } from 'react';
import { Client, Product, ClientProduct, UserProfile, StockUpdate, SubProduct, ClientSubProduct, Invoice, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface StockReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  clientProducts: (ClientProduct & { Product?: Product })[];
  stockUpdates: StockUpdate[];
  invoice: Invoice | null;
}

export function StockReportDialog({
  open,
  onOpenChange,
  client,
  clientProducts,
  stockUpdates,
  invoice
}: StockReportDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [subProducts, setSubProducts] = useState<SubProduct[]>([]);
  const [clientSubProducts, setClientSubProducts] = useState<ClientSubProduct[]>([]);
  const [loadingSubProducts, setLoadingSubProducts] = useState(true);
  const [previousInvoiceDate, setPreviousInvoiceDate] = useState<string | null>(null);
  const [loadingPreviousInvoice, setLoadingPreviousInvoice] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<{ getPage: (n: number) => Promise<unknown>; numPages: number } | null>(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mode débogage (activer/désactiver avec une variable d'environnement ou un flag)
  const DEBUG_MODE = process.env.NODE_ENV === 'development';

  // Fonction utilitaire pour le débogage
  const debugLog = (label: string, data: any, condition: boolean = true) => {
    if (DEBUG_MODE && condition) {
      console.group(`🔍 [StockReport Debug] ${label}`);
      console.log('Données:', data);
      console.trace('Stack trace');
      console.groupEnd();
    }
  };

  useEffect(() => {
    if (open) {
      setPdfGenerated(false);
      setPdfUrl(null);
      setPdfDoc(null);
      setNumPages(null);
      setUseIframeFallback(false);
      setCurrentPage(1);
      setPdfBlob(null);
      setLoadingProfile(true);
      setLoadingSubProducts(true);
      setLoadingPreviousInvoice(true);
      loadUserProfile();
      loadSubProducts();
      loadPreviousInvoiceDate();
    }
  }, [open, invoice]);

  // Cleanup: revoke blob URL when dialog closes or pdfUrl changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Load PDF document with pdfjs when blob is ready (for canvas rendering on tablet)
  useEffect(() => {
    if (!pdfBlob || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs';
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc as { getPage: (n: number) => Promise<unknown>; numPages: number });
        setNumPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF with pdfjs:', err);
        if (cancelled) return;
        setUseIframeFallback(true);
        toast.warning('Affichage simplifié (page 1 uniquement sur tablette). Vous pouvez télécharger le PDF.');
      }
    })();
    return () => { cancelled = true; };
  }, [pdfBlob, open]);

  // Render current page to canvas (works on tablet, unlike iframe #page)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !open) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    setPageRendering(true);
    (async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;
        const pageProxy = page as { getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } };
        const baseViewport = pageProxy.getViewport({ scale: 1 });
        const containerW = containerRef.current?.clientWidth || window.innerWidth * 0.9;
        const baseScale = Math.min(3.5, Math.max(1.5, Math.max(containerW - 32, 200) / baseViewport.width));
        const scale = baseScale * Math.min(1.5, window.devicePixelRatio || 1);
        const viewport = pageProxy.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderCtx = {
          canvasContext: ctx,
          viewport,
        };
        await pageProxy.render(renderCtx).promise;
        if (cancelled) return;
      } catch (err) {
        console.error('Error rendering PDF page:', err);
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, open]);

  // Load stored PDF when dialog opens and data is loaded
  // IMPORTANT: PDFs are now generated automatically when stock is updated
  // This dialog only loads existing PDFs, it never generates new ones
  useEffect(() => {
    if (open && !loadingProfile && !loadingSubProducts && !loadingPreviousInvoice && !pdfGenerated) {
      setPdfGenerated(true);
      loadStoredPDF();
    }
  }, [open, loadingProfile, loadingSubProducts, loadingPreviousInvoice, pdfGenerated]);

  const loadStoredPDF = async () => {
    // Load stored PDF if it exists
    // PDFs are now generated automatically when stock is updated, so we only load existing ones
    if (invoice?.stock_report_pdf_path) {
      try {
        setGenerating(true);
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(invoice.stock_report_pdf_path, 3600); // 1 hour expiry

        if (!error && data) {
          // Fetch the PDF
          const response = await fetch(data.signedUrl);
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfBlob(blob);
            setPdfUrl(url);
            setGenerating(false);
            return; // Successfully loaded stored PDF
          }
        }
        throw new Error('Could not load PDF from storage');
      } catch (error) {
        console.error('Could not load stored PDF:', error);
        toast.error('Impossible de charger le relevé de stock. Veuillez réessayer plus tard.');
        setGenerating(false);
      }
    } else {
      // No PDF exists yet - this should not happen if stock was updated correctly
      console.warn('No PDF path found for stock report:', invoice?.id);
      toast.warning('Le relevé de stock n\'est pas trouvé dans les documents générés. Veuillez vérifier votre connexion internet.');
      setGenerating(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', companyId)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadSubProducts = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Load all sub-products (sorted by display_order)
      const { data: subProductsData, error: subProductsError } = await supabase
        .from('sub_products')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (subProductsError) throw subProductsError;

      // Load client sub-products
      const { data: clientSubProductsData, error: clientSubProductsError } = await supabase
        .from('client_sub_products')
        .select('*')
        .eq('client_id', client.id)
        .eq('company_id', companyId);

      if (clientSubProductsError) throw clientSubProductsError;

      setSubProducts(subProductsData || []);
      setClientSubProducts(clientSubProductsData || []);
    } catch (error) {
      console.error('Error loading sub-products:', error);
      toast.error('Erreur lors du chargement des sous-produits');
    } finally {
      setLoadingSubProducts(false);
    }
  };

  const loadPreviousInvoiceDate = async () => {
    try {
      if (!invoice) {
        // If no invoice, try to get the date from stock updates
        if (stockUpdates.length > 0) {
          // Get the most recent stock update date
          const mostRecentDate = stockUpdates.reduce((latest, update) => {
            const updateDate = new Date(update.created_at);
            return updateDate > latest ? updateDate : latest;
          }, new Date(0));
          
          const companyId = await getCurrentUserCompanyId();
          if (!companyId) {
            throw new Error('Non autorisé');
          }

          // Find the previous invoice or stock update before this date
          const { data: previousInvoice, error } = await supabase
            .from('invoices')
            .select('created_at')
            .eq('client_id', client.id)
            .eq('company_id', companyId)
            .lt('created_at', mostRecentDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          setPreviousInvoiceDate(previousInvoice?.created_at || null);
        } else {
          setPreviousInvoiceDate(null);
        }
        setLoadingPreviousInvoice(false);
        return;
      }

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Récupérer la date de la facture précédente la plus récente avant celle-ci
      const { data: previousInvoice, error } = await supabase
        .from('invoices')
        .select('created_at')
        .eq('client_id', client.id)
        .eq('company_id', companyId)
        .lt('created_at', invoice.created_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setPreviousInvoiceDate(previousInvoice?.created_at || null);
    } catch (error) {
      console.error('Error loading previous invoice date:', error);
      toast.error('Erreur lors du chargement de la date du dépôt précédent');
    } finally {
      setLoadingPreviousInvoice(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const fileName = `Releve_stock_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Relevé de stock téléchargé');
    } else {
      toast.error('Veuillez patienter, le PDF est en cours de génération');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0">
          <DialogTitle>Prévisualisation du relevé de stock</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100 flex flex-col p-2 overflow-hidden">
          {generating || loadingProfile || loadingSubProducts || loadingPreviousInvoice ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
              <p className="text-slate-600">Génération du PDF en cours...</p>
            </div>
          ) : pdfUrl ? (
            <>
              <div 
                ref={containerRef}
                className="pdf-preview-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded border border-slate-300 bg-white shadow-lg flex items-start justify-center p-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {useIframeFallback ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full min-h-[70vh] flex-1 rounded border-0"
                    title="Prévisualisation du relevé de stock"
                  />
                ) : !pdfDoc ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                    <p className="text-sm text-slate-600">Préparation du PDF...</p>
                  </div>
                ) : (
                  <div className="relative flex flex-1 items-start justify-center min-h-0 w-full">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto rounded shadow-sm"
                      style={{ maxHeight: '70vh', opacity: pageRendering ? 0.6 : 1 }}
                    />
                    {pageRendering && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!useIframeFallback && (
                <div className="flex items-center justify-center gap-2 py-2 border-t bg-slate-50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || !pdfDoc}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Page précédente
                  </Button>
                  <span className="text-sm text-slate-600 px-2">
                    Page {currentPage}{numPages != null ? ` / ${numPages}` : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(numPages ?? p, p + 1))}
                    disabled={numPages != null && currentPage >= numPages}
                  >
                    Page suivante
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-slate-600">
              <p>Erreur lors de la génération du PDF</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 px-6 py-3 border-t bg-white flex-shrink-0">
          <div className="flex gap-2">
            {/* Espace réservé pour d'éventuels boutons futurs */}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={handleDownloadPDF} disabled={!pdfBlob || generating}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

