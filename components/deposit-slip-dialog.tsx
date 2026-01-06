'use client';

import { useState, useEffect } from 'react';
import { Client, Product, ClientProduct, UserProfile, StockUpdate, Invoice, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface DepositSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  clientProducts: (ClientProduct & { product?: Product })[];
  stockUpdates?: StockUpdate[];
  invoice?: Invoice | null;
  generateMode?: boolean; // Si true, génère un nouveau PDF à chaque fois sans le sauvegarder
}

export function DepositSlipDialog({
  open,
  onOpenChange,
  client,
  clientProducts,
  stockUpdates = [],
  invoice = null,
  generateMode = false
}: DepositSlipDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingInfos, setLoadingInfos] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [productInfos, setProductInfos] = useState<Record<string, string>>({});
  const [needsInfoInput, setNeedsInfoInput] = useState(false);
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
      setLoadingInfos(false);
      loadUserProfile();
      
      // En mode génération, charger les infos depuis la dernière mise à jour de stock
      // On génère directement avec les infos disponibles (ou vides)
      if (!generateMode) {
        loadLastInvoiceInfos();
      } else {
        // En mode génération, charger les product_info depuis la dernière mise à jour de stock
        setLoadingInfos(true);
        loadLastStockUpdateInfos().finally(() => {
          setLoadingInfos(false);
        });
        setNeedsInfoInput(false); // Ne pas demander les infos en mode génération
      }
    }
  }, [open, stockUpdates, clientProducts, generateMode]);

  // Cleanup: revoke blob URL when dialog closes or pdfUrl changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Load stored PDF or generate new one when dialog opens and data is loaded
  useEffect(() => {
    if (open && !loadingProfile && !pdfGenerated) {
      // En mode génération, attendre que les infos soient chargées avant de générer
      if (generateMode) {
        if (!loadingInfos) {
          setPdfGenerated(true);
          generatePDFPreview();
        }
      } else if (!needsInfoInput) {
        // Mode chargement : charger le PDF existant depuis le bucket
        setPdfGenerated(true);
        loadStoredPDF();
      }
    }
  }, [open, loadingProfile, loadingInfos, pdfGenerated, needsInfoInput, generateMode]);

  const loadStoredPDF = async () => {
    // Load stored PDF if it exists
    // PDFs are now generated automatically when stock is updated, so we only load existing ones
    if (invoice?.deposit_slip_pdf_path) {
      try {
        setGenerating(true);
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(invoice.deposit_slip_pdf_path, 3600); // 1 hour expiry

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
        toast.error('Impossible de charger le bon de dépôt. Veuillez réessayer plus tard.');
        setGenerating(false);
      }
    } else {
      // No PDF exists yet - this should not happen if stock was updated correctly
      console.warn('No PDF path found for deposit slip:', invoice?.id);
      toast.warning('Le bon de dépôt n\'est pas trouvé dans les documents générés. Veuillez vérifier votre connexion internet.');
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

  const loadLastStockUpdateInfos = async (): Promise<void> => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Charger toutes les mises à jour de stock pour ce client
      const { data: allStockUpdates, error: stockUpdatesError } = await supabase
        .from('stock_updates')
        .select('*')
        .eq('client_id', client.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (stockUpdatesError) throw stockUpdatesError;

      // Créer un map pour stocker la dernière product_info de chaque produit
      const infos: Record<string, string> = {};
      const processedProducts = new Set<string>();

      // Parcourir les stock_updates triés par date décroissante
      // Pour chaque produit, prendre la première occurrence (la plus récente)
      // IMPORTANT: Ne prendre que les stock_updates pour les produits (pas les sous-produits)
      (allStockUpdates || []).forEach((update: StockUpdate) => {
        if (update.product_id && !update.sub_product_id && !processedProducts.has(update.product_id)) {
          infos[update.product_id] = update.product_info || '';
          processedProducts.add(update.product_id);
        }
      });

      // Initialiser les infos vides pour les produits qui n'ont pas de stock_update
      clientProducts.forEach(cp => {
        if (cp.product_id && !infos[cp.product_id]) {
          infos[cp.product_id] = '';
        }
      });

      setProductInfos(infos);
    } catch (error) {
      console.error('Error loading last stock update infos:', error);
      // En cas d'erreur, initialiser avec des infos vides
      const infos: Record<string, string> = {};
      clientProducts.forEach(cp => {
        if (cp.product_id) {
          infos[cp.product_id] = '';
        }
      });
      setProductInfos(infos);
    }
  };

  const loadLastInvoiceInfos = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Check if there's at least one invoice for this client
      const { data: lastInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', client.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invoiceError && invoiceError.code !== 'PGRST116') throw invoiceError;

      if (lastInvoice && stockUpdates.length > 0) {
        // If invoice exists, get product_info from last stock update for each product
        // (same logic as in the client page)
        const infos: Record<string, string> = {};
        clientProducts.forEach((cp) => {
          // Find the last stock update for this product (most recent, regardless of product_info)
          const lastUpdate = stockUpdates.find(
            (update: StockUpdate) => 
              update.product_id === cp.product_id
          );
          
          if (cp.product_id) {
            infos[cp.product_id] = lastUpdate?.product_info || '';
          }
        });
        setProductInfos(infos);
        setNeedsInfoInput(false);
      } else {
        // No invoice yet or no stock updates, user needs to input infos
        setNeedsInfoInput(true);
        const infos: Record<string, string> = {};
        clientProducts.forEach(cp => {
          if (cp.product_id) {
            infos[cp.product_id] = '';
          }
        });
        setProductInfos(infos);
      }
    } catch (error) {
      console.error('Error loading last invoice infos:', error);
      setNeedsInfoInput(true);
    }
  };

  const generatePDFPreview = async () => {
    setGenerating(true);
    // Revoke previous URL if exists
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // 1) Encart DISTRIBUTEUR (haut gauche) - ENCADRÉ
      const leftBoxX = 15;
      const leftBoxY = yPosition;
      const leftBoxWidth = 85;
      let leftBoxHeight = 5;
      
      // En-tête DISTRIBUTEUR centré et encadré
      doc.setFillColor(71, 85, 105);
      doc.rect(leftBoxX, leftBoxY, leftBoxWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DISTRIBUTEUR', leftBoxX + leftBoxWidth / 2, yPosition + 5, { align: 'center' });
      yPosition += 7;
      
      doc.setTextColor(0, 0, 0);
      yPosition += 4;
      
      if (userProfile && userProfile.company_name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(userProfile.company_name, leftBoxX + 2, yPosition);
        yPosition += 5;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (userProfile) {
        if (userProfile.first_name || userProfile.last_name) {
          const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
          doc.text(fullName, leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
        if (userProfile.street_address) {
          doc.text(userProfile.street_address, leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        if (userProfile.postal_code || userProfile.city) {
          doc.text(`${userProfile.postal_code || ''} ${userProfile.city || ''}`.trim(), leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        if (userProfile.email) {
          doc.text(`Email: ${userProfile.email}`, leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        if (userProfile.email && userProfile.siret) {
          yPosition += 2;
        }
        if (userProfile.siret) {
          doc.text(`SIRET: ${userProfile.siret}`, leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        if (userProfile.tva_number) {
          doc.text(`TVA: ${userProfile.tva_number}`, leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        if (userProfile.tva_number && userProfile.phone) {
          yPosition += 2;
        }
        if (userProfile.phone) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Tél: ${userProfile.phone}`, leftBoxX + 2, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          yPosition += 3;
        }
      } else {
        doc.text('Informations non renseignées', leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      
      leftBoxHeight = yPosition - leftBoxY + 1;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(leftBoxX, leftBoxY, leftBoxWidth, leftBoxHeight);

      // 2) Encart DÉTAILLANT (haut droite) - ENCADRÉ
      const rightBoxX = pageWidth - 95;
      const rightBoxY = 20;
      const rightBoxWidth = 80;
      let clientYPosition = rightBoxY;
      
      doc.setFillColor(71, 85, 105);
      doc.rect(rightBoxX, clientYPosition, rightBoxWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DÉTAILLANT', rightBoxX + rightBoxWidth / 2, clientYPosition + 5, { align: 'center' });
      clientYPosition += 7;
      
      doc.setTextColor(0, 0, 0);
      clientYPosition += 4;
      
      const clientCompanyName = client.company_name || client.name;
      if (clientCompanyName) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(clientCompanyName, rightBoxX + 2, clientYPosition);
        clientYPosition += 5;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (client.street_address) {
        doc.text(client.street_address, rightBoxX + 2, clientYPosition);
        clientYPosition += 4;
      }
      if (client.postal_code || client.city) {
        doc.text(`${client.postal_code || ''} ${client.city || ''}`.trim(), rightBoxX + 2, clientYPosition);
        clientYPosition += 4;
      }
      if (client.siret_number) {
        doc.text(`SIRET: ${client.siret_number}`, rightBoxX + 2, clientYPosition);
        clientYPosition += 4;
      }
      if (client.tva_number) {
        doc.text(`TVA: ${client.tva_number}`, rightBoxX + 2, clientYPosition);
        clientYPosition += 3;
      }
      
      const rightBoxHeight = clientYPosition - rightBoxY + 1;
      doc.rect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight);

      // Encart numéro de client
      clientYPosition += 6;
      const infoBoxY = clientYPosition;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      clientYPosition += 4;
      
      if (client.client_number) {
        doc.text(`N° Client: ${client.client_number}`, rightBoxX + 2, clientYPosition);
        clientYPosition += 3;
      }
      
      const infoBoxHeight = clientYPosition - infoBoxY + 1;
      doc.rect(rightBoxX, infoBoxY, rightBoxWidth, infoBoxHeight);

      yPosition = Math.max(yPosition, clientYPosition) + 10;

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 15, yPosition);
      yPosition += 10;

      // Titre "Bon de dépôt"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Bon de dépôt', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Tableau des produits
      const sortedProducts = [...clientProducts].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      const stockUpdatesMap = new Map<string, StockUpdate>();
      stockUpdates.forEach((update) => {
        if (update.product_id) {
          stockUpdatesMap.set(update.product_id, update);
        }
      });

      const tableData = sortedProducts.map((cp) => {
        const productName = cp.product?.name || 'Produit';
        const info = productInfos[cp.product_id || ''] || '';
        const effectivePrice = cp.custom_price ?? cp.product?.price ?? 0;
        const effectiveRecommendedSalePrice = cp.custom_recommended_sale_price ?? cp.product?.recommended_sale_price ?? null;
        
        // Use new_stock from stock update if available, otherwise use current_stock
        const stockUpdate = stockUpdatesMap.get(cp.product_id || '');
        const stock = stockUpdate ? stockUpdate.new_stock.toString() : cp.current_stock.toString();
        
        return [
          productName,
          info,
          `${effectivePrice.toFixed(2)} €`,
          effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
          stock
        ];
      });

      const marginLeft = 15;
      const marginRight = 15;
      const tableWidth = pageWidth - marginLeft - marginRight;
      
      const columnWidths = [
        tableWidth * 0.35,
        tableWidth * 0.30,
        tableWidth * 0.10,
        tableWidth * 0.10,
        tableWidth * 0.15
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [[
          'Produit', 
          'Infos', 
          { content: 'Prix de\ncession\n(HT)', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
          { content: 'Prix de vente\nconseillé\n(TTC)', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
          { content: 'Marchandise\nremise', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }
        ]],
        body: tableData,
        theme: 'grid',
        margin: { left: marginLeft, right: marginRight },
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 2,
          overflow: 'linebreak'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: columnWidths[0] },
          1: { halign: 'left', fontSize: 7, cellWidth: columnWidths[1] },
          2: { halign: 'center', fontSize: 8, cellWidth: columnWidths[2] },
          3: { halign: 'center', fontSize: 8, cellWidth: columnWidths[3] },
          4: { halign: 'center', fontSize: 8, cellWidth: columnWidths[4] }
        }
      });

      // Conditions de Dépôt-Vente en bas de page
      const footerY = pageHeight - 20;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      
      const conditionsText = [
        "Conditions de Dépôt-Vente : La marchandise et les présentoirs mis en dépôt restent la propriété de Castel Carterie SAS. Le dépositaire s'engage à régler comptant",
        "les produits vendus à la date d'émission de la facture. Le dépositaire s'engage à assurer la marchandise et les présentoirs contre tous les risques (vol, incendie, dégâts",
        "des eaux,…). En cas d'une saisie, le client s'engage à informer l'huissier de la réserve de propriété de Castel Carterie SAS. Tout retard de paiement entraîne une indemnité",
        "forfaitaire de 40 € + pénalités de retard de 3 fois le taux d'intérêt légal."
      ];
      
      conditionsText.forEach((line, index) => {
        doc.text(line, 15, footerY + (index * 3.5));
      });

      // Generate PDF blob for preview (NE PAS SAUVEGARDER)
      const pdfBlobData = doc.output('blob');
      const url = URL.createObjectURL(pdfBlobData);
      
      setPdfBlob(pdfBlobData);
      setPdfUrl(url);
      setGenerating(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const fileName = `bon_depot_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Bon de dépôt téléchargé');
    } else {
      toast.error('Veuillez patienter, le PDF est en cours de génération');
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
        
        const fileName = `bon_depot_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Déterminer la date de génération : utiliser invoice.created_at si disponible, sinon date actuelle
        const generationDate = invoice?.created_at 
          ? new Date(invoice.created_at).toLocaleDateString('fr-FR')
          : new Date().toLocaleDateString('fr-FR');
        
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
            documentType: 'deposit_slip',
            creditNoteDate: generationDate, // Réutiliser ce champ pour la date de génération du bon de dépôt
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

        toast.success(`Bon de dépôt envoyé avec succès à ${client.email}`);
        setSendingEmail(false);
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
          <DialogTitle>Prévisualisation du bon de dépôt</DialogTitle>
          <DialogDescription className="sr-only">
            Visualisez et téléchargez le bon de dépôt pour ce client
          </DialogDescription>
        </DialogHeader>

        {needsInfoInput ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Aucune facture trouvée pour ce client. Veuillez renseigner les informations pour chaque produit :
              </p>
              {clientProducts.map((cp) => (
                <div key={cp.id}>
                  <Label htmlFor={`info-${cp.id}`}>
                    Infos pour {cp.product?.name || 'Produit'}
                  </Label>
                  <Input
                    id={`info-${cp.id}`}
                    type="text"
                    value={productInfos[cp.product_id || ''] || ''}
                    onChange={(e) => setProductInfos(prev => ({
                      ...prev,
                      [cp.product_id || '']: e.target.value
                    }))}
                    placeholder="Ex: Livraison partielle, Retour prévu..."
                    className="mt-1.5"
                  />
                </div>
              ))}
              <Button
                onClick={() => {
                  setNeedsInfoInput(false);
                  setPdfGenerated(false);
                }}
                className="w-full"
              >
                Générer le bon de dépôt
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-slate-100 flex items-center justify-center p-2">
            {generating || loadingProfile ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
                <p className="text-slate-600">Génération du PDF en cours...</p>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded border border-slate-300 bg-white shadow-lg"
                title="Prévisualisation du bon de dépôt"
              />
            ) : (
              <div className="text-center text-slate-600">
                <p>Erreur lors de la génération du PDF</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center gap-3 px-6 py-3 border-t bg-white flex-shrink-0">
          <div className="flex gap-2">
            {client.email && (
              <Button 
                variant="outline" 
                onClick={handleSendEmail}
                disabled={!pdfBlob || generating || sendingEmail || needsInfoInput}
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
            <Button onClick={handleDownloadPDF} disabled={!pdfBlob || generating || needsInfoInput}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

