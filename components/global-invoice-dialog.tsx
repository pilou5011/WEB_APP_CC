'use client';

import { useState, useEffect } from 'react';
import { Client, Invoice, StockUpdate, Product, ClientProduct, UserProfile, supabase } from '@/lib/supabase';
import type { InvoiceAdjustment } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface GlobalInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  invoice: Invoice;
  stockUpdates: StockUpdate[];
  products: Product[];
  clientProducts?: (ClientProduct & { Product?: Product })[];
  onEmailSent?: () => void; // Callback pour rafraîchir les données après envoi
}

export function GlobalInvoiceDialog({
  open,
  onOpenChange,
  client,
  invoice,
  stockUpdates,
  products,
  clientProducts = [],
  onEmailSent
}: GlobalInvoiceDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [adjustments, setAdjustments] = useState<InvoiceAdjustment[] | null>(null); // null = not loaded yet
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (open) {
      setPdfGenerated(false);
      setPdfUrl(null);
      setPdfBlob(null);
      setLoadingProfile(true);
      setLoadingAdjustments(true);
      setAdjustments(null); // Reset to null to indicate not loaded
      loadUserProfile();
      
      // Load invoice adjustments for this invoice
      (async () => {
        try {
          const companyId = await getCurrentUserCompanyId();
          if (!companyId) {
            throw new Error('Non autorisé');
          }

          const { data, error } = await supabase
            .from('invoice_adjustments')
            .select('*')
            .eq('invoice_id', invoice.id)
            .eq('company_id', companyId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          setAdjustments(data || []);
        } catch (e) {
          console.error('Error loading adjustments:', e);
          // Non-blocking for PDF
          setAdjustments([]);
        } finally {
          setLoadingAdjustments(false);
        }
      })();
    }
    
    // Cleanup: revoke blob URL when dialog closes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, invoice.id]);

  // Load stored PDF when dialog opens and data is loaded
  // IMPORTANT: PDFs are now generated automatically when stock is updated
  // This dialog only loads existing PDFs, it never generates new ones
  useEffect(() => {
    if (open && !loadingProfile && !loadingAdjustments && !pdfGenerated && adjustments !== null) {
      setPdfGenerated(true);
      loadStoredPDF();
    }
  }, [open, loadingProfile, loadingAdjustments, pdfGenerated, adjustments]);

  const loadStoredPDF = async () => {
    // Load stored PDF if it exists
    // PDFs are now generated automatically when stock is updated, so we only load existing ones
    if (invoice.invoice_pdf_path) {
      try {
        setGenerating(true);
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(invoice.invoice_pdf_path, 3600); // 1 hour expiry

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
        toast.error('Impossible de charger la facture. Veuillez réessayer plus tard.');
        setGenerating(false);
      }
    } else {
      // No PDF exists yet - this should not happen if stock was updated correctly
      console.warn('No PDF path found for invoice:', invoice.id);
      toast.warning('La facture n\'est pas trouvé dans les documents générés. Veuillez vérifier votre connexion internet.');
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

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const fileName = `Facture_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(invoice.created_at).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Facture téléchargée avec succès');
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
        
        const fileName = `Facture_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(invoice.created_at).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
        
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
            invoiceDate: new Date(invoice.created_at).toLocaleDateString('fr-FR'),
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
            .from('invoices')
            .update({ invoice_email_sent_at: new Date().toISOString() })
            .eq('id', invoice.id)
            .eq('company_id', companyId);
        }

        toast.success(`Facture envoyée avec succès à ${client.email}`);
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
          <DialogTitle>Prévisualisation de la facture</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100 flex items-center justify-center p-2">
          {generating || loadingProfile || loadingAdjustments ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
              <p className="text-slate-600">Chargement des données en cours...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded border border-slate-300 bg-white shadow-lg"
              title="Prévisualisation de la facture"
            />
          ) : (
            <div className="text-center text-slate-600">
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

