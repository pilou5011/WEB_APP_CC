/**
 * PDF Generators Utility
 * 
 * This file contains functions to generate and save PDFs for invoices, stock reports, and deposit slips.
 * These functions are called automatically when stock is updated, and the dialogs only load existing PDFs.
 */

import { Client, Invoice, StockUpdate, Product, ClientProduct, UserProfile, InvoiceAdjustment, SubProduct, ClientSubProduct, CreditNote, StockDirectSold, EstablishmentType, PaymentMethod, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { formatWeekScheduleData } from '@/components/opening-hours-editor';
import { formatMarketDaysScheduleData } from '@/components/market-days-editor';
import { formatVacationPeriods, VacationPeriod } from '@/components/vacation-periods-editor';
import { formatDepartment } from '@/lib/postal-code-utils';

// Helper to add page numbers like "1/2" at bottom-right of each page
// Helper functions for formatting
function formatPhoneNumber(phone: string | null): string {
  if (!phone) return '';
  // Enlever tous les espaces et caractères non numériques
  const digits = phone.replace(/\D/g, '');
  // Ajouter un espace tous les 2 chiffres: XX XX XX XX XX
  return digits.match(/.{1,2}/g)?.join(' ') || phone;
}

function formatTVANumber(tva: string | null): string {
  if (!tva) return '';
  // Enlever tous les espaces
  let cleaned = tva.replace(/\s/g, '').toUpperCase();
  
  // Vérifier si c'est un numéro TVA français (commence par FR)
  if (cleaned.startsWith('FR')) {
    // Format: FR XX 123456789 (sans séparation du SIREN en blocs)
    const countryCode = cleaned.substring(0, 2); // FR
    const rest = cleaned.substring(2); // Le reste après FR
    
    if (rest.length >= 2) {
      const key = rest.substring(0, 2); // Clé informatique (2 caractères)
      const siren = rest.substring(2).replace(/\D/g, ''); // SIREN (chiffres uniquement)
      
      if (siren.length > 0) {
        return `${countryCode} ${key} ${siren}`;
      } else {
        return `${countryCode} ${key}`;
      }
    } else {
      return cleaned;
    }
  }
  
  // Si ce n'est pas un numéro TVA français, retourner tel quel
  return cleaned;
}

function formatSIRETNumber(siret: string | null): string {
  if (!siret) return '';
  // Enlever tous les espaces et caractères non numériques
  const digits = siret.replace(/\D/g, '');
  
  // Accepter les SIRET de 14 chiffres ou plus (on prend les 14 premiers)
  if (digits.length >= 14) {
    // Format: XXX XXX XXX XXXXX
    // 9 premiers = SIREN (en 3 blocs de 3 chiffres)
    // 5 derniers = NIC (en bloc de 5)
    const siren = digits.substring(0, 9);
    const nic = digits.substring(9, 14);
    
    // Formater le SIREN en 3 blocs de 3 chiffres exactement
    const block1 = siren.substring(0, 3);
    const block2 = siren.substring(3, 6);
    const block3 = siren.substring(6, 9);
    const sirenFormatted = `${block1} ${block2} ${block3}`;
    
    return `${sirenFormatted} ${nic}`;
  }
  
  // Si la longueur est inférieure à 14, essayer de formater ce qu'on a
  if (digits.length >= 9) {
    const siren = digits.substring(0, 9);
    const block1 = siren.substring(0, 3);
    const block2 = siren.substring(3, 6);
    const block3 = siren.substring(6, 9);
    const sirenFormatted = `${block1} ${block2} ${block3}`;
    const remaining = digits.substring(9);
    return remaining ? `${sirenFormatted} ${remaining}` : sirenFormatted;
  }
  
  // Si moins de 9 chiffres, retourner tel quel
  return siret;
}

function addPageNumbers(doc: any) {
  try {
    const pageCount = doc.getNumberOfPages();
    if (!pageCount || pageCount <= 0) return;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const footerMarginRight = 15;
      const footerMarginBottom = 8;

      const label = `Page ${i}/${pageCount}`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);

      doc.text(label, pageWidth - footerMarginRight, pageHeight - footerMarginBottom, {
        align: 'right'
      } as any);
    }
  } catch (e) {
    console.error('Error adding page numbers to PDF:', e);
  }
}

interface GenerateInvoicePDFParams {
  invoice: Invoice;
  client: Client;
  clientProducts: (ClientProduct & { Product?: Product })[];
  products: Product[];
  stockUpdates: StockUpdate[];
  adjustments: InvoiceAdjustment[];
  userProfile: UserProfile | null;
}

interface GenerateStockReportPDFParams {
  invoice: Invoice;
  client: Client;
  clientProducts: (ClientProduct & { Product?: Product })[];
  stockUpdates: StockUpdate[];
}

interface GenerateDepositSlipPDFParams {
  invoice: Invoice;
  client: Client;
  clientProducts: (ClientProduct & { Product?: Product })[];
  stockUpdates: StockUpdate[];
  userProfile: UserProfile | null;
  allowReplacement?: boolean;
  existingDepositSlipPdfPath?: string;
}

interface GenerateCreditNotePDFParams {
  creditNote: CreditNote;
  invoice: Invoice;
  client: Client;
  userProfile: UserProfile | null;
}

interface GenerateDirectInvoicePDFParams {
  invoice: Invoice;
  client: Client;
  products: Product[];
  stockDirectSold: StockDirectSold[];
  userProfile: UserProfile | null;
}

/**
 * Generate and save invoice PDF
 * This function generates the invoice PDF and saves it to Supabase storage.
 * It only saves if the PDF doesn't already exist (immutability).
 */
