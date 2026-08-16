'use client';

import { useEffect, useRef, useState } from 'react';
import { Client, DeliveryNote, UserProfile, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { markDeliveryNoteEmailSent } from '@/lib/delivery-notes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { isMobileOrTablet } from '@/lib/utils';

type DeliveryNoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  deliveryNote: DeliveryNote;
  onEmailSent?: () => void;
};

/**
 * Visionneuse PDF du bon de livraison — même structure UX que DepositSlipDialog
 * (plein écran 95vw/95vh, barre d’actions mail à gauche / fermer+télécharger à droite).
 */
export function DeliveryNoteDialog({
  open,
  onOpenChange,
  client,
  deliveryNote,
  onEmailSent,
}: DeliveryNoteDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<{
    getPage: (n: number) => Promise<unknown>;
    numPages: number;
  } | null>(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPdfUrl(null);
      setPdfBlob(null);
      setPdfDoc(null);
      setNumPages(null);
      setUseIframeFallback(isMobileOrTablet());
      setCurrentPage(1);
      void loadUserProfile();
      void loadStoredPDF();
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deliveryNote.id]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const loadUserProfile = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', companyId)
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      setUserProfile(data);
    } catch {
      setUserProfile(null);
    }
  };

  const loadStoredPDF = async () => {
    if (!deliveryNote.pdf_path) {
      toast.warning('PDF du bon de livraison introuvable');
      return;
    }
    try {
      setGenerating(true);
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(deliveryNote.pdf_path, 3600);
      if (error || !data) throw error || new Error('Signed URL failed');
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error('Fetch PDF failed');
      const blob = await response.blob();
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger le bon de livraison');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!pdfBlob || !open || useIframeFallback) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs';
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        setPdfDoc(doc as { getPage: (n: number) => Promise<unknown>; numPages: number });
        setNumPages(doc.numPages);
      } catch {
        if (!cancelled) setUseIframeFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBlob, open, useIframeFallback]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !open || useIframeFallback) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    setPageRendering(true);
    (async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;
        const pageProxy = page as {
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: {
            canvasContext: CanvasRenderingContext2D;
            viewport: { width: number; height: number };
          }) => { promise: Promise<void> };
        };
        const baseViewport = pageProxy.getViewport({ scale: 1 });
        const containerW = containerRef.current?.clientWidth || window.innerWidth * 0.9;
        const baseScale = Math.min(
          5,
          Math.max(2, Math.max(containerW - 32, 200) / baseViewport.width)
        );
        const scale = baseScale * Math.min(1.5, window.devicePixelRatio || 1);
        const viewport = pageProxy.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pageProxy.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, open, useIframeFallback]);

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfBlob);
    a.download = `Bon_de_livraison_${deliveryNote.delivery_number}.pdf`;
    a.click();
  };

  const handleSendEmail = async () => {
    if (!pdfBlob || !client.email) {
      toast.error(client.email ? 'PDF indisponible' : 'Email client manquant');
      return;
    }
    setSendingEmail(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');

      const buffer = await pdfBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const pdfBase64 = btoa(binary);

      const dateStr = new Date(
        deliveryNote.validated_at || deliveryNote.created_at
      ).toLocaleDateString('fr-FR');

      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: client.email,
          clientName: client.name,
          pdfBase64,
          fileName: `Bon_de_livraison_${deliveryNote.delivery_number}.pdf`,
          invoiceDate: dateStr,
          senderEmail: userProfile?.email,
          senderName: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
          senderCompanyName: userProfile?.company_name,
          senderPhone: userProfile?.phone,
          documentType: 'delivery_note',
          invoiceNumber: deliveryNote.delivery_number,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Envoi échoué');

      await markDeliveryNoteEmailSent(deliveryNote.id, companyId);
      toast.success('Bon de livraison envoyé par email');
      onEmailSent?.();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0">
          <DialogTitle>
            Prévisualisation du bon de livraison {deliveryNote.delivery_number}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Visualisez et téléchargez le bon de livraison pour ce client
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100 flex flex-col p-2 overflow-hidden">
          {generating ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
              <p className="text-slate-600">Chargement du PDF en cours...</p>
            </div>
          ) : pdfUrl ? (
            <>
              <div
                ref={containerRef}
                className="pdf-preview-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain rounded border border-slate-300 bg-white shadow-lg flex items-start justify-center p-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {useIframeFallback ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full min-h-[200px] rounded border-0"
                    title="Prévisualisation du bon de livraison"
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
                      style={{ opacity: pageRendering ? 0.6 : 1 }}
                    />
                    {pageRendering && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!useIframeFallback && (numPages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-2 py-2 border-t bg-slate-50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || !pdfDoc}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Page précédente
                  </Button>
                  <span className="text-sm text-slate-600 px-2">
                    Page {currentPage}
                    {numPages != null ? ` / ${numPages}` : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(numPages ?? p, p + 1))}
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
              <p>Erreur lors du chargement du PDF</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 px-6 py-3 border-t bg-white flex-shrink-0">
          <div className="flex gap-2">
            {client.email && (
              <Button
                variant="outline"
                onClick={() => void handleSendEmail()}
                disabled={!pdfBlob || generating || sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer par email
                  </>
                )}
              </Button>
            )}
            {!client.email && (
              <div className="text-sm text-slate-500 italic flex items-center">
                Aucun email renseigné pour ce client
              </div>
            )}
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
