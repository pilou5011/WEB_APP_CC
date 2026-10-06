'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart3,
  Calendar,
  Check,
  ChevronsUpDown,
  CreditCard,
  Filter,
  AlertTriangle,
  Loader2,
  Mail,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { saveListFilters, useRestoreListFilters } from '@/lib/list-filter-storage';
import {
  tryResolveInvoiceDueDate,
  isInvoicePaid,
  getInvoicePaymentStatus,
  canSendPaymentReminder,
  summarizeOutstandingPayments,
  type InvoicePaymentStatus,
} from '@/lib/payments/due-date';
import type { PaymentInvoiceRow, PaymentsListFilters } from '@/lib/payments/types';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types/library';
import { StoredPdfPreviewDialog } from '@/components/stored-pdf-preview-dialog';
import { formatPdfDocumentDateFr } from '@/lib/pdf-document-dates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyFigureCard } from '@/components/dashboard/key-figure-card';
import { formatDashboardCurrency } from '@/lib/dashboard';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PAYMENTS_FILTERS_STORAGE_KEY = 'payments-list-filters';
const PAGE_SIZE = 50;
const stickyHeadClass = 'sticky top-16 z-20 bg-white shadow-[inset_0_-1px_0_0_#e2e8f0]';

const DEFAULT_FILTERS: PaymentsListFilters = {
  clientId: null,
  startDate: null,
  endDate: null,
  unpaidOnly: false,
  invoiceNumberQuery: '',
};

const formatFilterDateFr = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-');
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
};

function formatAmount(amount: number): string {
  return `${Number(amount).toFixed(2)} €`;
}

function markPaidDetail(count: number): string {
  if (count <= 1) {
    return 'La facture sélectionnée sera marquée comme payée.';
  }
  return `Les ${count} facture(s) sélectionnée(s) seront marquées comme payées.`;
}

function openInvoiceFileName(row: PaymentInvoiceRow): string {
  const invNum = row.invoiceNumber || row.id.slice(0, 8);
  const dateStr = row.invoiceDate?.slice(0, 10) || '';
  return dateStr ? `Facture_${invNum}_${dateStr}.pdf` : `Facture_${invNum}.pdf`;
}

function formatDocumentDateCell(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatPdfDocumentDateFr(value);
  } catch {
    return '—';
  }
}

/**
 * Deux modales Radix (préparation + confirmation) se disputaient
 * document.body.style.pointerEvents. La confirmation est désormais une
 * étape du même dialogue. Ce filet corrige un verrou résiduel après
 * l'animation de fermeture (200 ms).
 */
function releaseBodyPointerLock() {
  window.setTimeout(() => {
    const dialogStillOpen = document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
    );
    if (dialogStillOpen) return;
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = '';
    }
  }, 400);
}

