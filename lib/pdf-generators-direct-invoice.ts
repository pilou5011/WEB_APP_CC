/**
 * PDF Generator for Direct Invoices
 * 
 * This file contains a function to generate and save PDFs for direct invoices
 * (invoices generated from the "Facturer" tab without stock updates).
 * The table format is simplified: Product, Infos, Code-barres, Quantité, PU HT, Total HT
 */

import { Client, Invoice, Product, StockDirectSold, UserProfile, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';

interface GenerateDirectInvoicePDFParams {
  invoice: Invoice;
  client: Client;
  products: Product[];
  stockDirectSold: StockDirectSold[];
  userProfile: UserProfile | null;
}

/**
 * Generate and save direct invoice PDF
 * This function generates the invoice PDF for direct sales and saves it to Supabase storage.
 */
export async function generateAndSaveDirectInvoicePDF(params: GenerateDirectInvoicePDFParams): Promise<void> {
  const { invoice, client, products, stockDirectSold, userProfile } = params;

  // Note: On génère toujours le PDF et on met toujours à jour invoice_pdf_path
  // même si le fichier existe déjà, pour s'assurer que la colonne est toujours renseignée

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

    // 3) Tableau des produits (format simplifié pour facture directe)
    const discountPercentage = invoice.discount_percentage || 0;
    const discountRatio = discountPercentage > 0 && discountPercentage <= 100 
      ? (1 - discountPercentage / 100)
      : 1;
    
    // Créer les lignes du tableau
    const invoiceRows = stockDirectSold.map((item) => {
      const Product = products.find(c => c.id === item.product_id);
      const totalHTBeforeDiscount = item.total_amount_ht;
      // Appliquer la remise proportionnellement à chaque ligne
      const totalHTAfterDiscount = totalHTBeforeDiscount * discountRatio;
      
      return [
        Product?.name || 'Product',
        '', // Infos (vide pour facture directe)
        Product?.barcode || '', // Code barre
        item.stock_sold.toString(), // Quantité
        item.unit_price_ht.toFixed(2) + ' €', // PU HT
        totalHTBeforeDiscount.toFixed(2) + ' €' // Total HT (avant remise)
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Produit', 'Infos', 'Code-barres', 'Quantité', 'PU HT', 'Total HT']],
      body: invoiceRows,
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
        1: { halign: 'left', fontSize: 8 },
        2: { halign: 'center', fontSize: 8 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: globalLeftMargin, right: globalRightMargin }
    });

    // Calculer les totaux
    const totalHTBeforeDiscount = stockDirectSold.reduce((sum, item) => sum + item.total_amount_ht, 0);
    const discountAmount = discountPercentage > 0 && discountPercentage <= 100
      ? (totalHTBeforeDiscount * discountPercentage / 100)
      : 0;
    const totalHT = totalHTBeforeDiscount - discountAmount;
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    // Tableau récapitulatif des totaux
    const finalTableY = (doc as any).lastAutoTable.finalY + 8;
    const summaryRows: string[][] = [];
    
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

    // Convertir le PDF en blob
    const pdfBlob = doc.output('blob');
    
    // Générer le chemin de fichier : documents/invoices/[id de la facture]/[annee]_[mois]_[jour].pdf
    const filePath = `invoices/${invoice.id}/invoice_${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`;
    
    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    // Récupérer companyId avant de gérer les erreurs
    const companyId = await getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('Non autorisé');
    }

    if (uploadError) {
      // Si le fichier existe déjà, on continue quand même pour mettre à jour invoice_pdf_path
      if (uploadError.message?.includes('already exists') || 
          uploadError.message?.includes('duplicate') ||
          uploadError.message?.includes('409')) {
        console.log('PDF already exists, but updating invoice_pdf_path:', filePath);
      } else {
        console.error('Error uploading direct invoice PDF:', uploadError);
        throw uploadError;
      }
    } else {
      console.log('Direct invoice PDF uploaded successfully:', filePath);
    }

    // Mettre à jour invoice_pdf_path UNIQUEMENT si elle est NULL (immuabilité contractuelle)
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
      console.log('Direct invoice PDF path updated successfully:', filePath);
    }
  } catch (error) {
    console.error('Error generating direct invoice PDF:', error);
    throw error;
  }
}

