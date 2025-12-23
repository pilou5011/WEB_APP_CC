/**
 * PDF Generators Utility
 * 
 * This file contains functions to generate and save PDFs for invoices, stock reports, and deposit slips.
 * These functions are called automatically when stock is updated, and the dialogs only load existing PDFs.
 */

import { Client, Invoice, StockUpdate, Collection, ClientCollection, UserProfile, InvoiceAdjustment, SubProduct, ClientSubProduct, CreditNote, supabase } from '@/lib/supabase';

interface GenerateInvoicePDFParams {
  invoice: Invoice;
  client: Client;
  clientCollections: (ClientCollection & { collection?: Collection })[];
  collections: Collection[];
  stockUpdates: StockUpdate[];
  adjustments: InvoiceAdjustment[];
  userProfile: UserProfile | null;
}

interface GenerateStockReportPDFParams {
  invoice: Invoice;
  client: Client;
  clientCollections: (ClientCollection & { collection?: Collection })[];
  stockUpdates: StockUpdate[];
}

interface GenerateDepositSlipPDFParams {
  invoice: Invoice;
  client: Client;
  clientCollections: (ClientCollection & { collection?: Collection })[];
  stockUpdates: StockUpdate[];
  userProfile: UserProfile | null;
}

interface GenerateCreditNotePDFParams {
  creditNote: CreditNote;
  invoice: Invoice;
  client: Client;
  userProfile: UserProfile | null;
}

/**
 * Generate and save invoice PDF
 * This function generates the invoice PDF and saves it to Supabase storage.
 * It only saves if the PDF doesn't already exist (immutability).
 */
