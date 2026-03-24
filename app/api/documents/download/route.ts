import { NextRequest, NextResponse } from 'next/server';
import {
  getBearerToken,
  createSupabaseClientWithToken,
  createSupabaseServiceClient,
} from '@/lib/api-helpers';
import JSZip from 'jszip';

interface DocInfo {
  id: string;
  name: string;
  storagePath: string;
}

function parseDocumentId(id: string): {
  type: 'invoice' | 'credit_note';
  recordId: string;
  subType?: 'invoice' | 'stock' | 'deposit';
} | null {
  const invoiceMatch = id.match(/^invoice-([a-f0-9-]+)-(invoice|stock|deposit)$/i);
  if (invoiceMatch) {
    return {
      type: 'invoice',
      recordId: invoiceMatch[1],
      subType: invoiceMatch[2] as 'invoice' | 'stock' | 'deposit',
    };
  }
  const cnMatch = id.match(/^credit_note-([a-f0-9-]+)$/i);
  if (cnMatch) {
    return { type: 'credit_note', recordId: cnMatch[1] };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const userSupabase = createSupabaseClientWithToken(token);
    const serviceSupabase = createSupabaseServiceClient();

    if (!userSupabase || !serviceSupabase) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    const { data: { user } } = await userSupabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const documentIds: string[] = body?.documentIds || [];

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun document sélectionné' },
        { status: 400 }
      );
    }

    const docsToDownload: DocInfo[] = [];

    for (const docId of documentIds) {
      const parsed = parseDocumentId(docId);
      if (!parsed) continue;

      if (parsed.type === 'invoice') {
        const pathCol =
          parsed.subType === 'invoice'
            ? 'invoice_pdf_path'
            : parsed.subType === 'stock'
            ? 'stock_report_pdf_path'
            : 'deposit_slip_pdf_path';

        const { data: inv, error } = await userSupabase
          .from('invoices')
          .select('id, invoice_number, invoice_date, created_at, invoice_pdf_path, stock_report_pdf_path, deposit_slip_pdf_path')
          .eq('id', parsed.recordId)
          .single();

        if (error || !inv) continue;

        const storagePath = (inv as Record<string, unknown>)[pathCol] as string | null;
        if (!storagePath) continue;

        const invNum = inv.invoice_number || inv.id?.slice(0, 8);
        const dateStr = inv.invoice_date || inv.created_at?.slice(0, 10);
        const suffix =
          parsed.subType === 'invoice'
            ? 'Facture'
            : parsed.subType === 'stock'
            ? 'Releve_stock'
            : 'Bon_depot';

        docsToDownload.push({
          id: docId,
          name: `${suffix}_${invNum}_${dateStr}.pdf`,
          storagePath,
        });
      } else {
        const { data: cn, error } = await userSupabase
          .from('credit_notes')
          .select('id, credit_note_number, credit_note_date, created_at, credit_note_pdf_path')
          .eq('id', parsed.recordId)
          .single();

        if (error || !cn || !cn.credit_note_pdf_path) continue;

        const cnNum = cn.credit_note_number || cn.id?.slice(0, 8);
        const dateStr = cn.credit_note_date || cn.created_at?.slice(0, 10);

        docsToDownload.push({
          id: docId,
          name: `Avoir_${cnNum}_${dateStr}.pdf`,
          storagePath: cn.credit_note_pdf_path,
        });
      }
    }

    if (docsToDownload.length === 0) {
      return NextResponse.json(
        { error: 'Aucun document valide à télécharger' },
        { status: 400 }
      );
    }

    if (docsToDownload.length === 1) {
      const doc = docsToDownload[0];
      const { data, error } = await serviceSupabase.storage
        .from('documents')
        .download(doc.storagePath);

      if (error || !data) {
        return NextResponse.json(
          { error: 'Erreur lors du téléchargement du fichier' },
          { status: 500 }
        );
      }

      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`,
        },
      });
    }

    const zip = new JSZip();

    for (const doc of docsToDownload) {
      const { data, error } = await serviceSupabase.storage
        .from('documents')
        .download(doc.storagePath);

      if (!error && data) {
        zip.file(doc.name, data);
      }
    }

    const zipBlob = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="documents_${timestamp}.zip"`,
      },
    });
  } catch (err) {
    console.error('[API documents/download]', err);
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement' },
      { status: 500 }
    );
  }
}