export async function generateAndSaveInvoicePDF(params: GenerateInvoicePDFParams): Promise<void> {
  const { invoice, client, clientProducts, products, stockUpdates, adjustments, userProfile } = params;

  // Check if PDF already exists
  if (invoice.invoice_pdf_path) {
    console.log('Invoice PDF already exists, skipping generation:', invoice.invoice_pdf_path);
    return;
  }

  // 🧪 TEST ROLLBACK - Décommenter la ligne suivante pour tester le système de rollback
  //throw new Error('TEST: Simulated PDF generation failure for rollback testing');

  try {
    // Import jsPDF dynamically
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
        doc.text(`SIRET: ${formatSIRETNumber(userProfile.siret)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (userProfile.tva_number) {
        doc.text(`TVA: ${formatTVANumber(userProfile.tva_number)}`, leftBoxX + 2, yPosition);
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
        doc.text(`Tél: ${formatPhoneNumber(userProfile.phone)}`, leftBoxX + 2, yPosition);
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
      doc.text(`SIRET: ${formatSIRETNumber(client.siret_number)}`, rightBoxX + 2, clientYPosition);
      clientYPosition += 4;
    }
    if (client.tva_number) {
      doc.text(`TVA: ${formatTVANumber(client.tva_number)}`, rightBoxX + 2, clientYPosition);
      clientYPosition += 3; // Même espacement que N° Facture
    }
    
    const rightBoxHeight = clientYPosition - rightBoxY + 1;
    doc.rect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight);

    // Encart numéro de client et numéro de facture (en dessous du DÉTAILLANT)
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
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}`, globalLeftMargin, yPosition);
    yPosition += 10;

    // Titre "Facture N°[numero_facture]" en gras
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Facture N°${invoiceNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // 3) Tableau des produits
    // Filter out sub-products: only include stock updates with product_id and no sub_product_id
    const productStockUpdates = stockUpdates.filter(update => 
      update.product_id && !update.sub_product_id
    );
    
    // Sort stock updates by Product display_order
    const sortedStockUpdates = [...productStockUpdates].sort((a, b) => {
      const aCC = clientProducts.find(cp => cp.product_id === a.product_id);
      const bCC = clientProducts.find(cp => cp.product_id === b.product_id);
      const aOrder = aCC?.display_order || 0;
      const bOrder = bCC?.display_order || 0;
      return aOrder - bOrder;
    });
    // Récupérer le pourcentage de remise de la facture
    const discountPercentage = invoice.discount_percentage || 0;
    const discountRatio = discountPercentage > 0 && discountPercentage <= 100 
      ? (1 - discountPercentage / 100)
      : 1;
    
    // Appliquer la remise proportionnellement à chaque ligne de facture
    const stockRows = sortedStockUpdates.map((update) => {
      const Product = products.find(c => c.id === update.product_id);
      const ClientProduct = clientProducts.find(cp => cp.product_id === update.product_id);
      const effectivePrice = ClientProduct?.custom_price ?? Product?.price ?? 0;
      const totalHTBeforeDiscount = update.stock_sold * effectivePrice;
      // Appliquer la remise proportionnellement à chaque ligne (conforme fiscalement)
      const totalHTAfterDiscount = totalHTBeforeDiscount * discountRatio;
      
      return [
        Product?.name || 'Produit',
        (ClientProduct as { product_info?: string | null })?.product_info || '', // Infos produit depuis client_products
        Product?.barcode || '', // Code barre produit
        update.previous_stock.toString(),
        update.counted_stock.toString(),
        update.stock_sold.toString(),
        effectivePrice.toFixed(2) + ' €',
        totalHTBeforeDiscount.toFixed(2) + ' €' // Afficher le prix HT avant remise
      ];
    });

    // Appliquer la remise proportionnellement aux ajustements aussi
    const adjustmentRows = adjustments.map((adj) => {
      const amt = Number(adj.amount);
      const amtBeforeDiscount = isNaN(amt) ? 0 : amt;
      // Appliquer la remise proportionnellement aux ajustements (conforme fiscalement)
      const amtAfterDiscount = amtBeforeDiscount * discountRatio;
      // Afficher le prix HT avant remise dans la colonne "Total HT"
      const amtStr = amtBeforeDiscount.toFixed(2) + ' €';
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
      head: [['Produit', 'Infos', 'Code-barres', 'Qté remise', 'Qté reprise', 'Qté vendue', 'PU HT', 'Total HT']],
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

    // Calculer les totaux (uniquement pour les produits, pas les sous-produits)
    // Note: discountPercentage et discountRatio sont déjà définis plus haut
    const adjustmentsTotal = adjustments.reduce((sum, adj) => sum + Number(adj.amount || 0), 0);
    const totalHTBeforeDiscount = productStockUpdates.reduce((sum, update) => {
      const Product = products.find(c => c.id === update.product_id);
      const ClientProduct = clientProducts.find(cp => cp.product_id === update.product_id);
      const effectivePrice = ClientProduct?.custom_price ?? Product?.price ?? 0;
      return sum + (update.stock_sold * effectivePrice);
    }, 0) + adjustmentsTotal;
    
    // Appliquer la remise commerciale sur le HT (conforme fiscalement)
    // La remise a déjà été appliquée proportionnellement à chaque ligne, donc on recalcule ici pour vérification
    const discountAmount = discountPercentage > 0 && discountPercentage <= 100
      ? (totalHTBeforeDiscount * discountPercentage / 100)
      : 0;
    
    const totalHT = totalHTBeforeDiscount - discountAmount;
    
    // Calculer la TVA après remise (conforme fiscalement)
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    // Tableau récapitulatif des totaux (avec espacement de 2 lignes)
    const finalTableY = (doc as any).lastAutoTable.finalY + 8; // Espacement de 2 lignes
    
    // Utiliser les mêmes marges globales pour l'alignement vertical
    const summaryRows: string[][] = [];
    
    // Montant HT avant remise (si remise appliquée)
    if (discountAmount > 0) {
      summaryRows.push(['TOTAL H.T. (avant remise)', totalHTBeforeDiscount.toFixed(2) + ' €']);
      summaryRows.push([`Remise commerciale (${discountPercentage.toFixed(2)}%)`, '-' + discountAmount.toFixed(2) + ' €']);
    }
    
    summaryRows.push(['TOTAL H.T.', totalHT.toFixed(2) + ' €']);
    summaryRows.push(['TVA 20%', tva.toFixed(2) + ' €']);
    summaryRows.push(['TOTAL T.T.C A PAYER', totalTTC.toFixed(2) + ' €']);
    
    // Calculer la hauteur approximative nécessaire pour le bloc récapitulatif
    // Le nombre de lignes dépend de la présence d'une remise commerciale :
    // - Avec remise : 5 lignes (TOTAL H.T. avant remise, Remise, TOTAL H.T., TVA 20%, TOTAL T.T.C)
    // - Sans remise : 3 lignes (TOTAL H.T., TVA 20%, TOTAL T.T.C)
    // Hauteur par ligne : fontSize 10 + cellPadding 1.5 (haut et bas) = environ 5.5mm par ligne
    const rowHeight = 5.5;
    const numberOfRows = summaryRows.length; // Utiliser le nombre réel de lignes
    const totalBlockHeight = numberOfRows * rowHeight; // Hauteur totale du bloc
    
    // Calculer la hauteur des conditions AVANT de vérifier l'espace disponible
    // Récupérer les conditions générales personnalisées ou utiliser la valeur par défaut
    const getDefaultConditions = (companyName: string | null): string => {
      const company = companyName || 'Votre Société';
      return `Conditions de Dépôt-Vente : La marchandise et les présentoirs mis en dépôt restent la propriété de ${company}. Le dépositaire s'engage à régler comptant les produits vendus à la date d'émission de la facture. Le dépositaire s'engage à assurer la marchandise et les présentoirs contre tous les risques (vol, incendie, dégâts des eaux,…). En cas d'une saisie, le client s'engage à informer l'huissier de la réserve de propriété de ${company}. Tout retard de paiement entraîne une indemnité forfaitaire de 40 € + pénalités de retard de 3 fois le taux d'intérêt légal.`;
    };
    const conditionsText = userProfile?.terms_and_conditions || getDefaultConditions(userProfile?.company_name || null);
    
    // Calculer la largeur disponible en tenant compte des marges gauche et droite
    const availableWidth = pageWidth - globalLeftMargin - globalRightMargin;
    
    // Diviser le texte en lignes adaptées à la largeur disponible
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const conditionsLines = doc.splitTextToSize(conditionsText, availableWidth);
    const conditionsHeight = conditionsLines.length * 3.5; // Hauteur approximative des lignes de conditions
    const footerY = pageHeight - 20; // Position en bas de page pour les conditions
    const marginBetweenBlockAndConditions = 2; // Marge entre le bloc et les conditions
    
    // Vérifier si le bloc + les conditions peuvent tenir sur la page actuelle
    const currentPageHeight = doc.internal.pageSize.getHeight();
    const totalNeededHeight = totalBlockHeight + marginBetweenBlockAndConditions + conditionsHeight;
    const availableHeight = footerY - finalTableY; // Espace disponible jusqu'à la position des conditions
    
    // Si le bloc + les conditions ne peuvent pas tenir, créer une nouvelle page AVANT de dessiner le bloc
    let startYForSummary = finalTableY;
    if (totalNeededHeight > availableHeight && availableHeight > 0) {
      doc.addPage();
      startYForSummary = 20; // Commencer en haut de la nouvelle page
    }
    
    autoTable(doc, {
      startY: startYForSummary,
      body: summaryRows,
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        fontStyle: 'bold',
        textColor: [0, 0, 0], // Noir pour toutes les valeurs du tableau récapitulatif
        cellPadding: 1.5, // Réduit pour rendre les lignes plus fines
        // Empêcher la division de chaque ligne entre les pages
        rowPageBreak: 'avoid'
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

    // Conditions de Dépôt-Vente - toujours en bas de page
    // (Les conditions ont déjà été calculées plus haut, on les réutilise)
    
    // Toujours placer les conditions en bas de la page actuelle
    doc.setTextColor(0, 0, 0);
    
    // Placer les conditions en bas de page (footerY) avec marge droite
    conditionsLines.forEach((line: string, index: number) => {
      doc.text(line, globalLeftMargin, footerY + (index * 3.5), { maxWidth: availableWidth });
    });

    // Add page numbers (footer) before generating the blob
    addPageNumbers(doc);

    // Generate PDF blob
    const pdfBlobData = doc.output('blob');

    // Save PDF to storage
    const invoiceDate = new Date(invoice.invoice_date);
    const year = invoiceDate.getFullYear();
    const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
    const day = String(invoiceDate.getDate()).padStart(2, '0');
    const fileName = `invoice_${year}_${month}_${day}.pdf`;
    const filePath = `invoices/${invoice.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBlobData, {
        contentType: 'application/pdf',
        upsert: false // Never overwrite - factures are immutable
      });

    const companyId = await getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('Non autorisé');
    }

    if (uploadError) {
      if (uploadError.message?.includes('already exists') || 
          uploadError.message?.includes('duplicate') ||
          uploadError.message?.includes('409')) {
        console.log('PDF already exists, not overwriting:', filePath);
        // Mettre à jour invoice_pdf_path uniquement si elle est NULL (immuabilité contractuelle)
        // Si le fichier existe déjà dans le storage mais que invoice_pdf_path est NULL dans la DB,
        // on peut le définir une seule fois
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ invoice_pdf_path: filePath })
          .eq('id', invoice.id)
          .eq('company_id', companyId)
          .is('invoice_pdf_path', null);  // Mettre à jour UNIQUEMENT si invoice_pdf_path est NULL
        
        if (updateError) {
          console.error('Error updating invoice with PDF path:', updateError);
          throw updateError;
        } else {
          console.log('Invoice PDF path updated (file already existed):', filePath);
        }
      } else {
        throw uploadError;
      }
    } else if (uploadData) {
      // Mettre à jour invoice_pdf_path uniquement si elle est NULL (immuabilité contractuelle)
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ invoice_pdf_path: filePath })
        .eq('id', invoice.id)
        .eq('company_id', companyId)
        .is('invoice_pdf_path', null);  // Mettre à jour UNIQUEMENT si invoice_pdf_path est NULL
      
      if (updateError) {
        console.error('Error updating invoice with PDF path:', updateError);
        throw updateError;
      } else {
        console.log('Invoice PDF saved successfully:', filePath);
      }
    }
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate and save stock report PDF
 * This function generates the stock report PDF and saves it to Supabase storage.
 * It only saves if the PDF doesn't already exist (immutability).
 */
export async function generateAndSaveStockReportPDF(params: GenerateStockReportPDFParams): Promise<void> {
  const { invoice, client, clientProducts, stockUpdates } = params;

  // Check if PDF already exists
  if (invoice.stock_report_pdf_path) {
    console.log('Stock report PDF already exists, skipping generation:', invoice.stock_report_pdf_path);
    return;
  }

  try {
    const companyId = await getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('Non autorisé');
    }

    // Load required data
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    const { data: subProducts } = await supabase
      .from('sub_products')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    const { data: clientSubProducts } = await supabase
      .from('client_sub_products')
      .select('*')
      .eq('client_id', client.id)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // Get previous invoice date
    const { data: previousInvoice } = await supabase
      .from('invoices')
      .select('created_at')
      .eq('client_id', client.id)
      .eq('company_id', companyId)
      .lt('created_at', invoice.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousInvoiceDate = previousInvoice?.created_at || null;

    // Load historical stock updates
    const { data: historicalStockUpdates } = await supabase
      .from('stock_updates')
      .select('*')
      .eq('client_id', client.id)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Import jsPDF dynamically
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
        doc.text(`SIRET: ${formatSIRETNumber(userProfile.siret)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (userProfile.tva_number) {
        doc.text(`TVA: ${formatTVANumber(userProfile.tva_number)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (userProfile.tva_number && userProfile.phone) {
        yPosition += 2;
      }
      if (userProfile.phone) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tél: ${formatPhoneNumber(userProfile.phone)}`, leftBoxX + 2, yPosition);
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

    // Dates
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const previousDepositText = previousInvoiceDate 
      ? `Dépôt précédent : ${new Date(previousInvoiceDate).toLocaleDateString('fr-FR')}`
      : 'Dépôt précédent : -';
    doc.text(previousDepositText, 15, yPosition);
    yPosition += 5;
    
    const invoiceDateText = `Date de facture : ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}`;
    doc.text(invoiceDateText, 15, yPosition);
    yPosition += 10;

    // Titre "Relevé de stock"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Relevé de stock', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Create maps for stock updates
    const stockUpdatesByProductId = new Map<string, StockUpdate>();
    const stockUpdatesBySubProductId = new Map<string, StockUpdate>();
    stockUpdates.forEach(update => {
      if (update.product_id) {
        stockUpdatesByProductId.set(update.product_id, update);
      }
      if (update.sub_product_id) {
        stockUpdatesBySubProductId.set(update.sub_product_id, update);
      }
    });

    // Créer un map des client_sub_products non supprimés pour vérification rapide
    // DOIT être créé AVANT d'être utilisé dans subProductsByProductId
    const clientSubProductsMap = new Map<string, any>();
    (clientSubProducts || []).forEach(csp => {
      if (!csp.deleted_at) {
        clientSubProductsMap.set(csp.sub_product_id, csp);
      }
    });

    // Create maps for the *last* stock update per product / sub-product
    // On parcourt l'historique trié par created_at DESC, donc la première entrée rencontrée est la plus récente
    const lastStockUpdateByProductId = new Map<string, StockUpdate>();
    const lastStockUpdateBySubProductId = new Map<string, StockUpdate>();
    
    (historicalStockUpdates || []).forEach((update: StockUpdate) => {
      if (update.product_id && !update.sub_product_id) {
        if (!lastStockUpdateByProductId.has(update.product_id)) {
          lastStockUpdateByProductId.set(update.product_id, update);
        }
      }
      if (update.sub_product_id) {
        if (!lastStockUpdateBySubProductId.has(update.sub_product_id)) {
          lastStockUpdateBySubProductId.set(update.sub_product_id, update);
        }
      }
    });

    // Create map of sub-products by Product
    // Filtrer uniquement les sous-produits non supprimés ET qui existent dans client_sub_products non supprimés
    // Trier par display_order pour respecter l'ordre défini
    const subProductsByProductId = new Map<string, SubProduct[]>();
    (subProducts || []).forEach(sp => {
      // Vérifier que le sous-produit n'est pas supprimé ET qu'il existe dans client_sub_products non supprimé
      if (!sp.deleted_at && clientSubProductsMap.has(sp.id)) {
        if (!subProductsByProductId.has(sp.product_id)) {
          subProductsByProductId.set(sp.product_id, []);
        }
        subProductsByProductId.get(sp.product_id)!.push(sp);
      }
    });
    
    // Trier les sous-produits par display_order pour chaque produit
    subProductsByProductId.forEach((subProductsList, productId) => {
      subProductsList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    });

    const tableData: any[] = [];
    // Filtrer les clientProducts pour ne garder que ceux non supprimés
    // ET vérifier que le produit lui-même (dans la table products) n'est pas supprimé
    const activeClientProducts = clientProducts.filter(cp => 
      !cp.deleted_at && 
      cp.Product && 
      !cp.Product.deleted_at
    );
    const sortedProducts = [...activeClientProducts].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    sortedProducts.forEach((cp) => {
      const productName = cp.Product?.name || 'Product';
      const info = (cp as { product_info?: string | null }).product_info || '';
      const effectivePrice = cp.custom_price ?? cp.Product?.price ?? 0;
      const effectiveRecommendedSalePrice = cp.custom_recommended_sale_price ?? cp.Product?.recommended_sale_price ?? null;
      
      const productSubProducts = subProductsByProductId.get(cp.product_id || '') || [];
      const hasSubProducts = productSubProducts.length > 0;
      
      let previousStock: number;
      let countedStock: number | null;
      let newDeposit: number;
      let reassort: number | null;
      
      if (hasSubProducts) {
        // Produit avec sous-produits : déterminer si AU MOINS un sous-produit a été modifié pour cette facture
        // Filtrer uniquement les sous-produits non supprimés dans client_sub_products
        const activeProductSubProducts = productSubProducts.filter(sp => clientSubProductsMap.has(sp.id));
        let totalSubProductCountedStock = 0;
        let totalSubProductPreviousStock = 0;
        let totalSubProductNewDeposit = 0;
        let totalSubProductReassort = 0;
        let hasInvoiceUpdateForAnySubProduct = false;
        
        activeProductSubProducts.forEach(sp => {
          const invoiceSubUpdate = stockUpdatesBySubProductId.get(sp.id);
          if (invoiceSubUpdate) {
            hasInvoiceUpdateForAnySubProduct = true;
            totalSubProductPreviousStock += invoiceSubUpdate.previous_stock || 0;
            totalSubProductCountedStock += invoiceSubUpdate.counted_stock || 0;
            totalSubProductReassort += invoiceSubUpdate.stock_added || 0;
            totalSubProductNewDeposit += invoiceSubUpdate.new_stock || 0;
          } else {
            // Aucun mouvement sur ce sous-produit pour cette facture → utiliser la dernière mise à jour globale
            const lastSubUpdate = lastStockUpdateBySubProductId.get(sp.id);
            if (lastSubUpdate) {
              // Ancien dépôt et Nouveau dépôt = dernier new_stock, Stock compté et Réassort = "-"
              totalSubProductPreviousStock += lastSubUpdate.new_stock || 0;
              totalSubProductNewDeposit += lastSubUpdate.new_stock || 0;
            }
          }
        });
        
        previousStock = totalSubProductPreviousStock;
        newDeposit = totalSubProductNewDeposit;

        if (hasInvoiceUpdateForAnySubProduct) {
          countedStock = totalSubProductCountedStock;
          reassort = totalSubProductReassort;
        } else {
          countedStock = null;
          reassort = null;
        }
      } else {
        // Produit sans sous-produits
        const invoiceUpdate = stockUpdatesByProductId.get(cp.product_id || '');
        const lastProductUpdate = lastStockUpdateByProductId.get(cp.product_id || '');

        if (invoiceUpdate) {
          // Le produit a été modifié lors de cette mise à jour de stock → utiliser la ligne liée à cette facture
          previousStock = invoiceUpdate.previous_stock || 0;
          countedStock = invoiceUpdate.counted_stock || 0;
          reassort = invoiceUpdate.stock_added || 0;
          newDeposit = invoiceUpdate.new_stock || 0;
        } else if (lastProductUpdate) {
          // Aucun mouvement pour cette facture → utiliser la dernière ligne globale
          // Ancien dépôt et Nouveau dépôt = dernier new_stock, Stock compté et Réassort = "-"
          previousStock = lastProductUpdate.new_stock || 0;
          newDeposit = lastProductUpdate.new_stock || 0;
          countedStock = null;
          reassort = null;
        } else {
          // Aucun historique → tout à zéro, avec "-" pour Stock compté et Réassort
          previousStock = 0;
          newDeposit = 0;
          countedStock = null;
          reassort = null;
        }
      }
      
      const productRow = [
        productName,
        info,
        `${effectivePrice.toFixed(2)} €`,
        effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
        previousStock.toString(),
        countedStock === null ? '-' : countedStock.toString(),
        reassort === null ? '-' : reassort.toString(),
        newDeposit.toString()
      ];
      
      tableData.push(productRow);

      // Add sub-products
      // Filtrer uniquement les sous-produits qui existent dans client_sub_products non supprimés
      if (hasSubProducts) {
        const activeSubProducts = productSubProducts.filter(sp => clientSubProductsMap.has(sp.id));
        activeSubProducts.forEach(sp => {
          const invoiceSubUpdate = stockUpdatesBySubProductId.get(sp.id);
          const lastSubUpdate = lastStockUpdateBySubProductId.get(sp.id);

          let subProductPreviousStock: number;
          let subProductCountedStock: number | null;
          let subProductReassort: number | null;
          let subProductNewDeposit: number;

          if (invoiceSubUpdate) {
            // Sous-produit modifié pour cette facture → utiliser la ligne liée à cette facture
            subProductPreviousStock = invoiceSubUpdate.previous_stock || 0;
            subProductCountedStock = invoiceSubUpdate.counted_stock || 0;
            subProductReassort = invoiceSubUpdate.stock_added || 0;
            subProductNewDeposit = invoiceSubUpdate.new_stock || 0;
          } else if (lastSubUpdate) {
            // Aucun mouvement pour cette facture → utiliser la dernière ligne globale
            // Ancien dépôt et Nouveau dépôt = dernier new_stock, Stock compté et Réassort = "-"
            subProductPreviousStock = lastSubUpdate.new_stock || 0;
            subProductNewDeposit = lastSubUpdate.new_stock || 0;
            subProductCountedStock = null;
            subProductReassort = null;
          } else {
            subProductPreviousStock = 0;
            subProductNewDeposit = 0;
            subProductCountedStock = null;
            subProductReassort = null;
          }

          const subProductName = sp.name || 'Sous-produit';
          const indentedSubProductName = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' + subProductName;
          tableData.push([
            indentedSubProductName,
            '',
            '',
            '',
            subProductPreviousStock.toString(),
            subProductCountedStock === null ? '-' : subProductCountedStock.toString(),
            subProductReassort === null ? '-' : subProductReassort.toString(),
            subProductNewDeposit.toString()
          ]);
        });
      }
    });

    const marginLeft = leftBoxX;
    const rightBoxRightEdge = rightBoxX + rightBoxWidth;
    const marginRight = pageWidth - rightBoxRightEdge;
    const tableWidth = pageWidth - marginLeft - marginRight;
    
    const fixedColumnsWidth = tableWidth * (0.15 + 0.08 + 0.08 + 0.08 + 0.08 + 0.08 + 0.08);
    const productColumnWidth = tableWidth - fixedColumnsWidth;
    
    const columnWidths = [
      productColumnWidth,
      tableWidth * 0.15,
      tableWidth * 0.08,
      tableWidth * 0.08,
      tableWidth * 0.08,
      tableWidth * 0.08,
      tableWidth * 0.08,
      tableWidth * 0.08
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [[
        'Produit', 
        'Infos', 
        { content: 'Prix cession HT', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
        { content: 'Prix conseillé TTC', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
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
          const columnIndex = data.column?.index;
          
          // Apply column colors only to body cells, not headers
          if (data.section === 'body') {
            // Apply column colors to body cells (but preserve sub-product styling for column 0)
            if (columnIndex === 4) { // Ancien dépôt
              if (!data.cell.styles) {
                data.cell.styles = {};
              }
              data.cell.styles.fillColor = [232, 237, 242]; // #E8EDF2
            } else if (columnIndex === 5) { // Stock compté
              if (!data.cell.styles) {
                data.cell.styles = {};
              }
              data.cell.styles.fillColor = [255, 251, 235]; // amber-50
            } else if (columnIndex === 6) { // Réassort
              if (!data.cell.styles) {
                data.cell.styles = {};
              }
              data.cell.styles.fillColor = [240, 253, 244]; // green-50
              // Style conditionnel : gras et plus grand uniquement pour les sous-produits
              // Les produits standards gardent le style par défaut (sera appliqué dans la section isSubProduct)
            } else if (columnIndex === 7) { // Nouveau dépôt
              if (!data.cell.styles) {
                data.cell.styles = {};
              }
              data.cell.styles.fillColor = [232, 237, 242]; // #E8EDF2
            }
          }
          
          if (data.row && data.row.raw && Array.isArray(data.row.raw)) {
            const row = data.row.raw;
            const hasName = row[0] && row[0] !== '';
            const hasEmptyInfo = !row[1] || row[1] === '';
            const hasEmptyPrice1 = !row[2] || row[2] === '';
            const hasEmptyPrice2 = !row[3] || row[3] === '';
            
            const isSubProduct = hasName && hasEmptyInfo && hasEmptyPrice1 && hasEmptyPrice2;
            
            if (isSubProduct) {
              if (!data.cell.styles) {
                data.cell.styles = {};
              }
              
              // Only apply sub-product background to non-colored columns (0, 1, 2, 3)
              if (columnIndex !== undefined && columnIndex < 4) {
                data.cell.styles.fillColor = [245, 247, 250];
              }
              
              // Pour la colonne Réassort (index 6), mettre en gras et plus grand pour les sous-produits
              if (columnIndex === 6) {
                data.cell.styles.fontSize = 11; // Augmenter la police de +2 (de 8 à 10) pour plus de visibilité
                data.cell.styles.fontStyle = 'bold'; // Mettre en gras
              }
              
              if (data.column && data.column.index === 0) {
                if (!data.cell.styles.lineColor) {
                  data.cell.styles.lineColor = [180, 180, 180];
                }
                if (!data.cell.styles.lineWidth) {
                  data.cell.styles.lineWidth = {};
                }
                data.cell.styles.lineWidth.left = 3;
                
                if (!data.cell.styles.cellPadding) {
                  data.cell.styles.cellPadding = { left: 2, right: 2, top: 2, bottom: 2 };
                }
                data.cell.styles.cellPadding.left = 10;
              }
            }
          }
        } catch (error) {
          console.warn('Error in didParseCell:', error);
        }
      },
      columnStyles: {
        0: { cellWidth: columnWidths[0], halign: 'left' },
        1: { cellWidth: columnWidths[1], halign: 'left' },
        2: { cellWidth: columnWidths[2], halign: 'center' },
        3: { cellWidth: columnWidths[3], halign: 'center' },
        4: { cellWidth: columnWidths[4], halign: 'center', fillColor: [232, 237, 242] }, // Ancien dépôt - #E8EDF2
        5: { cellWidth: columnWidths[5], halign: 'center', fillColor: [255, 251, 235] }, // Stock compté - amber-50
        6: { cellWidth: columnWidths[6], halign: 'center', fillColor: [240, 253, 244] }, // Réassort - green-50
        7: { cellWidth: columnWidths[7], halign: 'center', fillColor: [232, 237, 242] }  // Nouveau dépôt - #E8EDF2
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      }
    } as any);

    // Add page numbers (footer) before generating the blob
    addPageNumbers(doc);

    const pdfBlobData = doc.output('blob');
    const filePath = `invoices/${invoice.id}/stock_report_${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBlobData, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      if (uploadError.message?.includes('already exists') || 
          uploadError.message?.includes('duplicate') ||
          uploadError.message?.includes('409')) {
        console.log('PDF already exists, not overwriting:', filePath);
        // Mettre à jour stock_report_pdf_path même si le fichier existe déjà
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ stock_report_pdf_path: filePath })
          .eq('id', invoice.id)
          .eq('company_id', companyId);
        
        if (updateError) {
          console.error('Error updating invoice with PDF path:', updateError);
          throw updateError;
        } else {
          console.log('Stock report PDF path updated (file already existed):', filePath);
        }
      } else {
        throw uploadError;
      }
    } else if (uploadData) {
      // Mettre à jour stock_report_pdf_path
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ stock_report_pdf_path: filePath })
        .eq('id', invoice.id)
        .eq('company_id', companyId)
        .is('stock_report_pdf_path', null);
      
      if (updateError) {
        console.warn('Error updating invoice with PDF path:', updateError);
      } else {
        console.log('Stock report PDF saved successfully:', filePath);
      }
    }
  } catch (error) {
    console.error('Error generating stock report PDF:', error);
    throw error;
  }
}

/**
 * Generate and save deposit slip PDF
 * This function generates the deposit slip PDF and saves it to Supabase storage.
 * It supports immutability by default, or replacement mode when allowReplacement is true.
 */
export async function generateAndSaveDepositSlipPDF(params: GenerateDepositSlipPDFParams): Promise<string> {
  const { invoice, client, clientProducts, stockUpdates, userProfile, allowReplacement, existingDepositSlipPdfPath } = params;

  // Check if PDF already exists
  if (invoice.deposit_slip_pdf_path && !allowReplacement) {
    console.log('Deposit slip PDF already exists, skipping generation:', invoice.deposit_slip_pdf_path);
    return invoice.deposit_slip_pdf_path;
  }

  try {
    const companyId = await getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('Non autorisé');
    }

    // Load required data
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    // Récupérer product_info depuis client_products (plus dans stock_updates)
    const productInfos: Record<string, string> = {};
    clientProducts.forEach(cp => {
      if (cp.product_id) {
        productInfos[cp.product_id] = (cp as { product_info?: string | null }).product_info || '';
      }
    });

    // Charger les stock_updates pour le tableau (Qté remise, etc.)
    const { data: allStockUpdates } = await supabase
      .from('stock_updates')
      .select('*')
      .eq('client_id', client.id)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Import jsPDF dynamically
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
        doc.text(`SIRET: ${formatSIRETNumber(userProfile.siret)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (userProfile.tva_number) {
        doc.text(`TVA: ${formatTVANumber(userProfile.tva_number)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (userProfile.tva_number && userProfile.phone) {
        yPosition += 2;
      }
      if (userProfile.phone) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tél: ${formatPhoneNumber(userProfile.phone)}`, leftBoxX + 2, yPosition);
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

    // Tableau des produits - exclure les clientProducts sans produit valide (produit supprimé ou orphelin)
    const productOrP = (cp: any) => cp.Product ?? cp.product;
    const validClientProducts = clientProducts.filter(cp => {
      const prod = productOrP(cp);
      return prod && !prod.deleted_at;
    });
    const sortedProducts = [...validClientProducts].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    // Charger les sous-produits pour tous les produits
    const productIds = sortedProducts.map(cp => cp.product_id).filter(Boolean) as string[];
    let subProductsByProductId: Record<string, any[]> = {};
    
    if (productIds.length > 0) {
      const { data: subProductsData, error: subProductsError } = await supabase
        .from('sub_products')
        .select('*')
        .in('product_id', productIds)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });
      
      if (subProductsError) throw subProductsError;
      
      (subProductsData || []).forEach((sp: any) => {
        if (!subProductsByProductId[sp.product_id]) {
          subProductsByProductId[sp.product_id] = [];
        }
        subProductsByProductId[sp.product_id].push(sp);
      });
      
      // Trier les sous-produits par display_order pour chaque produit (déjà trié par la requête, mais on s'assure)
      Object.keys(subProductsByProductId).forEach(productId => {
        subProductsByProductId[productId].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      });
    }
    
    // Créer des maps pour récupérer rapidement le dernier stock_update par product_id et sub_product_id
    // Filtrer uniquement les produits/sous-produits non supprimés
    const lastStockUpdateByProductId = new Map<string, StockUpdate>();
    const lastStockUpdateBySubProductId = new Map<string, StockUpdate>();
    
    // Parcourir tous les stock_updates (de la base de données) triés par date décroissante
    (allStockUpdates || []).forEach((update: StockUpdate) => {
      if (update.product_id && !update.sub_product_id) {
        // Produit sans sous-produit
        const key = update.product_id;
        if (!lastStockUpdateByProductId.has(key) || 
            new Date(update.created_at) > new Date(lastStockUpdateByProductId.get(key)!.created_at)) {
          // Vérifier que le produit n'est pas supprimé
          const product = sortedProducts.find(cp => cp.product_id === key);
          if (product && !product.deleted_at) {
            lastStockUpdateByProductId.set(key, update);
          }
        }
      } else if (update.sub_product_id) {
        // Sous-produit
        const key = update.sub_product_id;
        if (!lastStockUpdateBySubProductId.has(key) || 
            new Date(update.created_at) > new Date(lastStockUpdateBySubProductId.get(key)!.created_at)) {
          // Vérifier que le sous-produit n'est pas supprimé
          const subProduct = Object.values(subProductsByProductId).flat().find(sp => sp.id === key);
          if (subProduct && !subProduct.deleted_at) {
            lastStockUpdateBySubProductId.set(key, update);
          }
        }
      }
    });
    
    // Filtrer les produits non supprimés avant de créer le tableau
    const activeProducts = sortedProducts.filter(cp => !cp.deleted_at);
    
    const tableData = activeProducts.map((cp) => {
      const prod = productOrP(cp);
      const productName = prod?.name || 'Produit';
      const info = productInfos[cp.product_id || ''] || '';
      const barcode = prod?.barcode || ''; // Code barre produit
      const effectivePrice = cp.custom_price ?? prod?.price ?? 0;
      const effectiveRecommendedSalePrice = cp.custom_recommended_sale_price ?? prod?.recommended_sale_price ?? null;
      
      // Calculer le stock pour "Qté Remise" selon les règles :
      // - Produit sans sous-produits : dernier new_stock du produit (non supprimé)
      // - Produit avec sous-produits : somme des derniers new_stock de ses sous-produits (non supprimés)
      let stock = 0;
      const productSubProducts = (subProductsByProductId[cp.product_id || ''] || []).filter((sp: any) => !sp.deleted_at);
      const hasSubProducts = productSubProducts.length > 0;
      
      if (hasSubProducts) {
        // Produit avec sous-produits : somme des new_stock de tous les sous-produits non supprimés
        productSubProducts.forEach((sp: any) => {
          const lastSubProductUpdate = lastStockUpdateBySubProductId.get(sp.id);
          if (lastSubProductUpdate) {
            stock += lastSubProductUpdate.new_stock || 0;
          }
        });
      } else {
        // Produit sans sous-produits : dernier new_stock du produit (non supprimé)
        const lastProductUpdate = lastStockUpdateByProductId.get(cp.product_id || '');
        stock = lastProductUpdate ? (lastProductUpdate.new_stock || 0) : 0;
      }
      
      return [
        info, // Infos (colonne 0)
        productName, // Produit (colonne 1)
        stock.toString(), // Qté remise (colonne 2)
        barcode, // Code-barres (colonne 3)
        `${effectivePrice.toFixed(2)} €`, // Prix cession HT (colonne 4)
        effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-' // Prix conseillé TTC (colonne 5)
      ];
    });

    const marginLeft = 15;
    const marginRight = 15;
    const tableWidth = pageWidth - marginLeft - marginRight;
    
    // Nouvel ordre : Infos, Produit, Qté remise, Code-barres, Prix cession HT, Prix conseillé TTC
    // Colonne Infos plus fine, espace redistribué sur les autres colonnes pour maintenir la largeur totale
    const columnWidths = [
      tableWidth * 0.12, // Infos (réduite de 0.25 à 0.12)
      tableWidth * 0.28, // Produit (augmentée de 0.20 à 0.28)
      tableWidth * 0.10, // Qté remise (inchangée)
      tableWidth * 0.20, // Code-barres (réduite de 0.25 à 0.20)
      tableWidth * 0.15, // Prix cession HT (augmentée de 0.10 à 0.15)
      tableWidth * 0.15  // Prix conseillé TTC (augmentée de 0.10 à 0.15)
      // Total: 0.12 + 0.28 + 0.10 + 0.20 + 0.15 + 0.15 = 1.00
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [[
        'Infos',
        'Produit',
        { content: 'Qté remise', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
        { content: 'Code-barres', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
        { content: 'Prix cession HT', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
        { content: 'Prix conseillé TTC', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }
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
        0: { halign: 'left', fontSize: 8, cellWidth: columnWidths[0] }, // Infos (même fontSize que Produit)
        1: { halign: 'left', fontSize: 8, cellWidth: columnWidths[1] }, // Produit
        2: { halign: 'center', fontSize: 8, cellWidth: columnWidths[2] }, // Qté remise
        3: { halign: 'center', fontSize: 8, cellWidth: columnWidths[3] }, // Code-barres
        4: { halign: 'center', fontSize: 8, cellWidth: columnWidths[4] }, // Prix cession HT
        5: { halign: 'center', fontSize: 8, cellWidth: columnWidths[5] }  // Prix conseillé TTC
      }
    });

    // Conditions de Dépôt-Vente en bas de page
    const footerY = pageHeight - 20;
    
    // Définir les marges pour les conditions générales
    const leftMargin = 15;
    const rightMargin = 15;
    const availableWidth = pageWidth - leftMargin - rightMargin;
    
    // Récupérer les conditions générales personnalisées ou utiliser la valeur par défaut
    const getDefaultConditions = (companyName: string | null): string => {
      const company = companyName || 'Votre Société';
      return `Conditions de Dépôt-Vente : La marchandise et les présentoirs mis en dépôt restent la propriété de ${company}. Le dépositaire s'engage à régler comptant les produits vendus à la date d'émission de la facture. Le dépositaire s'engage à assurer la marchandise et les présentoirs contre tous les risques (vol, incendie, dégâts des eaux,…). En cas d'une saisie, le client s'engage à informer l'huissier de la réserve de propriété de ${company}. Tout retard de paiement entraîne une indemnité forfaitaire de 40 € + pénalités de retard de 3 fois le taux d'intérêt légal.`;
    };
    const conditionsText = userProfile?.terms_and_conditions || getDefaultConditions(userProfile?.company_name || null);
    
    // Diviser le texte en lignes adaptées à la largeur disponible
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const conditionsLines = doc.splitTextToSize(conditionsText, availableWidth);
    
    doc.setTextColor(0, 0, 0);
    
    conditionsLines.forEach((line: string, index: number) => {
      doc.text(line, leftMargin, footerY + (index * 3.5), { maxWidth: availableWidth });
    });

    // Add page numbers (footer) before generating the blob
    addPageNumbers(doc);

    const pdfBlobData = doc.output('blob');

    // Compute target folder and base name
    const folder =
      (allowReplacement && (existingDepositSlipPdfPath || invoice.deposit_slip_pdf_path))
        ? (existingDepositSlipPdfPath || invoice.deposit_slip_pdf_path)!.split('/').slice(0, -1).join('/')
        : `invoices/${invoice.id}`;
    const baseDate = new Date(invoice.created_at).toISOString().split('T')[0];
    const baseName = `deposit_slip_${baseDate}`;

    const isDuplicateUploadError = (msg?: string) =>
      !!msg && (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('409'));

    let finalFilePath: string | null = null;
    for (let i = 0; i < 50; i++) {
      const suffix = i === 0 ? '' : `_${i + 1}`;
      const candidate = `${folder}/${baseName}${suffix}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(candidate, pdfBlobData, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        if (isDuplicateUploadError(uploadError.message)) {
          continue;
        }
        throw uploadError;
      }

      finalFilePath = candidate;
      break;
    }

    if (!finalFilePath) {
      throw new Error('Impossible de générer un nom de fichier unique pour le bon de dépôt');
    }

    // Mettre à jour deposit_slip_pdf_path (toujours en mode remplacement, sinon uniquement si NULL)
    let query = supabase
      .from('invoices')
      .update({ deposit_slip_pdf_path: finalFilePath })
      .eq('id', invoice.id)
      .eq('company_id', companyId);

    if (!allowReplacement) {
      query = query.is('deposit_slip_pdf_path', null);
    }

    const { error: updateError } = await query;
    if (updateError) {
      if (!allowReplacement) {
        console.warn('Error updating invoice with PDF path (likely already set):', updateError);
      } else {
        throw updateError;
      }
    } else {
      console.log('Deposit slip PDF saved successfully:', finalFilePath);
    }

    return finalFilePath;
  } catch (error) {
    console.error('Error generating deposit slip PDF:', error);
    throw error;
  }
}

// Replacement flow is handled by generateAndSaveDepositSlipPDF via allowReplacement=true.

/**
 * Generate and save credit note PDF
 * This function generates the credit note PDF and saves it to Supabase storage.
 * It only saves if the PDF doesn't already exist (immutability).
 */
export async function generateAndSaveCreditNotePDF(params: GenerateCreditNotePDFParams): Promise<void> {
  const { creditNote, invoice, client, userProfile } = params;

  // Check if PDF already exists
  if (creditNote.credit_note_pdf_path) {
    console.log('Credit note PDF already exists, skipping generation:', creditNote.credit_note_pdf_path);
    return;
  }

  // 🧪 TEST ROLLBACK - Décommenter la ligne suivante pour tester le système de rollback
 // throw new Error('TEST: Simulated PDF generation failure for rollback testing');

  try {
    // Load user profile if not provided
    let profile = userProfile;
    if (!profile) {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data: userProfileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', companyId)
        .limit(1)
        .maybeSingle();
      profile = userProfileData;
    }

    // Import jsPDF dynamically
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
    if (profile && profile.company_name) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(profile.company_name, leftBoxX + 2, yPosition);
      yPosition += 5;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (profile) {
      // Nom/Prénom
      if (profile.first_name || profile.last_name) {
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        doc.text(fullName, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      
      yPosition += 2;
      
      if (profile.street_address) {
        doc.text(profile.street_address, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (profile.postal_code || profile.city) {
        doc.text(`${profile.postal_code || ''} ${profile.city || ''}`.trim(), leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (profile.email) {
        doc.text(`Email: ${profile.email}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      
      if (profile.email && profile.siret) {
        yPosition += 2;
      }
      
      if (profile.siret) {
        doc.text(`SIRET: ${formatSIRETNumber(profile.siret)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (profile.tva_number) {
        doc.text(`TVA: ${formatTVANumber(profile.tva_number)}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      
      if (profile.tva_number && profile.phone) {
        yPosition += 2;
      }
      
      if (profile.phone) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tél: ${formatPhoneNumber(profile.phone)}`, leftBoxX + 2, yPosition);
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
    
    // Nom de la société en gras et police plus grande
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

    // Encart numéro de client et numéro d'avoir (en dessous du DÉTAILLANT)
    clientYPosition += 6;
    const infoBoxY = clientYPosition;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    clientYPosition += 4;
    
    if (client.client_number) {
      doc.text(`N° Client: ${client.client_number}`, rightBoxX + 2, clientYPosition);
      clientYPosition += 5;
    }
    
    // Utiliser le numéro d'avoir stocké dans la base de données
    const creditNoteNumber = creditNote.credit_note_number || 'N/A';
    doc.text(`N° Avoir: ${creditNoteNumber}`, rightBoxX + 2, clientYPosition);
    clientYPosition += 5;
    
    // Numéro de facture d'origine
    const invoiceNumber = invoice.invoice_number || 'N/A';
    doc.text(`N° Facture: ${invoiceNumber}`, rightBoxX + 2, clientYPosition);
    clientYPosition += 3;
    
    const infoBoxHeight = clientYPosition - infoBoxY + 1;
    doc.rect(rightBoxX, infoBoxY, rightBoxWidth, infoBoxHeight);

    // Date de l'avoir
    yPosition = Math.max(yPosition, clientYPosition) + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date: ${new Date(creditNote.credit_note_date).toLocaleDateString('fr-FR')}`, globalLeftMargin, yPosition);
    yPosition += 10;

    // Titre "Avoir N° [numero_avoir]"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Avoir N° ${creditNoteNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Sous-titre "Avoir sur facture n° [numero_facture] du [date]"
    const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString('fr-FR');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Avoir sur facture n° ${invoiceNumber} du ${invoiceDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Tableau simplifié avec seulement les colonnes demandées
    const tableData = [[
      creditNote.operation_name,
      creditNote.quantity.toString(),
      creditNote.unit_price.toFixed(2) + ' €',
      creditNote.total_amount.toFixed(2) + ' €'
    ]];

    autoTable(doc, {
      startY: yPosition,
      head: [['Produits et prestations', 'Qté', 'PU HT', 'Total HT']],
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
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: globalLeftMargin, right: globalRightMargin }
    });

    // Tableau récapitulatif des totaux
    const finalTableY = (doc as any).lastAutoTable.finalY + 8;
    const totalHT = creditNote.total_amount;
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    autoTable(doc, {
      startY: finalTableY,
      body: [
        ['TOTAL H.T.', totalHT.toFixed(2) + ' €'],
        ['TVA 20%', tva.toFixed(2) + ' €'],
        ['TOTAL T.T.C', totalTTC.toFixed(2) + ' €']
      ],
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        fontStyle: 'bold',
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }
      },
      margin: { left: globalLeftMargin, right: globalRightMargin },
      didDrawCell: (data: any) => {
        const { cell, column, cursor } = data;
        
        doc.setLineWidth(0.3);
        doc.setDrawColor(0, 0, 0);
        
        if (column.index === 0) {
          doc.line(cursor.x, cursor.y, cursor.x, cursor.y + cell.height);
        }
        
        if (column.index === 1) {
          doc.line(cursor.x + cell.width, cursor.y, cursor.x + cell.width, cursor.y + cell.height);
        }
        
        doc.line(cursor.x, cursor.y, cursor.x + cell.width, cursor.y);
        doc.line(cursor.x, cursor.y + cell.height, cursor.x + cell.width, cursor.y + cell.height);
      }
    });

    // Add page numbers (footer) before generating the blob
    addPageNumbers(doc);

    // Generate PDF blob
    const pdfBlobData = doc.output('blob');

    // Save PDF to storage in credit_notes folder
    const filePath = `credit_notes/${creditNote.id}/credit_note_${new Date(creditNote.created_at).toISOString().split('T')[0]}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBlobData, {
        contentType: 'application/pdf',
        upsert: false // Never overwrite - credit notes are immutable
      });

    if (uploadError) {
      // Check if error is due to file already existing
      if (uploadError.message?.includes('already exists') || 
          uploadError.message?.includes('duplicate') ||
          uploadError.message?.includes('409')) {
        console.log('PDF already exists, not overwriting (credit note is immutable):', filePath);
      } else {
        throw uploadError;
      }
    } else if (uploadData) {
      // Update credit note with PDF path ONLY if it doesn't exist yet
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error: updateError } = await supabase
        .from('credit_notes')
        .update({ credit_note_pdf_path: filePath })
        .eq('id', creditNote.id)
        .eq('company_id', companyId)
        .is('credit_note_pdf_path', null); // Only update if credit_note_pdf_path is null
      
      if (updateError) {
        console.warn('Error updating credit note with PDF path:', updateError);
      } else {
        console.log('Credit note PDF saved successfully:', filePath);
      }
    }
  } catch (error) {
    console.error('Error generating credit note PDF:', error);
    throw error;
  }
}

interface GenerateClientInfoPDFParams {
  client: Client;
  establishmentType: EstablishmentType | null;
  paymentMethod: PaymentMethod | null;
  tourName?: string | null;
}

/**
 * Generate client information sheet PDF - optimized for single page
 */
export async function generateClientInfoPDF(
  params: GenerateClientInfoPDFParams
): Promise<Blob> {
  const { client, establishmentType, paymentMethod, tourName } = params;

  try {
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 4;
    const contentWidth = pageWidth - 2 * margin;
    const columnGap = 8;
    const columnWidth = (contentWidth - columnGap) / 2;

    let yPosition = margin + 10;

    /* --------------------------------------------------
     * Utils
     * -------------------------------------------------- */
    const splitText = (
      text: string,
      maxWidth: number,
      fontSize: number
    ): string[] => {
      if (!text) return [];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(text, maxWidth);
    };

    /* --------------------------------------------------
     * HEADER
     * -------------------------------------------------- */
    // Premier contact en haut à gauche (nom + téléphone)
    const contactName = client.phone_1_info?.trim() || null;
    const contactPhone = client.phone?.trim()
      ? formatPhoneNumber(client.phone)
      : null;
    if (contactName || contactPhone) {
      const leftX = margin;
      let contactY = margin + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor('#013258');
      if (contactName) {
        doc.text(contactName, leftX, contactY, { align: 'left' });
        contactY += 5;
      }
      if (contactPhone) {
        doc.setFont('helvetica', 'normal');
        doc.text(contactPhone, leftX, contactY, { align: 'left' });
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor('#013258');
    doc.text(client.name || 'Non renseigné', pageWidth / 2, yPosition, {
      align: 'center',
    });

    yPosition += 8;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(16);
    doc.setTextColor('#1873c0');
    doc.text('Fiche Client', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 6;

    doc.setFillColor('#013258');
    doc.roundedRect(5, yPosition, pageWidth - 10, 2, 1, 1, 'F');
    doc.roundedRect(5, yPosition + 3, pageWidth - 10, 2, 1, 1, 'F');

    yPosition += 15;

    /* --------------------------------------------------
     * Section helper (padding contenu symétrique)
     * -------------------------------------------------- */
    const addSection = (
      title: string,
      fields: Array<{ label: string; value: string; fullWidth?: boolean; column?: 'left' | 'right' }>
    ) => {
      const sectionX = 8;
      const sectionWidth = pageWidth - sectionX * 2;

      const paddingHorizontal = 4;
      const paddingVertical = 8; // 🔴 padding HAUT = BAS (contenu uniquement) - augmenté pour éviter que le contenu touche les bords

      const titleHeight = 6;
      const sectionGap = 8;
      const lineHeight = 5;
      const fieldSpacing = 2; // Espacement vertical entre chaque label

      const sectionStartY = yPosition;

      // 🔑 Début du contenu (APRÈS le titre)
      const contentStartY =
        sectionStartY + titleHeight + paddingVertical;

      /* ----------------------------
       * 1️⃣ Calcul hauteur contenu
       * ---------------------------- */
      let leftY = contentStartY;
      let rightY = contentStartY;
      let cursorLeft = true;

      fields.forEach(field => {
        const isFull = field.fullWidth;
        const value = field.value || 'Non renseigné';

        const availableWidth = isFull
          ? sectionWidth - paddingHorizontal * 2
          : columnWidth;

        const label = `${field.label.trim()} : `;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const labelWidth = doc.getTextWidth(label);

        const valueLines = splitText(
          value,
          availableWidth - labelWidth,
          9
        );

        const blockHeight =
          Math.max(1, valueLines.length) * lineHeight + fieldSpacing;

        const forceColumn = field.column;

        if (isFull) {
          const y = Math.max(leftY, rightY);
          leftY = y + blockHeight;
          rightY = leftY;
          cursorLeft = true;
        } else if (forceColumn === 'right') {
          rightY += blockHeight;
        } else if (forceColumn === 'left' || cursorLeft) {
          leftY += blockHeight;
          if (!forceColumn) cursorLeft = false;
        } else {
          rightY += blockHeight;
          const maxY = Math.max(leftY, rightY);
          leftY = maxY;
          rightY = maxY;
          cursorLeft = true;
        }
      });

      const contentEndY = Math.max(leftY, rightY);
      // Retirer le fieldSpacing du dernier élément pour avoir un padding symétrique
      const contentHeight = contentEndY - contentStartY - fieldSpacing;

      /* ----------------------------
       * 2️⃣ Hauteur section (clé)
       * ---------------------------- */
      const sectionHeight =
        titleHeight +
        paddingVertical +
        contentHeight +
        paddingVertical;

      /* ----------------------------
       * 3️⃣ Cadre
       * ---------------------------- */
      doc.setDrawColor('#dbe7f3');
      doc.setFillColor('#FFFFFF');
      doc.roundedRect(
        sectionX,
        sectionStartY,
        sectionWidth,
        sectionHeight,
        4,
        4,
        'FD'
      );

      /* ----------------------------
       * 4️⃣ Titre (hors symétrie)
       * ---------------------------- */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor('#1873c0');

      const titleWidth = doc.getTextWidth(title) + 6;
      doc.setFillColor('#FFFFFF');
      doc.rect(sectionX + 4, sectionStartY - 2, titleWidth, titleHeight, 'F');
      doc.text(title, sectionX + 7, sectionStartY + 1);

      /* ----------------------------
       * 5️⃣ Rendu contenu
       * ---------------------------- */
      doc.setFontSize(10);
      doc.setTextColor('#013258');

      leftY = contentStartY;
      rightY = contentStartY;
      cursorLeft = true;

      fields.forEach(field => {
        // Ignorer les champs vides (utilisés pour forcer l'alignement)
        if (!field.label && !field.value) {
          // Mettre à jour cursorLeft pour forcer le suivant à gauche
          // Mais ne pas mettre à jour les positions Y pour éviter l'espace
          cursorLeft = true;
          return;
        }
        
        const isFull = field.fullWidth;
        const value = field.value || 'Non renseigné';
        const forceColumn = field.column;
        const useRight = !isFull && (forceColumn === 'right' || (!forceColumn && !cursorLeft));

        const x = isFull
          ? sectionX + paddingHorizontal
          : useRight
          ? sectionX + paddingHorizontal + columnWidth + columnGap
          : sectionX + paddingHorizontal;

        const y = isFull
          ? Math.max(leftY, rightY)
          : useRight
          ? rightY
          : leftY;

        const availableWidth = isFull
          ? sectionWidth - paddingHorizontal * 2
          : columnWidth;

        const label = `${field.label.trim()} : `;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(label, x, y);

        const labelWidth = doc.getTextWidth(label);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const valueLines = splitText(
          value,
          availableWidth - labelWidth,
          10
        );

        valueLines.forEach((line, i) => {
          // Pour "Horaires d'ouverture", mettre les valeurs sur une nouvelle ligne
          const isOpeningHours = field.label === "Horaires d'ouverture";
          const xPos = isOpeningHours ? x : (i === 0 ? x + labelWidth : x);
          const yPos = isOpeningHours ? y + (i + 1) * lineHeight : y + i * lineHeight;
          doc.setFontSize(10);
          doc.text(line, xPos, yPos);
        });

        // Pour "Horaires d'ouverture", ajouter une ligne supplémentaire pour l'espacement
        const isOpeningHours = field.label === "Horaires d'ouverture";
        const blockHeight =
          Math.max(1, valueLines.length) * lineHeight + fieldSpacing + (isOpeningHours ? lineHeight : 0);

        if (isFull) {
          leftY = y + blockHeight;
          rightY = leftY;
          cursorLeft = true;
        } else if (forceColumn === 'right') {
          rightY = y + blockHeight;
        } else if (forceColumn === 'left' || cursorLeft) {
          leftY = y + blockHeight;
          if (!forceColumn) cursorLeft = false;
        } else {
          rightY = y + blockHeight;
          const maxY = Math.max(leftY, rightY);
          leftY = maxY;
          rightY = maxY;
          cursorLeft = true;
        }
      });

      yPosition = sectionStartY + sectionHeight + sectionGap;
    };

    /* --------------------------------------------------
     * Utils - Formatage
     * -------------------------------------------------- */
    // Les fonctions de formatage sont définies en haut du fichier (formatPhoneNumber, formatTVANumber, formatSIRETNumber)

    /* --------------------------------------------------
     * Sections
     * -------------------------------------------------- */

    addSection('Informations générales', [
      { label: 'Nom Commercial', value: client.name || '' },
      { label: 'Nom Société', value: client.company_name || '' },
      { label: "Type d'établissement", value: establishmentType?.name || '' },
      { label: 'Numéro client', value: client.client_number || '' },
      { label: 'Nom de la tournée', value: tourName || '' },
      { label: 'Numéro SIRET', value: formatSIRETNumber(client.siret_number) },
      { label: 'Numéro de TVA', value: formatTVANumber(client.tva_number) },
    ]);

    addSection('Coordonnées', [
      { 
        label: 'Adresse', 
        value: [
          client.street_address,
          client.postal_code,
          client.city
        ].filter(Boolean).join(' '), 
        fullWidth: true 
      },
      { 
        label: 'Téléphone 2', 
        value: [
          formatPhoneNumber(client.phone_2),
          client.phone_2_info
        ].filter(Boolean).join(' - ') || ''
      },
      { 
        label: 'Téléphone 3', 
        value: [
          formatPhoneNumber(client.phone_3),
          client.phone_3_info
        ].filter(Boolean).join(' - ') || ''
      },
      { label: 'Email', value: client.email || '' },
    ]);

    const complementaryFields: any[] = [];

    // Informations complémentaires : gauche = horaires d'ouverture, droite = reste des infos
    const leftComplementary: Array<{ label: string; value: string; column: 'left' }> = [];
    let rightComplementary: Array<{ label: string; value: string; column: 'right' }> = [];

    // Horaires d'ouverture → gauche
    if (client.opening_hours) {
      const data = formatWeekScheduleData(client.opening_hours);
      if (data.length) {
        leftComplementary.push({
          label: "Horaires d'ouverture",
          value: data.map(d => `${d.day}: ${d.hours}`).join('\n'),
          column: 'left',
        });
      }
    }

    // Reste des infos → droite
    if (client.market_days_schedule) {
      const data = formatMarketDaysScheduleData(client.market_days_schedule);
      if (data.length) {
        rightComplementary.push({
          label: 'Jour(s) de marché',
          value: data.map(d => `${d.day}: ${d.hours}`).join('\n'),
          column: 'right',
        });
      }
    }
    if (client.comment) {
      rightComplementary.push({ label: 'Commentaire', value: client.comment, column: 'right' });
    }
    rightComplementary.push({
      label: 'Règlement',
      value: paymentMethod?.name || '',
      column: 'right',
    });
    if (client.visit_frequency_number && client.visit_frequency_unit) {
      rightComplementary.push({
        label: 'Fréquence de passage',
        value: `${client.visit_frequency_number} ${client.visit_frequency_unit}`,
        column: 'right',
      });
    }
    if ((client.average_time_hours !== null && client.average_time_hours !== undefined) ||
        (client.average_time_minutes !== null && client.average_time_minutes !== undefined)) {
      const hours = client.average_time_hours || 0;
      const minutes = client.average_time_minutes || 0;
      rightComplementary.push({
        label: 'Temps moyen',
        value: `${hours}h${minutes.toString().padStart(2, '0')}`,
        column: 'right',
      });
    }

    // Assembler : horaires à gauche, reste à droite
    complementaryFields.push(...leftComplementary, ...rightComplementary);

    addSection('Informations complémentaires', complementaryFields);

    /* --------------------------------------------------
     * Cartes occasions spéciales
     * -------------------------------------------------- */
    const cardsLabels: Record<string, string> = {
      saint_valentin: 'Saint-Valentin',
      communion: 'Communion',
      paques: 'Pâques',
      premier_mai: '1er mai',
      fete_des_meres: "Fête des mères",
      fete_des_peres: "Fête des pères",
      bapteme: 'Baptême',
      mariage: 'Mariage',
      anniversaire_mariage: 'Anniversaire de mariage',
      retraite: 'Retraite',
    };

    const cardsFields: Array<{ label: string; value: string }> = [];
    if (client.cards_quantities && Array.isArray(client.cards_quantities)) {
      for (const item of client.cards_quantities as any[]) {
        if (!item || typeof item !== 'object') continue;
        const label = cardsLabels[item.event] || item.event;
        const value =
          item.value != null
            ? String(item.value)
            : item.min != null && item.max != null
              ? `${item.min} - ${item.max}`
              : item.min != null
                ? `≥ ${item.min}`
                : item.max != null
                  ? `≤ ${item.max}`
                  : null;
        if (value != null) {
          cardsFields.push({ label, value });
        }
      }
    }

    if (cardsFields.length > 0) {
      addSection('Cartes occasions spéciales', cardsFields);
    }

    return doc.output('blob');
  } catch (error) {
    console.error('Error generating client info PDF:', error);
    throw error;
  }
}
