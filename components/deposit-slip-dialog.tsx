'use client';

import { useState, useEffect } from 'react';
import { Client, Collection, ClientCollection, UserProfile, StockUpdate, supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface DepositSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  clientCollections: (ClientCollection & { collection?: Collection })[];
  stockUpdates?: StockUpdate[];
}

export function DepositSlipDialog({
  open,
  onOpenChange,
  client,
  clientCollections,
  stockUpdates = []
}: DepositSlipDialogProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [collectionInfos, setCollectionInfos] = useState<Record<string, string>>({});
  const [needsInfoInput, setNeedsInfoInput] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserProfile();
      loadLastInvoiceInfos();
    }
  }, [open, stockUpdates, clientCollections]);

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

  const handleDownloadPDF = async () => {
    setGenerating(true);
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
      const tableData = clientCollections.map((cc) => {
        const collectionName = cc.collection?.name || 'Collection';
        const info = collectionInfos[cc.collection_id || ''] || '';
        const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
        const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
        const stock = cc.current_stock.toString();
        
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
      // Collection: 35%, Infos: 35%, Prix cession HT: 10%, Prix vente conseillé TTC: 10%, Marchandise: 10%
      const columnWidths = [
        tableWidth * 0.35,  // Collection - 35%
        tableWidth * 0.35,  // Infos - 35%
        tableWidth * 0.10,  // Prix de cession (HT) - 10% (exact)
        tableWidth * 0.10,  // Prix de vente conseillé (TTC) - 10% (exact, même taille que précédent)
        tableWidth * 0.10   // Marchandise remise - 10% (exact, même taille que les deux précédentes)
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
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: columnWidths[0] },
          1: { halign: 'left', fontSize: 7, cellWidth: columnWidths[1] },
          2: { halign: 'center', fontSize: 7, cellWidth: columnWidths[2] }, // 10% - Prix de cession HT
          3: { halign: 'center', fontSize: 7, cellWidth: columnWidths[3] }, // 10% - Prix de vente conseillé TTC
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

      doc.save(`bon_depot_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Bon de dépôt téléchargé');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du bon de dépôt');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bon de dépôt</DialogTitle>
        </DialogHeader>

        {loadingProfile ? (
          <div className="py-8 text-center">
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {needsInfoInput && (
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
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {generating ? 'Génération...' : 'Télécharger le bon de dépôt'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

