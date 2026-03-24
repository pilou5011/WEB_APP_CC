import { NextRequest, NextResponse } from 'next/server';
import {
  getBearerToken,
  createSupabaseClientWithToken,
} from '@/lib/api-helpers';
import type { LibraryDocumentType } from '@/lib/types/library';

export type DocumentTypeParam =
  | 'invoice'
  | 'stock_report'
  | 'deposit_slip'
  | 'credit_note';

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = createSupabaseClientWithToken(token);
    if (!supabase) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const documentTypesParam = searchParams.get('documentTypes');
    const documentTypes: DocumentTypeParam[] = documentTypesParam
      ? (documentTypesParam.split(',') as DocumentTypeParam[])
      : ['invoice', 'stock_report', 'deposit_slip', 'credit_note'];

    const allDocs: Array<{
      id: string;
      type: LibraryDocumentType;
      name: string;
      clientId: string;
      clientName: string;
      createdAt: string;
      storagePath: string;
    }> = [];

    // Factures
    if (
      documentTypes.includes('invoice') ||
      documentTypes.includes('stock_report') ||
      documentTypes.includes('deposit_slip')
    ) {
      let query = supabase
        .from('invoices')
        .select(
          'id, client_id, invoice_number, invoice_date, created_at, invoice_pdf_path, stock_report_pdf_path, deposit_slip_pdf_path, status, clients!inner(name)'
        )
        .eq('status', 'completed');

      if (clientId) query = query.eq('client_id', clientId);
      if (startDate)
        query = query.gte('created_at', `${startDate}T00:00:00`);
      if (endDate)
        query = query.lte('created_at', `${endDate}T23:59:59.999`);

      const { data: invoices, error: invError } = await query.order(
        'created_at',
        { ascending: false }
      );

      if (invError) throw invError;

      (invoices || []).forEach((inv: any) => {
        const c = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
        const clientName = c?.name || 'Client inconnu';
        const invNum = inv.invoice_number || inv.id.slice(0, 8);
        const dateStr = inv.invoice_date || inv.created_at?.slice(0, 10);

        if (documentTypes.includes('invoice') && inv.invoice_pdf_path) {
          allDocs.push({
            id: `invoice-${inv.id}-invoice`,
            type: 'invoice',
            name: `Facture_${invNum}_${dateStr}.pdf`,
            clientId: inv.client_id,
            clientName,
            createdAt: inv.created_at,
            storagePath: inv.invoice_pdf_path,
          });
        }
        if (
          documentTypes.includes('stock_report') &&
          inv.stock_report_pdf_path
        ) {
          allDocs.push({
            id: `invoice-${inv.id}-stock`,
            type: 'stock_report',
            name: `Releve_stock_${invNum}_${dateStr}.pdf`,
            clientId: inv.client_id,
            clientName,
            createdAt: inv.created_at,
            storagePath: inv.stock_report_pdf_path,
          });
        }
        if (
          documentTypes.includes('deposit_slip') &&
          inv.deposit_slip_pdf_path
        ) {
          allDocs.push({
            id: `invoice-${inv.id}-deposit`,
            type: 'deposit_slip',
            name: `Bon_depot_${invNum}_${dateStr}.pdf`,
            clientId: inv.client_id,
            clientName,
            createdAt: inv.created_at,
            storagePath: inv.deposit_slip_pdf_path,
          });
        }
      });
    }

    // Avoirs
    if (documentTypes.includes('credit_note')) {
      let query = supabase
        .from('credit_notes')
        .select(
          'id, client_id, credit_note_number, credit_note_date, created_at, credit_note_pdf_path, status, clients!inner(name)'
        )
        .eq('status', 'completed')
        .not('credit_note_pdf_path', 'is', null);

      if (clientId) query = query.eq('client_id', clientId);
      if (startDate)
        query = query.gte('created_at', `${startDate}T00:00:00`);
      if (endDate)
        query = query.lte('created_at', `${endDate}T23:59:59.999`);

      const { data: creditNotes, error: cnError } = await query.order(
        'created_at',
        { ascending: false }
      );

      if (cnError) throw cnError;

      (creditNotes || []).forEach((cn: any) => {
        const c = Array.isArray(cn.clients) ? cn.clients[0] : cn.clients;
        const clientName = c?.name || 'Client inconnu';
        const cnNum = cn.credit_note_number || cn.id.slice(0, 8);
        const dateStr = cn.credit_note_date || cn.created_at?.slice(0, 10);

        allDocs.push({
          id: `credit_note-${cn.id}`,
          type: 'credit_note',
          name: `Avoir_${cnNum}_${dateStr}.pdf`,
          clientId: cn.client_id,
          clientName,
          createdAt: cn.created_at,
          storagePath: cn.credit_note_pdf_path,
        });
      });
    }

    allDocs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ documents: allDocs });
  } catch (err) {
    console.error('[API documents]', err);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des documents' },
      { status: 500 }
    );
  }
}
