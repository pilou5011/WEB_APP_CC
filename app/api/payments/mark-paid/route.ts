import { NextRequest, NextResponse } from 'next/server';
import { requirePaymentsApiAccess } from '@/lib/payments/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePaymentsApiAccess(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, companyId } = auth;
    const body = (await request.json()) as { invoiceIds?: string[] };
    const invoiceIds = Array.isArray(body.invoiceIds)
      ? Array.from(
          new Set(body.invoiceIds.filter((id) => typeof id === 'string' && id.trim()))
        )
      : [];

    if (invoiceIds.length === 0) {
      return NextResponse.json({ error: 'Aucune facture sélectionnée' }, { status: 400 });
    }

    const paidAt = new Date().toISOString();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const invoiceId of invoiceIds) {
      const { data, error } = await supabase
        .from('invoices')
        .update({ paid_at: paidAt })
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .is('paid_at', null)
        .select('id')
        .maybeSingle();

      if (error) {
        failed.push({ id: invoiceId, error: error.message });
        continue;
      }

      if (!data?.id) {
        // Déjà payée ou introuvable / autre entreprise
        const { data: existing } = await supabase
          .from('invoices')
          .select('id, paid_at, status')
          .eq('id', invoiceId)
          .eq('company_id', companyId)
          .maybeSingle();

        if (!existing) {
          failed.push({ id: invoiceId, error: 'Facture introuvable' });
        } else if (existing.status !== 'completed') {
          failed.push({ id: invoiceId, error: 'Facture non active' });
        } else if (existing.paid_at) {
          succeeded.push(invoiceId); // déjà payée = succès idempotent
        } else {
          failed.push({ id: invoiceId, error: 'Mise à jour impossible' });
        }
        continue;
      }

      succeeded.push(data.id);
    }

    return NextResponse.json({
      success: failed.length === 0,
      succeeded,
      failed,
      paidAt,
    });
  } catch (error) {
    console.error('[payments/mark-paid]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