export async function generateAndSaveInvoicePDF(params: GenerateInvoicePDFParams): Promise<void> {
  const { invoice, client, clientCollections, collections, stockUpdates, adjustments, userProfile } = params;

  // Check if PDF already exists
  if (invoice.invoice_pdf_path) {
    console.log('Invoice PDF already exists, skipping generation:', invoice.invoice_pdf_path);
    return;
  }

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
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`, globalLeftMargin, yPosition);
    yPosition += 10;

    // Titre "Facture N°[numero_facture]" en gras
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Facture N°${invoiceNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // 3) Tableau des collections
    // Filter out sub-products: only include stock updates with collection_id and no sub_product_id
    const collectionStockUpdates = stockUpdates.filter(update => 
      update.collection_id && !update.sub_product_id
    );
    
    // Sort stock updates by collection display_order
    const sortedStockUpdates = [...collectionStockUpdates].sort((a, b) => {
      const aCC = clientCollections.find(cc => cc.collection_id === a.collection_id);
      const bCC = clientCollections.find(cc => cc.collection_id === b.collection_id);
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
      const collection = collections.find(c => c.id === update.collection_id);
      const clientCollection = clientCollections.find(cc => cc.collection_id === update.collection_id);
      const effectivePrice = clientCollection?.custom_price ?? collection?.price ?? 0;
      const totalHTBeforeDiscount = update.cards_sold * effectivePrice;
      // Appliquer la remise proportionnellement à chaque ligne (conforme fiscalement)
      const totalHTAfterDiscount = totalHTBeforeDiscount * discountRatio;
      
      return [
        collection?.name || 'Collection',
        update.collection_info || '', // Infos optionnelles
        collection?.barcode || '', // Code barre produit
        update.previous_stock.toString(),
        update.counted_stock.toString(),
        update.cards_sold.toString(),
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
      head: [['Collection', 'Infos', 'Code-barres', 'Qté remise', 'Qté reprise', 'Qté vendue', 'PU HT', 'Total HT']],
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

    // Calculer les totaux (uniquement pour les collections, pas les sous-produits)
    // Note: discountPercentage et discountRatio sont déjà définis plus haut
    const adjustmentsTotal = adjustments.reduce((sum, adj) => sum + Number(adj.amount || 0), 0);
    const totalHTBeforeDiscount = collectionStockUpdates.reduce((sum, update) => {
      const collection = collections.find(c => c.id === update.collection_id);
      const clientCollection = clientCollections.find(cc => cc.collection_id === update.collection_id);
      const effectivePrice = clientCollection?.custom_price ?? collection?.price ?? 0;
      return sum + (update.cards_sold * effectivePrice);
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
    
    autoTable(doc, {
      startY: finalTableY,
      body: summaryRows,
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

    // Conditions de Dépôt-Vente - toujours en bas de page
    const finalSummaryTableY = (doc as any).lastAutoTable.finalY;
    
    // Récupérer les conditions générales personnalisées ou utiliser la valeur par défaut
    const getDefaultConditions = (companyName: string | null): string => {
      const company = companyName || 'Votre Société';
      return `Conditions de Dépôt-Vente : La marchandise et les présentoirs mis en dépôt restent la propriété de ${company}. Le dépositaire s'engage à régler comptant les produits vendus à la date d'émission de la facture. Le dépositaire s'engage à assurer la marchandise et les présentoirs contre tous les risques (vol, incendie, dégâts des eaux,…). En cas d'une saisie, le client s'engage à informer l'huissier de la réserve de propriété de ${company}. Tout retard de paiement entraîne une indemnité forfaitaire de 40 € + pénalités de retard de 3 fois le taux d'intérêt légal.`;
    };
    const conditionsText = userProfile?.terms_and_conditions || getDefaultConditions(userProfile?.company_name || null);
    
    // Calculer la largeur disponible en tenant compte des marges gauche et droite
    const availableWidth = pageWidth - globalLeftMargin - globalRightMargin;
    
    // Diviser le texte en lignes adaptées à la largeur disponible
    // Utiliser doc.splitTextToSize pour diviser le texte correctement selon la largeur en mm
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const conditionsLines = doc.splitTextToSize(conditionsText, availableWidth);
    
    const conditionsHeight = conditionsLines.length * 3.5; // Hauteur approximative des lignes de conditions
    const footerY = pageHeight - 20; // Position en bas de page pour les conditions
    
    // Vérifier si le tableau récapitulatif chevaucherait l'espace réservé aux conditions
    // Si oui, créer une nouvelle page pour placer les conditions en bas
    if (finalSummaryTableY + 10 > footerY - conditionsHeight) {
      doc.addPage();
    }
    
    // Toujours placer les conditions en bas de la page actuelle
    doc.setTextColor(0, 0, 0);
    
    // Placer les conditions en bas de page (footerY) avec marge droite
    conditionsLines.forEach((line: string, index: number) => {
      doc.text(line, globalLeftMargin, footerY + (index * 3.5), { maxWidth: availableWidth });
    });

    // Generate PDF blob
    const pdfBlobData = doc.output('blob');

    // Save PDF to storage
    const filePath = `invoices/${invoice.id}/invoice_${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBlobData, {
        contentType: 'application/pdf',
        upsert: false // Never overwrite - factures are immutable
      });

    if (uploadError) {
      // Check if error is due to file already existing
      if (uploadError.message?.includes('already exists') || 
          uploadError.message?.includes('duplicate') ||
          uploadError.message?.includes('409')) {
        console.log('PDF already exists, not overwriting (facture is immutable):', filePath);
      } else {
        throw uploadError;
      }
    } else if (uploadData) {
      // Update invoice with PDF path ONLY if it doesn't exist yet
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ invoice_pdf_path: filePath })
        .eq('id', invoice.id)
        .is('invoice_pdf_path', null); // Only update if invoice_pdf_path is null
      
      if (updateError) {
        console.warn('Error updating invoice with PDF path:', updateError);
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
  const { invoice, client, clientCollections, stockUpdates } = params;

  // Check if PDF already exists
  if (invoice.stock_report_pdf_path) {
    console.log('Stock report PDF already exists, skipping generation:', invoice.stock_report_pdf_path);
    return;
  }

  try {
    // Load required data
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1)
      .maybeSingle();

    const { data: subProducts } = await supabase
      .from('sub_products')
      .select('*');

    const { data: clientSubProducts } = await supabase
      .from('client_sub_products')
      .select('*')
      .eq('client_id', client.id);

    // Get previous invoice date
    const { data: previousInvoice } = await supabase
      .from('invoices')
      .select('created_at')
      .eq('client_id', client.id)
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

    // Dates
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const previousDepositText = previousInvoiceDate 
      ? `Dépôt précédent : ${new Date(previousInvoiceDate).toLocaleDateString('fr-FR')}`
      : 'Dépôt précédent : -';
    doc.text(previousDepositText, 15, yPosition);
    yPosition += 5;
    
    const invoiceDateText = `Date de facture : ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`;
    doc.text(invoiceDateText, 15, yPosition);
    yPosition += 10;

    // Titre "Relevé de stock"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Relevé de stock', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Create maps for stock updates
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

    // Create maps for last new_stock
    const lastNewStockByCollectionId = new Map<string, number>();
    const lastNewStockBySubProductId = new Map<string, number>();
    
    (historicalStockUpdates || []).forEach((update: StockUpdate) => {
      if (update.collection_id && !update.sub_product_id) {
        if (!lastNewStockByCollectionId.has(update.collection_id)) {
          lastNewStockByCollectionId.set(update.collection_id, update.new_stock);
        }
      }
      if (update.sub_product_id) {
        if (!lastNewStockBySubProductId.has(update.sub_product_id)) {
          lastNewStockBySubProductId.set(update.sub_product_id, update.new_stock);
        }
      }
    });

    // Create map of sub-products by collection
    const subProductsByCollectionId = new Map<string, SubProduct[]>();
    (subProducts || []).forEach(sp => {
      if (!subProductsByCollectionId.has(sp.collection_id)) {
        subProductsByCollectionId.set(sp.collection_id, []);
      }
      subProductsByCollectionId.get(sp.collection_id)!.push(sp);
    });

    const tableData: any[] = [];
    const sortedCollections = [...clientCollections].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    sortedCollections.forEach((cc) => {
      const collectionName = cc.collection?.name || 'Collection';
      const info = '';
      const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
      const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
      
      const stockUpdate = stockUpdatesByCollectionId.get(cc.collection_id || '');
      const collectionSubProducts = subProductsByCollectionId.get(cc.collection_id || '') || [];
      const hasSubProducts = collectionSubProducts.length > 0;
      
      let previousStock: number;
      let countedStock: number;
      let newDeposit: number;
      let reassort: number;
      
      if (hasSubProducts) {
        let totalSubProductCountedStock = 0;
        let totalSubProductPreviousStock = 0;
        let totalSubProductNewDeposit = 0;
        let totalSubProductReassort = 0;
        
        collectionSubProducts.forEach(sp => {
          const subProductStockUpdate = stockUpdatesBySubProductId.get(sp.id);
          
          let subProductPreviousStock: number;
          let subProductCountedStock: number;
          let subProductNewDeposit: number;
          let subProductReassort: number;
          
          if (subProductStockUpdate) {
            const hasNewDeposit = subProductStockUpdate.cards_added > 0;
            const hasCountedStock = subProductStockUpdate.counted_stock !== null && 
                                   subProductStockUpdate.counted_stock !== undefined;
            
            if (hasCountedStock && !hasNewDeposit) {
              const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
              subProductPreviousStock = lastNewStock;
              subProductCountedStock = lastNewStock;
              subProductReassort = 0;
              subProductNewDeposit = lastNewStock;
            } else if (hasCountedStock && hasNewDeposit) {
              subProductPreviousStock = subProductStockUpdate.previous_stock;
              subProductCountedStock = subProductStockUpdate.counted_stock;
              subProductReassort = subProductStockUpdate.cards_added;
              subProductNewDeposit = subProductStockUpdate.new_stock;
            } else {
              const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
              subProductPreviousStock = lastNewStock;
              subProductCountedStock = lastNewStock;
              subProductReassort = 0;
              subProductNewDeposit = lastNewStock;
            }
          } else {
            const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
            subProductPreviousStock = lastNewStock;
            subProductCountedStock = lastNewStock;
            subProductReassort = 0;
            subProductNewDeposit = lastNewStock;
          }
          
          totalSubProductCountedStock += subProductCountedStock;
          totalSubProductPreviousStock += subProductPreviousStock;
          totalSubProductNewDeposit += subProductNewDeposit;
          totalSubProductReassort += subProductReassort;
        });
        
        previousStock = totalSubProductPreviousStock;
        countedStock = totalSubProductCountedStock;
        reassort = totalSubProductReassort;
        newDeposit = totalSubProductNewDeposit;
      } else {
        if (stockUpdate) {
          const hasNewDeposit = stockUpdate.cards_added > 0;
          const hasCountedStock = stockUpdate.counted_stock !== null && 
                                 stockUpdate.counted_stock !== undefined;
          
          if (hasCountedStock && !hasNewDeposit) {
            const lastNewStock = lastNewStockByCollectionId.get(cc.collection_id || '') || 0;
            previousStock = lastNewStock;
            countedStock = lastNewStock;
            reassort = 0;
            newDeposit = lastNewStock;
          } else if (hasCountedStock && hasNewDeposit) {
            previousStock = stockUpdate.previous_stock;
            countedStock = stockUpdate.counted_stock;
            reassort = stockUpdate.cards_added;
            newDeposit = stockUpdate.new_stock;
          } else {
            const lastNewStock = lastNewStockByCollectionId.get(cc.collection_id || '') || 0;
            previousStock = lastNewStock;
            countedStock = lastNewStock;
            reassort = 0;
            newDeposit = lastNewStock;
          }
        } else {
          const lastNewStock = lastNewStockByCollectionId.get(cc.collection_id || '') || 0;
          previousStock = lastNewStock;
          countedStock = lastNewStock;
          reassort = 0;
          newDeposit = lastNewStock;
        }
      }
      
      const collectionRow = [
        collectionName,
        info,
        `${effectivePrice.toFixed(2)} €`,
        effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
        previousStock.toString(),
        countedStock.toString(),
        reassort.toString(),
        newDeposit.toString()
      ];
      
      tableData.push(collectionRow);

      // Add sub-products
      if (hasSubProducts) {
        collectionSubProducts.forEach(sp => {
          const subProductStockUpdate = stockUpdatesBySubProductId.get(sp.id);
          
          let subProductPreviousStock: number;
          let subProductCountedStock: number;
          let subProductNewDeposit: number;
          let subProductReassort: number;

          if (subProductStockUpdate) {
            const hasNewDeposit = subProductStockUpdate.cards_added > 0;
            const hasCountedStock = subProductStockUpdate.counted_stock !== null && 
                                   subProductStockUpdate.counted_stock !== undefined;
            
            if (hasCountedStock && !hasNewDeposit) {
              const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
              subProductPreviousStock = lastNewStock;
              subProductCountedStock = lastNewStock;
              subProductReassort = 0;
              subProductNewDeposit = lastNewStock;
            } else if (hasCountedStock && hasNewDeposit) {
              subProductPreviousStock = subProductStockUpdate.previous_stock;
              subProductCountedStock = subProductStockUpdate.counted_stock;
              subProductReassort = subProductStockUpdate.cards_added;
              subProductNewDeposit = subProductStockUpdate.new_stock;
            } else {
              const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
              subProductPreviousStock = lastNewStock;
              subProductCountedStock = lastNewStock;
              subProductReassort = 0;
              subProductNewDeposit = lastNewStock;
            }
          } else {
            const lastNewStock = lastNewStockBySubProductId.get(sp.id) || 0;
            subProductPreviousStock = lastNewStock;
            subProductCountedStock = lastNewStock;
            subProductNewDeposit = lastNewStock;
            subProductReassort = 0;
          }

          const subProductName = sp.name || 'Sous-produit';
          const indentedSubProductName = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' + subProductName;
          tableData.push([
            indentedSubProductName,
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

    const marginLeft = leftBoxX;
    const rightBoxRightEdge = rightBoxX + rightBoxWidth;
    const marginRight = pageWidth - rightBoxRightEdge;
    const tableWidth = pageWidth - marginLeft - marginRight;
    
    const fixedColumnsWidth = tableWidth * (0.15 + 0.08 + 0.08 + 0.08 + 0.08 + 0.08 + 0.08);
    const collectionColumnWidth = tableWidth - fixedColumnsWidth;
    
    const columnWidths = [
      collectionColumnWidth,
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
        'Collection', 
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
              
              data.cell.styles.fillColor = [245, 247, 250];
              
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
        4: { cellWidth: columnWidths[4], halign: 'center' },
        5: { cellWidth: columnWidths[5], halign: 'center' },
        6: { cellWidth: columnWidths[6], halign: 'center' },
        7: { cellWidth: columnWidths[7], halign: 'center' }
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      }
    } as any);

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
      } else {
        throw uploadError;
      }
    } else if (uploadData) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ stock_report_pdf_path: filePath })
        .eq('id', invoice.id)
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
 * It only saves if the PDF doesn't already exist (immutability).
 */
export async function generateAndSaveDepositSlipPDF(params: GenerateDepositSlipPDFParams): Promise<void> {
  const { invoice, client, clientCollections, stockUpdates, userProfile } = params;

  // Check if PDF already exists
  if (invoice.deposit_slip_pdf_path) {
    console.log('Deposit slip PDF already exists, skipping generation:', invoice.deposit_slip_pdf_path);
    return;
  }

  try {
    // Load required data
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1)
      .maybeSingle();

    // Charger les collection_info depuis la dernière mise à jour de stock de chaque collection
    // (même logique que dans le dialog "Générer un bon de dépôt")
    const { data: allStockUpdates } = await supabase
      .from('stock_updates')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    // Créer un map pour stocker la dernière collection_info de chaque collection
    const collectionInfos: Record<string, string> = {};
    const processedCollections = new Set<string>();

    // Parcourir les stock_updates triés par date décroissante
    // Pour chaque collection, prendre la première occurrence (la plus récente)
    // IMPORTANT: Ne prendre que les stock_updates pour les collections (pas les sous-produits)
    (allStockUpdates || []).forEach((update: StockUpdate) => {
      if (update.collection_id && !update.sub_product_id && !processedCollections.has(update.collection_id)) {
        collectionInfos[update.collection_id] = update.collection_info || '';
        processedCollections.add(update.collection_id);
      }
    });

    // Initialiser les infos vides pour les collections qui n'ont pas de stock_update
    clientCollections.forEach(cc => {
      if (cc.collection_id && !collectionInfos[cc.collection_id]) {
        collectionInfos[cc.collection_id] = '';
      }
    });

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
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`, 15, yPosition);
    yPosition += 10;

    // Titre "Bon de dépôt"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Bon de dépôt', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Tableau des collections
    const sortedCollections = [...clientCollections].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    const stockUpdatesMap = new Map<string, StockUpdate>();
    stockUpdates.forEach((update) => {
      if (update.collection_id) {
        stockUpdatesMap.set(update.collection_id, update);
      }
    });
    
    const tableData = sortedCollections.map((cc) => {
      const collectionName = cc.collection?.name || 'Collection';
      const info = collectionInfos[cc.collection_id || ''] || '';
      const barcode = cc.collection?.barcode || ''; // Code barre produit
      const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
      const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
      
      const stockUpdate = stockUpdatesMap.get(cc.collection_id || '');
      const stock = stockUpdate ? stockUpdate.new_stock.toString() : cc.current_stock.toString();
      
      return [
        collectionName,
        info,
        barcode, // Code barre produit
        `${effectivePrice.toFixed(2)} €`,
        effectiveRecommendedSalePrice !== null ? `${effectiveRecommendedSalePrice.toFixed(2)} €` : '-',
        stock
      ];
    });

    const marginLeft = 15;
    const marginRight = 15;
    const tableWidth = pageWidth - marginLeft - marginRight;
    
    const columnWidths = [
      tableWidth * 0.20, // Collection
      tableWidth * 0.25, // Infos
      tableWidth * 0.25, // Code barre produit
      tableWidth * 0.10, // Prix cession HT
      tableWidth * 0.10, // Prix conseillé TTC
      tableWidth * 0.10  // Qté remise
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [[
        'Collection', 
        'Infos',
        { content: 'Code-barres', styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
        { content: 'Prix cession HT', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
        { content: 'Prix conseillé TTC', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }, 
        { content: 'Qté remise', styles: { halign: 'center', valign: 'middle', fontSize: 7 } }
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
        0: { halign: 'left', cellWidth: columnWidths[0] }, // Collection
        1: { halign: 'left', fontSize: 7, cellWidth: columnWidths[1] }, // Infos
        2: { halign: 'center', fontSize: 8, cellWidth: columnWidths[2] }, // Code barre produit
        3: { halign: 'center', fontSize: 8, cellWidth: columnWidths[3] }, // Prix cession HT
        4: { halign: 'center', fontSize: 8, cellWidth: columnWidths[4] }, // Prix conseillé TTC
        5: { halign: 'center', fontSize: 8, cellWidth: columnWidths[5] }  // Qté remise
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

    const pdfBlobData = doc.output('blob');
    const filePath = `invoices/${invoice.id}/deposit_slip_${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`;

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
      } else {
        throw uploadError;
      }
    } else if (uploadData) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ deposit_slip_pdf_path: filePath })
        .eq('id', invoice.id)
        .is('deposit_slip_pdf_path', null);
      
      if (updateError) {
        console.warn('Error updating invoice with PDF path:', updateError);
      } else {
        console.log('Deposit slip PDF saved successfully:', filePath);
      }
    }
  } catch (error) {
    console.error('Error generating deposit slip PDF:', error);
    throw error;
  }
}

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

  try {
    // Load user profile if not provided
    let profile = userProfile;
    if (!profile) {
      const { data: userProfileData } = await supabase
        .from('user_profile')
        .select('*')
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
        doc.text(`SIRET: ${profile.siret}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      if (profile.tva_number) {
        doc.text(`TVA: ${profile.tva_number}`, leftBoxX + 2, yPosition);
        yPosition += 4;
      }
      
      if (profile.tva_number && profile.phone) {
        yPosition += 2;
      }
      
      if (profile.phone) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tél: ${profile.phone}`, leftBoxX + 2, yPosition);
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
    doc.text(`Date: ${new Date(creditNote.created_at).toLocaleDateString('fr-FR')}`, globalLeftMargin, yPosition);
    yPosition += 10;

    // Titre "Avoir N° [numero_avoir]"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Avoir N° ${creditNoteNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Sous-titre "Avoir sur facture n° [numero_facture] du [date]"
    const invoiceDate = new Date(invoice.created_at).toLocaleDateString('fr-FR');
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
      const { error: updateError } = await supabase
        .from('credit_notes')
        .update({ credit_note_pdf_path: filePath })
        .eq('id', creditNote.id)
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

