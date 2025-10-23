'use client';

import { useState, useEffect } from 'react';
import { Client, Invoice, StockUpdate, Collection, ClientCollection, UserProfile, supabase } from '@/lib/supabase';
import type { InvoiceAdjustment } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Package, Euro, Printer, Download } from 'lucide-react';
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

  useEffect(() => {
    if (open) {
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
  }, [open]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
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
      
      // Générer un numéro de facture basé sur la date et l'ID
      const invoiceNumber = `F${new Date(invoice.created_at).getFullYear()}${(new Date(invoice.created_at).getMonth() + 1).toString().padStart(2, '0')}${new Date(invoice.created_at).getDate().toString().padStart(2, '0')}-${invoice.id.substring(0, 8).toUpperCase()}`;
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
      const stockRows = stockUpdates.map((update) => {
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
          fontSize: 9
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
          fontStyle: 'bold'
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

      // Télécharger le PDF
      const fileName = `Facture_${client.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(invoice.created_at).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast.success('Facture téléchargée avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Facture globale</DialogTitle>
        </DialogHeader>

        <div className="bg-white p-8 print:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">FACTURE GLOBALE</h1>
            <p className="text-slate-600">Dépôt-vente de cartes de vœux</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informations client
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Nom : </span>
                  <span className="font-medium">{client.name}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{client.address}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Détails de l'opération
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Date : </span>
                  <span className="font-medium">
                    {new Date(invoice.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Heure : </span>
                  <span className="font-medium">
                    {new Date(invoice.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Détail par collection</h3>
            <div className="space-y-4">
              {stockUpdates.map((update) => {
                const collection = collections.find(c => c.id === update.collection_id);
                const clientCollection = clientCollections.find(cc => cc.collection_id === update.collection_id);
                // Use custom price if set, otherwise use default collection price
                const effectivePrice = clientCollection?.custom_price ?? collection?.price ?? 0;
                const amount = update.cards_sold * effectivePrice;
                const isCustomPrice = clientCollection?.custom_price !== null;
                
                return (
                  <div key={update.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {collection?.name || 'Collection inconnue'}
                        </p>
                        <p className="text-sm text-slate-500">
                          Prix unitaire : {effectivePrice.toFixed(2)} €
                          {isCustomPrice && <span className="ml-1 text-blue-600">(personnalisé)</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Montant</p>
                        <p className="text-lg font-bold text-slate-900">
                          {amount.toFixed(2)} €
                        </p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="p-2 text-slate-600">Stock précédent</td>
                            <td className="p-2 text-right font-medium">{update.previous_stock}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-600">Stock compté</td>
                            <td className="p-2 text-right font-medium">{update.counted_stock}</td>
                          </tr>
                          <tr className="bg-orange-50">
                            <td className="p-2 font-medium text-orange-900">Cartes vendues</td>
                            <td className="p-2 text-right font-bold text-orange-900">{update.cards_sold}</td>
                          </tr>
                          {update.cards_added > 0 && (
                            <>
                              <tr>
                                <td className="p-2 text-slate-600">Nouvelles cartes ajoutées</td>
                                <td className="p-2 text-right font-medium text-green-600">+{update.cards_added}</td>
                              </tr>
                              <tr className="bg-blue-50">
                                <td className="p-2 font-medium text-blue-900">Nouveau stock total</td>
                                <td className="p-2 text-right font-bold text-blue-900">{update.new_stock}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Récapitulatif de facturation
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-700">
                <span>Nombre de collections</span>
                <span className="font-medium">{stockUpdates.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Total cartes vendues</span>
                <span className="font-medium">{invoice.total_cards_sold}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-slate-900">Montant total dû</span>
                <span className="text-3xl font-bold text-slate-900">{invoice.total_amount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            <p>Document généré automatiquement le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleDownloadPDF} disabled={generating || loadingProfile}>
            <Download className="mr-2 h-4 w-4" />
            {generating ? 'Génération...' : 'Télécharger la facture'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

