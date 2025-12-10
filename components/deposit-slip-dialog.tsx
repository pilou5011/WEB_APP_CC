'use client';

import { useState, useEffect } from 'react';
import { Client, Collection, ClientCollection, UserProfile, StockUpdate, Invoice, supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DepositSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  clientCollections: (ClientCollection & { collection?: Collection })[];
  stockUpdates?: StockUpdate[];
  invoice?: Invoice | null;
}

export function DepositSlipDialog({
  open,
  onOpenChange,
  client,
  clientCollections,
  stockUpdates = [],
  invoice = null
}: DepositSlipDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [collectionInfos, setCollectionInfos] = useState<Record<string, string>>({});
  const [needsInfoInput, setNeedsInfoInput] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  useEffect(() => {
    if (open) {
      setPdfGenerated(false);
      setPdfUrl(null);
      setPdfBlob(null);
      setLoadingProfile(true);
      loadUserProfile();
      loadLastInvoiceInfos();
    }
  }, [open, stockUpdates, clientCollections]);

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
    if (open && !loadingProfile && !pdfGenerated && !needsInfoInput) {
      setPdfGenerated(true);
      loadStoredPDFOrGenerate();
    }
  }, [open, loadingProfile, pdfGenerated, needsInfoInput]);

  const loadStoredPDFOrGenerate = async () => {
    // First, try to load stored PDF if it exists
    if (invoice?.deposit_slip_pdf_path) {
      try {
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
      } catch (error) {
        console.warn('Could not load stored PDF, will generate new one:', error);
        // Fall through to generate new PDF
      }
    }
    
    // If no stored PDF or loading failed, generate new one
    generatePDFPreview();
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
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

  const loadLastInvoiceInfos = async () => {
    try {
      // Check if there's at least one invoice for this client
      const { data: lastInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invoiceError && invoiceError.code !== 'PGRST116') throw invoiceError;

      if (lastInvoice && stockUpdates.length > 0) {
        // If invoice exists, get collection_info from last stock update for each collection
        // (same logic as in the client page)
        const infos: Record<string, string> = {};
        clientCollections.forEach((cc) => {
          // Find the last stock update for this collection (most recent, regardless of collection_info)
          const lastUpdate = stockUpdates.find(
            (update: StockUpdate) => 
              update.collection_id === cc.collection_id
          );
          
          if (cc.collection_id) {
            infos[cc.collection_id] = lastUpdate?.collection_info || '';
          }
        });
        setCollectionInfos(infos);
        setNeedsInfoInput(false);
      } else {
        // No invoice yet or no stock updates, user needs to input infos
        setNeedsInfoInput(true);
        const infos: Record<string, string> = {};
        clientCollections.forEach(cc => {
          if (cc.collection_id) {
            infos[cc.collection_id] = '';
          }
        });
        setCollectionInfos(infos);
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
      
      // Sauter une ligne
      yPosition += 4;
      
      // Nom du distributeur en gras et police plus grande
      if (userProfile && userProfile.company_name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(userProfile.company_name, leftBoxX + 2, yPosition);
        yPosition += 5;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (userProfile) {
        // Nom/Prénom
        if (userProfile.first_name || userProfile.last_name) {
          const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
          doc.text(fullName, leftBoxX + 2, yPosition);
          yPosition += 4;
        }
        
        // A1 - Espacement entre nom/prénom et adresse
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
        
        // A2 - Espacement entre email et SIRET
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
        
        // Espacement entre TVA et TEL
        if (userProfile.tva_number && userProfile.phone) {
          yPosition += 2;
        }
        
        // Téléphone en dessous de TVA en police 11 et gras
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
      
      // En-tête DÉTAILLANT centré et encadré
      doc.setFillColor(71, 85, 105);
      doc.rect(rightBoxX, clientYPosition, rightBoxWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DÉTAILLANT', rightBoxX + rightBoxWidth / 2, clientYPosition + 5, { align: 'center' });
      clientYPosition += 7;
      
      doc.setTextColor(0, 0, 0);
      
      // Sauter une ligne
      clientYPosition += 4;
      
      // Nom de la société en gras et police plus grande (utiliser company_name si disponible, sinon name)
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
        clientYPosition += 3; // Même espacement que N° Facture
      }
      
      const rightBoxHeight = clientYPosition - rightBoxY + 1;
      doc.rect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight);

      // Encart numéro de client (en dessous du DÉTAILLANT)
      // B3 - Abaisser l'encart pour qu'il ne soit pas caché
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

      // Position après les encarts
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

      // 3) Tableau des collections (Collection, Infos, Prix de cession (HT), Prix de vente conseillé (TTC), Marchandise remise)
      // Sort by display_order
      const sortedCollections = [...clientCollections].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Create a map of stock updates by collection_id for quick lookup
      const stockUpdatesMap = new Map<string, StockUpdate>();
      stockUpdates.forEach((update) => {
        if (update.collection_id) {
          stockUpdatesMap.set(update.collection_id, update);
        }
      });
      
      const tableData = sortedCollections.map((cc) => {
        const collectionName = cc.collection?.name || 'Collection';
        const info = collectionInfos[cc.collection_id || ''] || '';
        const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
        const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
        
        // Use new_stock from stock update if available (for historical deposit slips), otherwise use current_stock
        const stockUpdate = stockUpdatesMap.get(cc.collection_id || '');
        const stock = stockUpdate ? stockUpdate.new_stock.toString() : cc.current_stock.toString();
        
        return [
          collectionName,
          info,
          `${effectivePrice.toFixed(2)} €`,
          effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
          stock
        ];
      });

      // Calculer la largeur disponible pour le tableau (en tenant compte des marges)
      const marginLeft = 15;
      const marginRight = 15;
      const tableWidth = pageWidth - marginLeft - marginRight;

      // Définir les largeurs des colonnes : les 3 dernières colonnes doivent avoir exactement 10% chacune
      // Collection: 35%, Infos: 30% (réduit), Prix cession HT: 10%, Prix vente conseillé TTC: 10%, Marchandise: 15% (élargi)
      const columnWidths = [
        tableWidth * 0.35,  // Collection - 35%
        tableWidth * 0.30,  // Infos - 30% (réduit de 35% à 30%)
        tableWidth * 0.10,  // Prix de cession (HT) - 10% (exact)
        tableWidth * 0.10,  // Prix de vente conseillé (TTC) - 10% (exact, même taille que précédent)
        tableWidth * 0.15   // Marchandise remise - 15% (élargi de 10% à 15%)
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [[
          'Collection', 
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
          textColor: [0, 0, 0] // Noir pour toutes les valeurs du tableau
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: columnWidths[0] },
          1: { halign: 'left', fontSize: 7, cellWidth: columnWidths[1] },
          2: { halign: 'center', fontSize: 8, cellWidth: columnWidths[2] }, // 10% - Prix de cession HT (police augmentée)
          3: { halign: 'center', fontSize: 8, cellWidth: columnWidths[3] }, // 10% - Prix de vente conseillé TTC (police augmentée)
          4: { halign: 'center', fontSize: 8, cellWidth: columnWidths[4] }  // 10% - Marchandise remise
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

      // Generate PDF blob for preview
      const pdfBlobData = doc.output('blob');
      const url = URL.createObjectURL(pdfBlobData);
      
      setPdfBlob(pdfBlobData);
      setPdfUrl(url);

      // Save PDF to storage ONLY if it doesn't exist yet
      // IMPORTANT: Documents are immutable - never overwrite or update existing PDFs
      // This ensures that once a document is generated, it remains unchanged forever
      if (invoice && !invoice.deposit_slip_pdf_path) {
        try {
          const filePath = `invoices/${invoice.id}/deposit_slip_${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, pdfBlobData, {
              contentType: 'application/pdf',
              upsert: false // Never overwrite - documents are immutable
            });

          if (uploadError) {
            // Check if error is due to file already existing (this is expected if PDF was already saved)
            if (uploadError.message?.includes('already exists') || 
                uploadError.message?.includes('duplicate') ||
                uploadError.message?.includes('409')) {
              console.log('PDF already exists, not overwriting (document is immutable):', filePath);
            } else if (uploadError.message?.includes('Bucket not found') || 
                uploadError.message?.includes('not found') ||
                uploadError.message?.includes('permission denied') ||
                uploadError.message?.includes('policy')) {
              console.warn('Storage bucket "documents" not accessible. Please check:', {
                message: '1. Bucket exists in Supabase Dashboard',
                message2: '2. RLS policies are configured (see STORAGE_SETUP.md)',
                message3: '3. Bucket name is exactly "documents"',
                error: uploadError.message
              });
            } else {
              // Log other errors
              console.warn('Error uploading PDF to storage:', {
                error: uploadError,
                message: uploadError.message,
                filePath: filePath
              });
            }
            // Non-blocking: continue even if save fails
          } else if (uploadData) {
            // Update invoice with PDF path ONLY if it doesn't exist yet
            const { error: updateError } = await supabase
              .from('invoices')
              .update({ deposit_slip_pdf_path: filePath })
              .eq('id', invoice.id)
              .is('deposit_slip_pdf_path', null); // Only update if deposit_slip_pdf_path is null
            
            if (updateError) {
              console.warn('Error updating invoice with PDF path:', updateError);
            } else {
              console.log('PDF saved successfully (document is now immutable):', filePath);
            }
          }
        } catch (error) {
          console.warn('Could not save PDF to storage:', error);
          // Non-blocking: continue even if save fails
        }
      } else {
        console.log('PDF already exists for this invoice, not overwriting (document is immutable)');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
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
                Aucune facture trouvée pour ce client. Veuillez renseigner les informations pour chaque collection :
              </p>
              {clientCollections.map((cc) => (
                <div key={cc.id}>
                  <Label htmlFor={`info-${cc.id}`}>
                    Infos pour {cc.collection?.name || 'Collection'}
                  </Label>
                  <Input
                    id={`info-${cc.id}`}
                    type="text"
                    value={collectionInfos[cc.collection_id || ''] || ''}
                    onChange={(e) => setCollectionInfos(prev => ({
                      ...prev,
                      [cc.collection_id || '']: e.target.value
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
            {/* Espace réservé pour d'éventuels boutons futurs */}
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

