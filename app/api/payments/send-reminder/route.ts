import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseServiceClient } from '@/lib/api-helpers';
import { requirePaymentsApiAccess } from '@/lib/payments/api-auth';
import {
  buildPaymentReminderEmailHtml,
  buildPaymentReminderSubject,
} from '@/lib/payments/email-html';
import {
  canSendPaymentReminder,
  resolveEffectiveDueDate,
} from '@/lib/payments/due-date';
import { buildInvoiceEmailFileName } from '@/lib/payments/invoice-attachment';
import { formatInvoiceAmountFr, invoiceTotalTtcFromStoredHt } from '@/lib/payments/invoice-amount';
import { formatPdfDocumentDateFr } from '@/lib/pdf-document-dates';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let emailAccepted = false;
  let recipientEmail = '';
  let invoiceIdForHistory = '';
  let companyIdForHistory = '';
  let userIdForHistory = '';

  try {
    const auth = await requirePaymentsApiAccess(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, companyId, userId } = auth;
    companyIdForHistory = companyId;
    userIdForHistory = userId;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration manquante : RESEND_API_KEY non définie' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { invoiceId?: string };
    const invoiceId = body.invoiceId?.trim();
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 });
    }
    invoiceIdForHistory = invoiceId;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        invoice_date,
        due_date,
        created_at,
        total_amount,
        paid_at,
        status,
        invoice_pdf_path,
        client_id,
        clients!inner(id, name, email)
      `
      )
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice || invoice.status !== 'completed') {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }
    if (invoice.paid_at) {
      return NextResponse.json(
        { error: 'Cette facture est déjà marquée comme payée' },
        { status: 409 }
      );
    }

    const dueDate = resolveEffectiveDueDate(invoice.due_date, invoice.invoice_date);
    if (!dueDate) {
      return NextResponse.json(
        {
          error:
            "La date d'échéance de cette facture est indisponible. La relance n'a pas été envoyée.",
        },
        { status: 400 }
      );
    }
    if (!canSendPaymentReminder(invoice.paid_at, dueDate)) {
      return NextResponse.json(
        {
          error:
            "La relance n'est possible que lorsque la date d'échéance est dépassée. Cette facture n'est pas en retard de paiement.",
        },
        { status: 409 }
      );
    }

    const client = invoice.clients as unknown as {
      id: string;
      name: string;
      email: string | null;
    };
    const email = client?.email?.trim() || '';
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Aucune adresse e-mail valide n'est renseignée pour ce client. Mettez à jour la fiche client avant de relancer.",
        },
        { status: 400 }
      );
    }
    recipientEmail = email;

    const pdfPath = invoice.invoice_pdf_path?.trim() || '';
    if (!pdfPath.startsWith('invoices/') || pdfPath.includes('..')) {
      return NextResponse.json(
        {
          error:
            "Le PDF de cette facture est introuvable. La relance n'a pas été envoyée.",
        },
        { status: 404 }
      );
    }

    const serviceSupabase = createSupabaseServiceClient();
    if (!serviceSupabase) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    const { data: pdfFile, error: pdfError } = await serviceSupabase.storage
      .from('documents')
      .download(pdfPath);

    if (pdfError || !pdfFile) {
      console.error('[payments/send-reminder] pdf:', pdfError);
      return NextResponse.json(
        {
          error:
            "Le PDF de cette facture n'a pas pu être récupéré. La relance n'a pas été envoyée.",
        },
        { status: 502 }
      );
    }

    const pdfBytes = Buffer.from(await pdfFile.arrayBuffer());
    if (pdfBytes.length < 5 || pdfBytes.subarray(0, 4).toString('utf8') !== '%PDF') {
      return NextResponse.json(
        {
          error:
            "Le PDF de cette facture est invalide. La relance n'a pas été envoyée.",
        },
        { status: 502 }
      );
    }

    const { data: profile } = await supabase
      .from('user_profile')
      .select('email, first_name, last_name, company_name, company_name_short, phone')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    const invoiceNumber = invoice.invoice_number || '—';
    const amountLabel = formatInvoiceAmountFr(
      invoiceTotalTtcFromStoredHt(Number(invoice.total_amount) || 0)
    );
    const dueDateLabel = formatPdfDocumentDateFr(dueDate);
    const senderName =
      `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || undefined;
    const senderCompanyName =
      profile?.company_name_short || profile?.company_name || undefined;
    const attachmentName = buildInvoiceEmailFileName(
      client.name || 'client',
      invoice.created_at || invoice.invoice_date
    );

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `${senderCompanyName || 'Dépôt-vente'} <contact@gastonstock.com>`,
      to: [email],
      replyTo: profile?.email || undefined,
      subject: buildPaymentReminderSubject(invoiceNumber),
      html: buildPaymentReminderEmailHtml({
        invoiceNumber,
        amountLabel,
        dueDateLabel,
        senderEmail: profile?.email,
        senderName,
        senderCompanyName,
        senderPhone: profile?.phone,
      }),
      attachments: [
        {
          filename: attachmentName,
          content: pdfBytes.toString('base64'),
        },
      ],
    });

    if (sendError) {
      console.error('[payments/send-reminder] Resend:', sendError);
      return NextResponse.json(
        { error: sendError.message || "Erreur lors de l'envoi de l'e-mail" },
        { status: 500 }
      );
    }

    emailAccepted = true;

    const sentAt = new Date().toISOString();
    const { data: reminderRow, error: historyError } = await supabase
      .from('invoice_payment_reminders')
      .insert({
        company_id: companyId,
        invoice_id: invoiceId,
        sent_at: sentAt,
        recipient_email: email,
        status: 'sent',
        created_by: userId,
      })
      .select('id, sent_at')
      .single();

    if (historyError || !reminderRow) {
      console.error('[payments/send-reminder] history:', historyError);
      return NextResponse.json(
        {
          success: true,
          emailSent: true,
          historySaved: false,
          warning:
            "L'e-mail a été accepté par le service d'envoi, mais l'historique n'a pas pu être enregistré. Ne renvoyez pas immédiatement sans vérifier.",
          resendId: sendData?.id ?? null,
          dueDate,
          invoiceDateLabel: formatPdfDocumentDateFr(invoice.invoice_date),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      historySaved: true,
      reminder: {
        id: reminderRow.id,
        sentAt: reminderRow.sent_at,
        recipientEmail: email,
      },
    });
  } catch (error) {
    console.error('[payments/send-reminder]', error);
    if (emailAccepted) {
      return NextResponse.json(
        {
          success: true,
          emailSent: true,
          historySaved: false,
          warning:
            "L'e-mail a été accepté, mais une erreur est survenue ensuite. Ne renvoyez pas immédiatement sans vérifier.",
          invoiceId: invoiceIdForHistory,
          companyId: companyIdForHistory,
          userId: userIdForHistory,
          recipientEmail,
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
