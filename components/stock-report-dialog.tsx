'use client';

import { useState, useEffect } from 'react';
import { Client, Collection, ClientCollection, UserProfile, StockUpdate, supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StockReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  clientCollections: (ClientCollection & { collection?: Collection })[];
  stockUpdates: StockUpdate[];
}

export function StockReportDialog({
  open,
  onOpenChange,
  client,
  clientCollections,
  stockUpdates
}: StockReportDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
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
    }
  }, [open]);

  // Cleanup: revoke blob URL when dialog closes or pdfUrl changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Generate PDF preview when dialog opens and data is loaded
  useEffect(() => {
    if (open && !loadingProfile && !pdfGenerated) {
      setPdfGenerated(true);
      generatePDFPreview();
    }
  }, [open, loadingProfile, pdfGenerated]);

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
        
        // Espacement entre nom/prénom et adresse
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
        
        // Espacement entre email et SIRET
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
        clientYPosition += 3;
      }
      
      const rightBoxHeight = clientYPosition - rightBoxY + 1;
      doc.rect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight);

      // Encart numéro de client (en dessous du DÉTAILLANT)
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

      // Titre "Relevé de stock"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Relevé de stock', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // 3) Tableau des collections avec les colonnes supplémentaires
      // Sort by display_order
      const sortedCollections = [...clientCollections].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Créer un map pour trouver rapidement les stock updates par collection_id
      const stockUpdatesMap = new Map<string, StockUpdate>();
      stockUpdates.forEach(update => {
        if (update.collection_id) {
          stockUpdatesMap.set(update.collection_id, update);
        }
      });

      const tableData = sortedCollections.map((cc) => {
        const collectionName = cc.collection?.name || 'Collection';
        const info = ''; // Pas d'info pour le relevé de stock
        const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
        const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
        const stock = cc.current_stock.toString();
        
        // Récupérer les données du stock update pour cette collection
        const stockUpdate = stockUpdatesMap.get(cc.collection_id || '');
        const previousStock = stockUpdate?.previous_stock ?? cc.current_stock;
        const countedStock = stockUpdate?.counted_stock ?? 0;
        const newDeposit = stockUpdate?.new_stock ?? cc.current_stock; // Nouveau dépôt
        // Réassort = Nouveau dépôt - Stock compté
        const reassort = stockUpdate ? (newDeposit - countedStock) : 0;
        
        return [
          collectionName,
          info,
          `${effectivePrice.toFixed(2)} €`,
          effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
          previousStock.toString(), // Ancien dépôt
          countedStock.toString(), // Stock compté
          reassort.toString(), // Réassort = Nouveau dépôt - Stock compté
          newDeposit.toString() // Nouveau dépôt
        ];
      });

      // Calculer la largeur disponible pour le tableau
      // Aligner la bordure droite du tableau avec la bordure droite de l'encart DÉTAILLANT
      const marginLeft = leftBoxX; // 15 - aligné avec l'encart DISTRIBUTEUR
      const rightBoxRightEdge = rightBoxX + rightBoxWidth; // Bordure droite de l'encart DÉTAILLANT
      const marginRight = pageWidth - rightBoxRightEdge; // Marge droite pour aligner avec l'encart DÉTAILLANT
      const tableWidth = pageWidth - marginLeft - marginRight;

      // Définir les largeurs des colonnes : 8 colonnes au total
      // On calcule d'abord les largeurs fixes pour les colonnes de données (hors Collection)
      const fixedColumnsWidth = tableWidth * (0.15 + 0.08 + 0.08 + 0.08 + 0.08 + 0.08 + 0.08); // Infos + 6 colonnes de 8%
      // La colonne Collection prend tout l'espace restant pour que le total soit exactement tableWidth
      const collectionColumnWidth = tableWidth - fixedColumnsWidth;
      
      const columnWidths = [
        collectionColumnWidth,  // Collection - largeur ajustée pour aligner avec l'encart DÉTAILLANT
        tableWidth * 0.15,      // Infos - 15%
        tableWidth * 0.08,       // Prix de cession (HT) - 8%
        tableWidth * 0.08,       // Prix de vente conseillé (TTC) - 8%
        tableWidth * 0.08,       // Ancien dépôt - 8%
        tableWidth * 0.08,       // Stock compté - 8%
        tableWidth * 0.08,       // Réassort - 8%
        tableWidth * 0.08         // Nouveau dépôt - 8%
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [[
          'Collection', 
          'Infos', 
          { content: 'Prix de\ncession\n(HT)', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
          { content: 'Prix de vente\nconseillé\n(TTC)', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
          { content: 'Ancien\ndépôt', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
          { content: 'Stock\ncompté', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
          { content: 'Réassort', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
          { content: 'Nouveau\ndépôt', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }
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
          0: { cellWidth: columnWidths[0], halign: 'left' },
          1: { cellWidth: columnWidths[1], halign: 'left' },
          2: { cellWidth: columnWidths[2], halign: 'center' },
          3: { cellWidth: columnWidths[3], halign: 'center' },
          4: { cellWidth: columnWidths[4], halign: 'center' },
          5: { cellWidth: columnWidths[5], halign: 'center' },
          6: { cellWidth: columnWidths[6], halign: 'center' },
          7: { cellWidth: columnWidths[7], halign: 'center' }
        },
        styles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        }
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
              title="Prévisualisation du relevé de stock"
            />
          ) : (
            <div className="text-center text-slate-600">
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

