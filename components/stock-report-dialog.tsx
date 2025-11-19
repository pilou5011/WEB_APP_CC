'use client';

import { useState, useEffect } from 'react';
import { Client, Collection, ClientCollection, UserProfile, StockUpdate, SubProduct, ClientSubProduct, Invoice, supabase } from '@/lib/supabase';
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
  invoice: Invoice | null;
}

export function StockReportDialog({
  open,
  onOpenChange,
  client,
  clientCollections,
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

  useEffect(() => {
    if (open) {
      setPdfGenerated(false);
      setPdfUrl(null);
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

  // Generate PDF preview when dialog opens and data is loaded
  useEffect(() => {
    if (open && !loadingProfile && !loadingSubProducts && !loadingPreviousInvoice && !pdfGenerated) {
      setPdfGenerated(true);
      generatePDFPreview();
    }
  }, [open, loadingProfile, loadingSubProducts, loadingPreviousInvoice, pdfGenerated]);

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

  const loadSubProducts = async () => {
    try {
      // Load all sub-products
      const { data: subProductsData, error: subProductsError } = await supabase
        .from('sub_products')
        .select('*');

      if (subProductsError) throw subProductsError;

      // Load client sub-products
      const { data: clientSubProductsData, error: clientSubProductsError } = await supabase
        .from('client_sub_products')
        .select('*')
        .eq('client_id', client.id);

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
          
          // Find the previous invoice or stock update before this date
          const { data: previousInvoice, error } = await supabase
            .from('invoices')
            .select('created_at')
            .eq('client_id', client.id)
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

      // Récupérer la date de la facture précédente la plus récente avant celle-ci
      const { data: previousInvoice, error } = await supabase
        .from('invoices')
        .select('created_at')
        .eq('client_id', client.id)
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

      // Dates : Dépôt précédent et Date de facture
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Dépôt précédent
      const previousDepositText = previousInvoiceDate 
        ? `Dépôt précédent : ${new Date(previousInvoiceDate).toLocaleDateString('fr-FR')}`
        : 'Dépôt précédent : -';
      doc.text(previousDepositText, 15, yPosition);
      yPosition += 5;
      
      // Date de facture
      let invoiceDateText: string;
      if (invoice && invoice.id) {
        invoiceDateText = `Date de facture : ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`;
      } else if (stockUpdates.length > 0) {
        // Use the date from the most recent stock update
        const mostRecentDate = stockUpdates.reduce((latest, update) => {
          const updateDate = new Date(update.created_at);
          return updateDate > latest ? updateDate : latest;
        }, new Date(0));
        invoiceDateText = `Date de facture : ${mostRecentDate.toLocaleDateString('fr-FR')}`;
      } else {
        invoiceDateText = `Date de facture : ${new Date().toLocaleDateString('fr-FR')}`;
      }
      doc.text(invoiceDateText, 15, yPosition);
      yPosition += 10;

      // Titre "Relevé de stock"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Relevé de stock', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // 3) Tableau des collections avec les colonnes supplémentaires
      // Sort by display_order
      const sortedCollections = [...clientCollections].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Créer des maps pour trouver rapidement les données de la transaction actuelle
      const stockUpdatesByCollectionId = new Map<string, StockUpdate>();
      const stockUpdatesBySubProductId = new Map<string, StockUpdate>();
      stockUpdates.forEach(update => {
        if (update.collection_id) {
          stockUpdatesByCollectionId.set(update.collection_id, update);
        }
        if (update.sub_product_id) {
          stockUpdatesBySubProductId.set(update.sub_product_id, update);
        }
      });

      // Charger l'historique des stock_updates pour trouver le dernier new_stock de chaque collection/sous-produit
      const { data: historicalStockUpdates, error: historicalError } = await supabase
        .from('stock_updates')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (historicalError) {
        console.error('Error loading historical stock updates:', historicalError);
        throw historicalError;
      }

      // Créer des maps pour trouver le dernier new_stock de chaque collection et sous-produit
      const lastNewStockByCollectionId = new Map<string, number>();
      const lastNewStockBySubProductId = new Map<string, number>();
      
      (historicalStockUpdates || []).forEach((update: StockUpdate) => {
        if (update.collection_id && !update.sub_product_id) {
          // Stock update pour une collection (pas un sous-produit)
          if (!lastNewStockByCollectionId.has(update.collection_id)) {
            lastNewStockByCollectionId.set(update.collection_id, update.new_stock);
          }
        }
        if (update.sub_product_id) {
          // Stock update pour un sous-produit
          if (!lastNewStockBySubProductId.has(update.sub_product_id)) {
            lastNewStockBySubProductId.set(update.sub_product_id, update.new_stock);
          }
        }
      });

      // Créer un map des sous-produits par collection
      const subProductsByCollectionId = new Map<string, SubProduct[]>();
      subProducts.forEach(sp => {
        if (!subProductsByCollectionId.has(sp.collection_id)) {
          subProductsByCollectionId.set(sp.collection_id, []);
        }
        subProductsByCollectionId.get(sp.collection_id)!.push(sp);
      });

      // Créer un map des client_sub_products par sub_product_id
      const clientSubProductsMap = new Map<string, ClientSubProduct>();
      clientSubProducts.forEach(csp => {
        clientSubProductsMap.set(csp.sub_product_id, csp);
      });

      const tableData: any[] = [];
      
      sortedCollections.forEach((cc) => {
        const collectionName = cc.collection?.name || 'Collection';
        const info = ''; // Pas d'info pour le relevé de stock
        const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
        const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
        
        // Récupérer les données du stock update pour cette collection
        // UNIQUEMENT utiliser les données de stock_updates (source unique de données)
        const stockUpdate = stockUpdatesByCollectionId.get(cc.collection_id || '');
        
        // Si pas de stock_update dans la transaction actuelle, utiliser le dernier new_stock de l'historique
        let previousStock: number;
        let countedStock: number;
        let newDeposit: number;
        let reassort: number;
        
        // Ajouter TOUS les sous-produits de cette collection (même sans mouvement de stock)
        const collectionSubProducts = subProductsByCollectionId.get(cc.collection_id || '') || [];
        const hasSubProducts = collectionSubProducts.length > 0;
        
        // Pour les collections avec sous-produits, calculer le stock compté comme la somme des sous-produits
        let totalSubProductCountedStock = 0;
        let totalSubProductPreviousStock = 0;
        let totalSubProductNewDeposit = 0;
        
        if (hasSubProducts) {
          // Calculer les totaux des sous-produits
          collectionSubProducts.forEach(sp => {
            const subProductStockUpdate = stockUpdatesBySubProductId.get(sp.id);
            
            let subProductPreviousStock: number;
            let subProductCountedStock: number;
            let subProductNewDeposit: number;

            if (subProductStockUpdate) {
              // Utiliser TOUJOURS les données de la transaction actuelle depuis stock_updates
              // Même si "Stock compté" = "Ancien dépôt" (pas de mouvement), utiliser les valeurs de stock_updates
              // Même si counted_stock est 0, cela signifie que le stock a été mis à jour (stock compté = 0)
              subProductPreviousStock = subProductStockUpdate.previous_stock; // TOUJOURS depuis stock_updates
              
              // Si counted_stock est null ou non défini, il est égal à l'ancien dépôt (pas de mouvement)
              // Mais si counted_stock est 0, c'est une valeur valide (stock compté = 0)
              if (subProductStockUpdate.counted_stock !== null && subProductStockUpdate.counted_stock !== undefined) {
                subProductCountedStock = subProductStockUpdate.counted_stock; // TOUJOURS depuis stock_updates
              } else {
                // Stock compté non renseigné (null/undefined) = ancien dépôt (pas de mouvement)
                subProductCountedStock = subProductPreviousStock; // Utiliser previous_stock depuis stock_updates
              }
              
              subProductNewDeposit = subProductStockUpdate.new_stock; // TOUJOURS depuis stock_updates
            } else {
              // Pas de stock_update dans la transaction actuelle
              // Utiliser le dernier new_stock de l'historique
              const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
              subProductPreviousStock = lastNewStock;
              subProductCountedStock = lastNewStock; // Stock compté = Ancien dépôt
              subProductNewDeposit = lastNewStock; // Nouveau dépôt = Ancien dépôt
            }
            
            totalSubProductCountedStock += subProductCountedStock;
            totalSubProductPreviousStock += subProductPreviousStock;
            totalSubProductNewDeposit += subProductNewDeposit;
          });
          
          // Pour les collections avec sous-produits
          if (stockUpdate) {
            // Si stock_update existe, utiliser TOUTES ses valeurs depuis stock_updates
            // Même si "Stock compté" = "Ancien dépôt" (pas de mouvement), utiliser les valeurs de stock_updates
            previousStock = stockUpdate.previous_stock; // TOUJOURS depuis stock_updates
            newDeposit = stockUpdate.new_stock; // TOUJOURS depuis stock_updates
            // Le stock compté de la collection = somme des stocks comptés des sous-produits
            countedStock = totalSubProductCountedStock;
          } else {
            // Pas de stock_update : utiliser les totaux des sous-produits
            previousStock = totalSubProductPreviousStock;
            newDeposit = totalSubProductNewDeposit;
            // Le stock compté = somme des stocks comptés des sous-produits
            countedStock = totalSubProductCountedStock;
          }
        } else {
          // Pour une collection sans sous-produits
          if (stockUpdate) {
            // Utiliser TOUJOURS les données de la transaction actuelle depuis stock_updates
            // Même si "Stock compté" = "Ancien dépôt" (pas de mouvement), utiliser les valeurs de stock_updates
            // Même si counted_stock est 0, cela signifie que le stock a été mis à jour (stock compté = 0)
            previousStock = stockUpdate.previous_stock; // TOUJOURS depuis stock_updates
            newDeposit = stockUpdate.new_stock; // TOUJOURS depuis stock_updates
            // Si counted_stock est null ou non défini, il est égal à l'ancien dépôt (pas de mouvement)
            // Mais si counted_stock est 0, c'est une valeur valide (stock compté = 0)
            if (stockUpdate.counted_stock !== null && stockUpdate.counted_stock !== undefined) {
              countedStock = stockUpdate.counted_stock; // TOUJOURS depuis stock_updates
            } else {
              // Stock compté non renseigné (null/undefined) = ancien dépôt (pas de mouvement)
              countedStock = previousStock; // Utiliser previous_stock depuis stock_updates
            }
          } else {
            // Pas de stock_update dans la transaction actuelle
            // Utiliser le dernier new_stock de l'historique comme ancien dépôt
            const lastNewStock = lastNewStockByCollectionId.get(cc.collection_id || '') || 0;
            previousStock = lastNewStock;
            countedStock = lastNewStock; // Stock compté = Ancien dépôt
            newDeposit = lastNewStock; // Nouveau dépôt = Ancien dépôt
          }
        }
        
        // Réassort = Nouveau dépôt - Stock compté
        reassort = newDeposit - countedStock;
        
        // Ajouter la ligne de la collection
        tableData.push([
          collectionName,
          info,
          `${effectivePrice.toFixed(2)} €`,
          effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
          previousStock.toString(), // Ancien dépôt
          countedStock.toString(), // Stock compté (somme des sous-produits si applicable)
          reassort.toString(), // Réassort = Nouveau dépôt - Stock compté
          newDeposit.toString() // Nouveau dépôt
        ]);

        // Ajouter TOUS les sous-produits de cette collection
        if (hasSubProducts) {
          collectionSubProducts.forEach(sp => {
            const subProductStockUpdate = stockUpdatesBySubProductId.get(sp.id);
            
            let subProductPreviousStock: number;
            let subProductCountedStock: number;
            let subProductNewDeposit: number;
            let subProductReassort: number;

            if (subProductStockUpdate) {
              // Utiliser TOUJOURS les données de la transaction actuelle depuis stock_updates
              // Même si "Stock compté" = "Ancien dépôt" (pas de mouvement), utiliser les valeurs de stock_updates
              // Même si counted_stock est 0, cela signifie que le stock a été mis à jour (stock compté = 0)
              subProductPreviousStock = subProductStockUpdate.previous_stock; // TOUJOURS depuis stock_updates
              
              // Si counted_stock est null ou non défini, il est égal à l'ancien dépôt (pas de mouvement)
              // Mais si counted_stock est 0, c'est une valeur valide (stock compté = 0)
              if (subProductStockUpdate.counted_stock !== null && subProductStockUpdate.counted_stock !== undefined) {
                subProductCountedStock = subProductStockUpdate.counted_stock; // TOUJOURS depuis stock_updates
              } else {
                // Stock compté non renseigné (null/undefined) = ancien dépôt (pas de mouvement)
                subProductCountedStock = subProductPreviousStock; // Utiliser previous_stock depuis stock_updates
              }
              
              subProductNewDeposit = subProductStockUpdate.new_stock; // TOUJOURS depuis stock_updates
              subProductReassort = subProductNewDeposit - subProductCountedStock;
            } else {
              // Pas de stock_update dans la transaction actuelle
              // Utiliser le dernier new_stock de l'historique
              const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
              subProductPreviousStock = lastNewStock;
              subProductCountedStock = lastNewStock; // Stock compté = Ancien dépôt
              subProductNewDeposit = lastNewStock; // Nouveau dépôt = Ancien dépôt
              subProductReassort = 0; // Réassort = 0
            }

            // Ajouter la ligne du sous-produit
            // Les sous-produits sont identifiés par le fait qu'ils ont des cellules vides pour les prix
            // S'assurer que le nom du sous-produit est valide
            // Ajouter des espaces pour créer un alinéa visuel
            const subProductName = sp.name || 'Sous-produit';
            // Ajouter 8 espaces non-breaking pour créer un alinéa visible et prononcé
            const indentedSubProductName = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' + subProductName;
            tableData.push([
              indentedSubProductName, // Nom du sous-produit avec indentation
              '',
              '',
              '',
              subProductPreviousStock.toString(),
              subProductCountedStock.toString(),
              subProductReassort.toString(),
              subProductNewDeposit.toString()
            ]);
          });
        }
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
        didParseCell: (data: any) => {
          try {
            // Identifier les lignes de sous-produits
            // Les sous-produits ont des cellules vides pour les colonnes prix (index 2 et 3) et info (index 1)
            // mais ont du contenu dans la première colonne (index 0)
            if (data.row && data.row.raw && Array.isArray(data.row.raw)) {
              const row = data.row.raw;
              // Vérifier si c'est une ligne de sous-produit : 
              // - colonne 0 (nom) n'est pas vide
              // - colonnes 1, 2, 3 (info, prix) sont vides
              const hasName = row[0] && row[0] !== '';
              const hasEmptyInfo = !row[1] || row[1] === '';
              const hasEmptyPrice1 = !row[2] || row[2] === '';
              const hasEmptyPrice2 = !row[3] || row[3] === '';
              
              const isSubProduct = hasName && hasEmptyInfo && hasEmptyPrice1 && hasEmptyPrice2;
              
              if (isSubProduct) {
                // Initialiser les styles si nécessaire
                if (!data.cell.styles) {
                  data.cell.styles = {};
                }
                
                // Fond gris très léger pour distinguer visuellement les sous-produits (toutes les cellules)
                data.cell.styles.fillColor = [245, 247, 250]; // Couleur gris très clair
                
                // Bordure gauche uniquement pour la première colonne pour montrer le lien hiérarchique
                if (data.column && data.column.index === 0) {
                  if (!data.cell.styles.lineColor) {
                    data.cell.styles.lineColor = [180, 180, 180];
                  }
                  if (!data.cell.styles.lineWidth) {
                    data.cell.styles.lineWidth = {};
                  }
                  data.cell.styles.lineWidth.left = 3; // Bordure gauche plus épaisse et visible
                  
                  // Ajouter un padding gauche pour l'indentation (alinéa) uniquement sur la première colonne
                  // S'assurer que le padding est toujours défini, même s'il existe déjà
                  if (!data.cell.styles.cellPadding) {
                    data.cell.styles.cellPadding = { left: 2, right: 2, top: 2, bottom: 2 };
                  }
                  // Augmenter significativement le padding gauche pour créer un alinéa visible
                  data.cell.styles.cellPadding.left = 10; // Indentation prononcée pour les sous-produits
                }
                
                // Garder la même police que la collection (pas de changement de style)
              }
            }
          } catch (error) {
            // Ignorer les erreurs dans le callback pour ne pas bloquer la génération du PDF
            console.warn('Error in didParseCell:', error);
          }
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
      } as any); // Type assertion nécessaire car didParseCell n'est pas dans les types TypeScript mais est supporté par jspdf-autotable

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
          {generating || loadingProfile || loadingSubProducts || loadingPreviousInvoice ? (
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

