'use client';

import { useState, useEffect } from 'react';
import { Client, Invoice, StockUpdate, Collection, ClientCollection, UserProfile, supabase } from '@/lib/supabase';
import type { InvoiceAdjustment } from '@/lib/supabase';
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
  collections: Collection[];
  clientCollections?: (ClientCollection & { collection?: Collection })[];
}

export function GlobalInvoiceDialog({
  open,
  onOpenChange,
  client,
  invoice,
  stockUpdates,
  collections,
  clientCollections = []
}: GlobalInvoiceDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [adjustments, setAdjustments] = useState<InvoiceAdjustment[]>([]);
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
      loadUserProfile();
      
      // Load invoice adjustments for this invoice
      (async () => {
        try {
          const { data, error } = await supabase
            .from('invoice_adjustments')
            .select('*')
            .eq('invoice_id', invoice.id)
            .order('created_at', { ascending: true });
          if (error) throw error;
          setAdjustments(data || []);
        } catch (e) {
          // Non-blocking for PDF
          setAdjustments([]);
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

  // Generate PDF preview when dialog opens and data is loaded
  useEffect(() => {
    if (open && !loadingProfile && !pdfGenerated && adjustments !== undefined) {
      setPdfGenerated(true);
      generatePDFPreview();
    }
  }, [open, loadingProfile, pdfGenerated, adjustments]);

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

      // Définir les marges globales pour l'alignement vertical des bordures
      const globalLeftMargin = 15;
      const globalRightMargin = 15;
      
      // 1) Encart DISTRIBUTEUR (haut gauche) - ENCADRÉ
      const leftBoxX = globalLeftMargin;
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
      const rightBoxWidth = 80;
      const rightBoxX = pageWidth - globalRightMargin - rightBoxWidth;
      const rightBoxY = 20;
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
      
      // Nom du client en gras et police plus grande
      if (client.name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(client.name, rightBoxX + 2, clientYPosition);
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
      
      if (client.rcs_number) {
        doc.text(`RCS: ${client.rcs_number}`, rightBoxX + 2, clientYPosition);
        clientYPosition += 4;
      }
      if (client.naf_code) {
        doc.text(`NAF: ${client.naf_code}`, rightBoxX + 2, clientYPosition);
        clientYPosition += 3; // Même espacement que N° Facture
      }
      
      const rightBoxHeight = clientYPosition - rightBoxY + 1;
      doc.rect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight);

      // Encart numéro de client et numéro de facture (en dessous du DÉTAILLANT)
      // B3 - Abaisser l'encart pour qu'il ne soit pas caché
      clientYPosition += 6;
      const infoBoxY = clientYPosition;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      clientYPosition += 4;
      
      if (client.client_number) {
        doc.text(`N° Client: ${client.client_number}`, rightBoxX + 2, clientYPosition);
        clientYPosition += 5;
      }
      
      // Utiliser le numéro de facture stocké dans la base de données
      const invoiceNumber = invoice.invoice_number || 'N/A';
      doc.text(`N° Facture: ${invoiceNumber}`, rightBoxX + 2, clientYPosition);
      clientYPosition += 3;
      
      const infoBoxHeight = clientYPosition - infoBoxY + 1;
      doc.rect(rightBoxX, infoBoxY, rightBoxWidth, infoBoxHeight);

      // Date de la facture
      yPosition = Math.max(yPosition, clientYPosition) + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`, globalLeftMargin, yPosition);
      yPosition += 10;

      // 3) Tableau des collections
      // Sort stock updates by collection display_order
      const sortedStockUpdates = [...stockUpdates].sort((a, b) => {
        const aCC = clientCollections.find(cc => cc.collection_id === a.collection_id);
        const bCC = clientCollections.find(cc => cc.collection_id === b.collection_id);
        const aOrder = aCC?.display_order || 0;
        const bOrder = bCC?.display_order || 0;
        return aOrder - bOrder;
      });
      const stockRows = sortedStockUpdates.map((update) => {
        const collection = collections.find(c => c.id === update.collection_id);
        const clientCollection = clientCollections.find(cc => cc.collection_id === update.collection_id);
        const effectivePrice = clientCollection?.custom_price ?? collection?.price ?? 0;
        const totalHT = update.cards_sold * effectivePrice;
        
        return [
          collection?.name || 'Collection',
          update.collection_info || '', // Infos optionnelles
          collection?.barcode || '', // Code barre produit
          update.previous_stock.toString(),
          update.counted_stock.toString(),
          update.cards_sold.toString(),
          effectivePrice.toFixed(2) + ' €',
          totalHT.toFixed(2) + ' €'
        ];
      });

      const adjustmentRows = (adjustments || []).map((adj) => {
        const amt = Number(adj.amount);
        const amtStr = (isNaN(amt) ? '0.00' : amt.toFixed(2)) + ' €';
        const quantity = adj.quantity || '';
        const unitPrice = adj.unit_price ? (Number(adj.unit_price).toFixed(2) + ' €') : '';
        return [
          adj.operation_name || 'Ajustement',
          '',
          '', // Code barre vide pour les ajustements
          '',
          '',
          quantity.toString(),
          unitPrice,
          amtStr
        ];
      });

      const dataRows = [...stockRows, ...adjustmentRows];
      const tableData = [...dataRows];

      autoTable(doc, {
        startY: yPosition,
        head: [['Collection', 'Infos', 'Code Barre\nProduit', 'Marchandise\nremise', 'Marchandise\nreprise', 'Total\nvendu', 'Prix à\nl\'unité', 'Prix TOTAL\nH.T.']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0] // Noir pour toutes les valeurs du tableau
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'left', fontSize: 8 },
          2: { halign: 'center', fontSize: 8 },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: globalLeftMargin, right: globalRightMargin }
      });

      // Calculer les totaux
      const totalHT = stockUpdates.reduce((sum, update) => {
        const collection = collections.find(c => c.id === update.collection_id);
        const clientCollection = clientCollections.find(cc => cc.collection_id === update.collection_id);
        const effectivePrice = clientCollection?.custom_price ?? collection?.price ?? 0;
        return sum + (update.cards_sold * effectivePrice);
      }, 0) + (adjustments || []).reduce((sum, adj) => sum + Number(adj.amount || 0), 0);
      
      const tva = totalHT * 0.20;
      const totalTTC = totalHT + tva;

      // Tableau récapitulatif des totaux (avec espacement de 2 lignes)
      const finalTableY = (doc as any).lastAutoTable.finalY + 8; // Espacement de 2 lignes
      
      // Utiliser les mêmes marges globales pour l'alignement vertical
      autoTable(doc, {
        startY: finalTableY,
        body: [
          ['TOTAL H.T.', totalHT.toFixed(2) + ' €'],
          ['TVA 20%', tva.toFixed(2) + ' €'],
          ['TOTAL T.T.C A PAYER', totalTTC.toFixed(2) + ' €']
        ],
        theme: 'plain',
        bodyStyles: {
          fontSize: 10,
          fontStyle: 'bold',
          textColor: [0, 0, 0] // Noir pour toutes les valeurs du tableau récapitulatif
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' }
        },
        margin: { left: globalLeftMargin, right: globalRightMargin },
        didDrawCell: (data: any) => {
          const { cell, column, cursor } = data;
          
          // Dessiner uniquement les bordures extérieures avec des bordures plus fines
          doc.setLineWidth(0.3);
          doc.setDrawColor(0, 0, 0);
          
          // Bordure gauche (uniquement pour la première colonne)
          if (column.index === 0) {
            doc.line(cursor.x, cursor.y, cursor.x, cursor.y + cell.height);
          }
          
          // Bordure droite (uniquement pour la dernière colonne)
          if (column.index === 1) {
            doc.line(cursor.x + cell.width, cursor.y, cursor.x + cell.width, cursor.y + cell.height);
          }
          
          // Bordure haut
          doc.line(cursor.x, cursor.y, cursor.x + cell.width, cursor.y);
          
          // Bordure bas
          doc.line(cursor.x, cursor.y + cell.height, cursor.x + cell.width, cursor.y + cell.height);
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
        doc.text(line, globalLeftMargin, footerY + (index * 3.5));
      });

      // Generate PDF blob for preview
      const pdfBlobData = doc.output('blob');
      const url = URL.createObjectURL(pdfBlobData);
      
      setPdfBlob(pdfBlobData);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
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
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de l\'envoi');
        }

        toast.success(`Facture envoyée avec succès à ${client.email}`);
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
          <DialogTitle>Prévisualisation de la facture</DialogTitle>
        </DialogHeader>

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