function PaymentStatusBadge({ status }: { status: InvoicePaymentStatus }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-emerald-700">
        <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
        Payée
      </span>
    );
  }
  if (status === 'overdue') {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-red-900">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden />
        <span className="inline-block h-3 w-3 rounded-full bg-red-800" aria-hidden />
        Retard paiement
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-red-700">
      <span className="inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden />
      Impayée
    </span>
  );
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function PaymentsClientPage() {
  const [rows, setRows] = useState<PaymentInvoiceRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  const [periodFilterOpen, setPeriodFilterOpen] = useState(false);
  const [invoiceNumberFilterOpen, setInvoiceNumberFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [confirmMarkPaidOpen, setConfirmMarkPaidOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<PaymentInvoiceRow | null>(null);
  const [reminderStep, setReminderStep] = useState<'details' | 'confirm'>('details');
  const [invoicePreview, setInvoicePreview] = useState<{
    storagePath: string | null;
    title: string;
    downloadFileName: string;
  } | null>(null);
  const loadRequestRef = useRef(0);
  const sendingReminderRef = useRef(false);

  const [clientId, setClientId] = useState<string | null>(DEFAULT_FILTERS.clientId);
  const [startDate, setStartDate] = useState<string | null>(DEFAULT_FILTERS.startDate);
  const [endDate, setEndDate] = useState<string | null>(DEFAULT_FILTERS.endDate);
  const [unpaidOnly, setUnpaidOnly] = useState(DEFAULT_FILTERS.unpaidOnly);
  const [invoiceNumberQuery, setInvoiceNumberQuery] = useState(
    DEFAULT_FILTERS.invoiceNumberQuery
  );

  const filtersRestored = useRestoreListFilters(
    PAYMENTS_FILTERS_STORAGE_KEY,
    DEFAULT_FILTERS,
    (stored) => {
      setClientId(stored.clientId);
      setStartDate(stored.startDate);
      setEndDate(stored.endDate);
      setUnpaidOnly(Boolean(stored.unpaidOnly));
      setInvoiceNumberQuery(stored.invoiceNumberQuery || '');
    }
  );

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    saveListFilters(PAYMENTS_FILTERS_STORAGE_KEY, {
      clientId,
      startDate,
      endDate,
      unpaidOnly,
      invoiceNumberQuery,
    });
  }, [filtersRestored, clientId, startDate, endDate, unpaidOnly, invoiceNumberQuery]);

  const loadInvoices = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    try {
      setLoading(true);
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');

      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          id,
          client_id,
          invoice_number,
          invoice_date,
          total_amount,
          paid_at,
          status,
          invoice_pdf_path,
          clients!inner(id, name, email),
          invoice_payment_reminders(sent_at, status)
        `
        )
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      if (requestId !== loadRequestRef.current) return;

      const mapped: PaymentInvoiceRow[] = (data || []).map((inv: any) => {
        const reminders = (
          (inv.invoice_payment_reminders || []) as Array<{
            sent_at: string;
            status: string;
          }>
        ).filter((r) => r.status === 'sent');
        const lastReminderAt =
          reminders.length > 0
            ? reminders
                .map((r) => r.sent_at)
                .sort((a, b) => (a < b ? 1 : -1))[0]
            : null;

        return {
          id: inv.id,
          clientId: inv.client_id,
          clientName: inv.clients?.name || 'Client',
          clientEmail: inv.clients?.email ?? null,
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date ?? null,
          dueDate: tryResolveInvoiceDueDate(inv.invoice_date),
          totalAmount: Number(inv.total_amount) || 0,
          paidAt: inv.paid_at ?? null,
          pdfPath: inv.invoice_pdf_path ?? null,
          reminderCount: reminders.length,
          lastReminderAt,
        };
      });

      setRows(mapped);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des factures');
      if (requestId === loadRequestRef.current) setRows([]);
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    void loadInvoices();
    setCurrentPage(0);
  }, [filtersRestored, loadInvoices]);

  const loadClients = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des clients');
    }
  };

  const filteredRows = useMemo(() => {
    const q = invoiceNumberQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (clientId && row.clientId !== clientId) return false;
      const invoiceDay = row.invoiceDate?.slice(0, 10) || '';
      if (startDate && (!invoiceDay || invoiceDay < startDate)) return false;
      if (endDate && (!invoiceDay || invoiceDay > endDate)) return false;
      if (unpaidOnly && isInvoicePaid(row.paidAt)) return false;
      if (q && !(row.invoiceNumber || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, clientId, startDate, endDate, unpaidOnly, invoiceNumberQuery]);

  const paymentTotals = useMemo(() => summarizeOutstandingPayments(rows), [rows]);

  useEffect(() => {
    setCurrentPage(0);
    setSelectedIds(new Set());
  }, [clientId, startDate, endDate, unpaidOnly]);

  useEffect(() => {
    setCurrentPage(0);
  }, [invoiceNumberQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = filteredRows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedUnpaidIds = Array.from(selectedIds).filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row && !isInvoicePaid(row.paidAt);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(new Set(paginatedRows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleMarkPaid = async () => {
    if (selectedUnpaidIds.length === 0) return;
    try {
      setMarkingPaid(true);
      const token = await getAccessToken();
      if (!token) throw new Error('Session expirée');

      const response = await fetch('/api/payments/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceIds: selectedUnpaidIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Erreur lors du pointage');

      const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
      const succeededCount = Array.isArray(data.succeeded) ? data.succeeded.length : 0;

      if (failedCount > 0) {
        toast.error(
          `${succeededCount} facture(s) pointée(s), ${failedCount} échec(s). Les factures non mises à jour restent impayées.`
        );
      } else {
        toast.success(
          succeededCount > 1
            ? `${succeededCount} factures marquées comme payées`
            : 'Facture marquée comme payée'
        );
      }

      setConfirmMarkPaidOpen(false);
      releaseBodyPointerLock();
      await loadInvoices();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors du pointage');
    } finally {
      setMarkingPaid(false);
    }
  };

  const closeReminderDialog = () => {
    setReminderTarget(null);
    setReminderStep('details');
    releaseBodyPointerLock();
  };

  const handleSendReminder = async () => {
    if (!reminderTarget || sendingReminderRef.current) return;
    if (!canSendPaymentReminder(reminderTarget.paidAt, reminderTarget.dueDate)) {
      toast.error(
        "La relance n'est possible que lorsque la date d'échéance est dépassée."
      );
      return;
    }
    const target = reminderTarget;
    sendingReminderRef.current = true;
    try {
      setSendingReminder(true);
      const token = await getAccessToken();
      if (!token) throw new Error('Session expirée');

      const response = await fetch('/api/payments/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: target.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Erreur lors de l'envoi");

      if (data.historySaved === false) {
        toast.warning(
          data.warning ||
            "E-mail accepté, mais l'historique n'a pas pu être enregistré. Ne renvoyez pas immédiatement."
        );
      } else {
        toast.success(`Relance envoyée à ${target.clientEmail}`);
      }

      closeReminderDialog();
      await loadInvoices();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de la relance");
    } finally {
      sendingReminderRef.current = false;
      setSendingReminder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-[#0B1F33]">Paiements</h1>
            <p className="text-slate-600">
              Suivez vos factures, pointez les règlements et relancez les impayés
            </p>
          </div>
        </div>

        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Chiffres clés
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex min-h-[9rem] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <KeyFigureCard
                  title="Nombre de factures impayées"
                  value={paymentTotals.unpaidCount}
                  formatValue={(count) => count.toLocaleString('fr-FR')}
                  showComparison={false}
                  detail={`dont en retard de paiement : ${paymentTotals.overdueCount.toLocaleString('fr-FR')}`}
                  accent="sky"
                />
                <KeyFigureCard
                  title="Montant total impayé"
                  value={paymentTotals.unpaidAmount}
                  formatValue={formatDashboardCurrency}
                  showComparison={false}
                  detail={`dont en retard de paiement : ${formatDashboardCurrency(paymentTotals.overdueAmount)}`}
                  accent="violet"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            <CardDescription>
              Affinez votre recherche par client, période, numéro ou statut de règlement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Popover open={clientFilterOpen} onOpenChange={setClientFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-[250px] justify-between">
                      <span className="truncate">
                        {clientId ? selectedClient?.name || 'Client' : 'Tous les clients'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher un client..." />
                      <CommandList>
                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setClientId(null);
                              setClientFilterOpen(false);
                            }}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', !clientId ? 'opacity-100' : 'opacity-0')}
                            />
                            Tous les clients
                          </CommandItem>
                          {clients.map((c) => (
                            <CommandItem
                              key={c.id}
                              onSelect={() => {
                                setClientId(c.id);
                                setClientFilterOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  clientId === c.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Popover open={periodFilterOpen} onOpenChange={setPeriodFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[320px] justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate && endDate
                        ? `${formatFilterDateFr(startDate)} → ${formatFilterDateFr(endDate)}`
                        : 'Toutes les dates de factures'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Début</Label>
                          <Input
                            type="date"
                            value={startDate || ''}
                            onChange={(e) => setStartDate(e.target.value || null)}
                          />
                        </div>
                        <div>
                          <Label>Fin</Label>
                          <Input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) => setEndDate(e.target.value || null)}
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate(null);
                          setEndDate(null);
                          setPeriodFilterOpen(false);
                        }}
                      >
                        Effacer
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Popover
                  open={invoiceNumberFilterOpen}
                  onOpenChange={setInvoiceNumberFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-[250px] justify-between">
                      <span className="truncate">
                        {invoiceNumberQuery.trim()
                          ? `N° ${invoiceNumberQuery.trim()}`
                          : 'N° de facture'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3" align="start">
                    <div className="space-y-3">
                      <Label htmlFor="invoice-number-search">Rechercher un numéro</Label>
                      <Input
                        id="invoice-number-search"
                        value={invoiceNumberQuery}
                        onChange={(e) => setInvoiceNumberQuery(e.target.value)}
                        placeholder="Ex: FAC-2026-001"
                        autoFocus
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInvoiceNumberQuery('');
                          setInvoiceNumberFilterOpen(false);
                        }}
                      >
                        Effacer
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  id="unpaid-only"
                  checked={unpaidOnly}
                  onCheckedChange={(v) => setUnpaidOnly(v === true)}
                />
                <Label htmlFor="unpaid-only" className="cursor-pointer font-normal">
                  Impayées uniquement
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {filteredRows.length} facture(s) trouvée(s)
          </p>
          <Button
            onClick={() => setConfirmMarkPaidOpen(true)}
            disabled={selectedUnpaidIds.length === 0 || markingPaid}
          >
            {markingPaid ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Marquer comme payées ({selectedUnpaidIds.length})
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <FileText className="mb-4 h-16 w-16 opacity-50" />
                <p className="text-lg font-medium">Aucune facture trouvée</p>
                <p className="text-sm">Ajustez vos filtres pour afficher d&apos;autres résultats.</p>
              </div>
            ) : (
              <Table noWrapper className="min-w-full">
                <TableHeader>
                  <TableRow className="hover:bg-white">
                    <TableHead className={cn(stickyHeadClass, 'w-12')}>
                      <Checkbox
                        checked={
                          paginatedRows.length > 0 &&
                          paginatedRows.every((r) => selectedIds.has(r.id))
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Sélectionner toutes les factures de la page"
                      />
                    </TableHead>
                    <TableHead className={stickyHeadClass}>Client</TableHead>
                    <TableHead className={stickyHeadClass}>N° facture</TableHead>
                    <TableHead className={stickyHeadClass}>Date facture</TableHead>
                    <TableHead className={stickyHeadClass}>Date d&apos;échéance</TableHead>
                    <TableHead className={stickyHeadClass}>Montant</TableHead>
                    <TableHead className={stickyHeadClass}>Relances</TableHead>
                    <TableHead className={stickyHeadClass}>Dernière relance</TableHead>
                    <TableHead className={cn(stickyHeadClass, 'w-44')}>Statut</TableHead>
                    <TableHead className={cn(stickyHeadClass, 'w-20')}>Mail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => {
                    const status = getInvoicePaymentStatus(row.paidAt, row.dueDate);
                    const invoiceFileName = openInvoiceFileName(row);
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(selectedIds.has(row.id) && 'bg-slate-50')}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggleSelect(row.id)}
                            aria-label={`Sélectionner la facture ${row.invoiceNumber || row.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/clients/${row.clientId}`}
                            className="text-[#0B1F33] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F33]/30 rounded-sm"
                            title="Ouvrir la page client"
                          >
                            {row.clientName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() =>
                              setInvoicePreview({
                                storagePath: row.pdfPath,
                                title: `${DOCUMENT_TYPE_LABELS.invoice} — ${invoiceFileName}`,
                                downloadFileName: invoiceFileName,
                              })
                            }
                            className="text-left text-[#0B1F33] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F33]/30 rounded-sm cursor-pointer bg-transparent border-0 p-0 font-medium"
                            title="Ouvrir la prévisualisation (comme sur la fiche client)"
                          >
                            {row.invoiceNumber || '—'}
                          </button>
                        </TableCell>
                        <TableCell>{formatDocumentDateCell(row.invoiceDate)}</TableCell>
                        <TableCell>{formatDocumentDateCell(row.dueDate)}</TableCell>
                        <TableCell>{formatAmount(row.totalAmount)}</TableCell>
                        <TableCell>
                          {row.reminderCount > 0 ? row.reminderCount : '-'}
                        </TableCell>
                        <TableCell>
                          {row.lastReminderAt
                            ? format(new Date(row.lastReminderAt), 'dd/MM/yyyy', {
                                locale: fr,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={status} />
                        </TableCell>
                        <TableCell>
                          {status === 'overdue' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Envoyer une relance"
                              aria-label={`Relancer la facture ${row.invoiceNumber || ''}`}
                              onClick={() => {
                                setReminderStep('details');
                                setReminderTarget(row);
                              }}
                            >
                              <Mail className="h-4 w-4 text-slate-700" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {filteredRows.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            >
              Précédent
            </Button>
            <span className="text-sm text-slate-600">
              Page {currentPage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmMarkPaidOpen} onOpenChange={setConfirmMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer comme payées ?</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : cette action est irréversible.{' '}
              {markPaidDetail(selectedUnpaidIds.length)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markingPaid}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={markingPaid}
              onClick={(e) => {
                e.preventDefault();
                void handleMarkPaid();
              }}
            >
              {markingPaid ? 'Enregistrement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!reminderTarget}
        onOpenChange={(open) => {
          if (!open && !sendingReminder) closeReminderDialog();
        }}
      >
        <DialogContent
          onPointerDownOutside={(event) => {
            if (sendingReminder) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (sendingReminder) event.preventDefault();
          }}
        >
          {reminderStep === 'details' ? (
            <>
              <DialogHeader>
                <DialogTitle>Préparer une relance</DialogTitle>
                <DialogDescription>
                  Vérifiez les informations avant d&apos;envoyer le rappel de paiement.
                </DialogDescription>
              </DialogHeader>
              {reminderTarget && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-slate-500">Client :</span>{' '}
                    <strong>{reminderTarget.clientName}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Facture :</span>{' '}
                    <strong>{reminderTarget.invoiceNumber || '—'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Montant :</span>{' '}
                    <strong>{formatAmount(reminderTarget.totalAmount)}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Échéance :</span>{' '}
                    <strong>{formatDocumentDateCell(reminderTarget.dueDate)}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Destinataire :</span>{' '}
                    <strong>{reminderTarget.clientEmail || 'Adresse manquante'}</strong>
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReminderDialog}
                  disabled={sendingReminder}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={
                    sendingReminder ||
                    !reminderTarget?.clientEmail ||
                    !canSendPaymentReminder(reminderTarget?.paidAt, reminderTarget?.dueDate)
                  }
                  onClick={() => setReminderStep('confirm')}
                >
                  Relancer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirmer l&apos;envoi de la relance</DialogTitle>
                <DialogDescription>
                  Un e-mail de rappel de paiement va être envoyé pour la facture{' '}
                  <strong>{reminderTarget?.invoiceNumber || '—'}</strong> à{' '}
                  <strong>{reminderTarget?.clientEmail || '—'}</strong>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReminderStep('details')}
                  disabled={sendingReminder}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={sendingReminder}
                  onClick={() => {
                    void handleSendReminder();
                  }}
                >
                  {sendingReminder ? 'Envoi...' : "Confirmer l'envoi"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <StoredPdfPreviewDialog
        open={invoicePreview !== null}
        onOpenChange={(open) => {
          if (!open) setInvoicePreview(null);
        }}
        title={invoicePreview?.title ?? ''}
        storagePath={invoicePreview?.storagePath ?? null}
        downloadFileName={invoicePreview?.downloadFileName ?? 'document.pdf'}
      />
    </div>
  );
}
