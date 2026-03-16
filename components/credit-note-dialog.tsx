'use client';

import { useState, useEffect, useRef } from 'react';
import { Client, CreditNote, Invoice, UserProfile, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface CreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  creditNote: CreditNote;
  invoice: Invoice;
  onEmailSent?: () => void; // Callback pour rafraîchir les données après envoi
}

export function CreditNoteDialog({
  open,
  onOpenChange,
  client,
  creditNote,
  invoice,
  onEmailSent
}: CreditNoteDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
   // États pour l'affichage PDF.js (comme facture / bon de dépôt / relevé)
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<{ getPage: (n: number) => Promise<unknown>; numPages: number } | null>(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // (Ré)initialiser l'état uniquement à l'ouverture
      setPdfGenerated(false);
      setPdfUrl(null);
      setPdfBlob(null);
      setPdfDoc(null);
      setNumPages(null);
      setUseIframeFallback(false);
      setCurrentPage(1);
      loadUserProfile();
      loadStoredPDF();
    }

    // Cleanup: revoke blob URL when le dialog se ferme
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
    // IMPORTANT : ne pas dépendre de pdfUrl ici pour éviter une boucle infinie
  }, [open, creditNote.id]);

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
      setUserProfile(null);
    }
  };

  // Nettoyage de l'URL blob quand elle change (sécurité supplémentaire)
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Charger le PDF avec pdf.js quand le blob est prêt (affichage net et zoomé, y compris tablette)
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
        console.error('Error loading credit note PDF with pdfjs:', err);
        if (cancelled) return;
        // En cas d'erreur, on garde un affichage en iframe simple
        setUseIframeFallback(true);
        //toast.warning('Affichage simplifié de l\'avoir. Vous pouvez télécharger le PDF.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBlob, open]);

  // Rendre la page courante dans un canvas (zoom fort, moins flou)
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
        const pageProxy = page as {
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
        };
        const baseViewport = pageProxy.getViewport({ scale: 1 });
        const containerW = containerRef.current?.clientWidth || window.innerWidth * 0.9;
        const baseScale = Math.min(5, Math.max(2, Math.max(containerW - 32, 200) / baseViewport.width));
        const scale = baseScale * Math.min(1.5, window.devicePixelRatio || 1);
        const viewport = pageProxy.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderCtx = { canvasContext: ctx, viewport };
        await pageProxy.render(renderCtx).promise;
        if (cancelled) return;
      } catch (err) {
        console.error('Error rendering credit note page:', err);
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, open]);

  const loadStoredPDF = async () => {
    // Load stored PDF if it exists
    if (creditNote.credit_note_pdf_path) {
      try {
        setGenerating(true);
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(creditNote.credit_note_pdf_path, 3600); // 1 hour expiry

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
        toast.error('Impossible de charger l\'avoir. Veuillez réessayer plus tard.');
        setGenerating(false);
      }
    } else {
      // No PDF exists yet
      console.warn('No PDF path found for credit note:', creditNote.id);
      toast.warning('L\'avoir n\'est pas trouvé dans les documents générés. Veuillez vérifier votre connexion internet.');
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const fileName = `Avoir_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(creditNote.created_at).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Avoir téléchargé avec succès');
    }
  };

  const handleSendEmail = async () => {
    if (!client.email) {
      toast.error('Aucune adresse email renseignée pour ce client');
      return;
    }

    if (!pdfBlob) {
      toast.error('Veuillez patienter, le PDF est en cours de génération');
      return;
    }

    try {
      setSendingEmail(true);
      
      // Convertir le blob en base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      
      reader.onloadend = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        
        if (!base64data) {
          throw new Error('Erreur de conversion du PDF');
        }
        
        const fileName = `Avoir_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(creditNote.created_at).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
        
        const response = await fetch('/api/send-invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientEmail: client.email,
            clientName: client.name,
            pdfBase64: base64data,
            fileName: fileName,
            documentType: 'credit_note',
            creditNoteDate: new Date(creditNote.created_at).toLocaleDateString('fr-FR'),
            invoiceNumber: invoice.invoice_number || 'N/A',
            senderEmail: userProfile?.email,
            senderName: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || undefined,
            senderCompanyName: userProfile?.company_name_short || userProfile?.company_name || undefined,
            senderPhone: userProfile?.phone,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de l\'envoi');
        }

        // Enregistrer la date d'envoi dans la base de données
        const companyId = await getCurrentUserCompanyId();
        if (companyId) {
          await supabase
            .from('credit_notes')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', creditNote.id)
            .eq('company_id', companyId);
        }

        toast.success(`Avoir envoyé avec succès à ${client.email}`);
        setSendingEmail(false);
        
        // Appeler le callback pour rafraîchir les données
        if (onEmailSent) {
          onEmailSent();
        }
      };
      
      reader.onerror = () => {
        throw new Error('Erreur de lecture du PDF');
      };
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0">
          <DialogTitle>Prévisualisation de l'avoir</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100 flex flex-col p-2 overflow-hidden">
          {generating ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
              <p className="text-slate-600">Chargement des données en cours...</p>
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
                    title="Prévisualisation de l'avoir"
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
            {client.email && (
              <Button 
                variant="outline" 
                onClick={handleSendEmail}
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
