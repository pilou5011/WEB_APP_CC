'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LibraryDocument,
  LibraryDocumentType,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/types/library';
import {
  Library,
  Download,
  Filter,
  Check,
  ChevronsUpDown,
  X,
  FileText,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StoredPdfPreviewDialog } from '@/components/stored-pdf-preview-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import JSZip from 'jszip';

const DOCUMENT_TYPES: LibraryDocumentType[] = [
  'invoice',
  'stock_report',
  'deposit_slip',
  'credit_note',
];

const PAGE_SIZE = 50;

export default function LibraryPage() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  const [periodFilterOpen, setPeriodFilterOpen] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<{
    storagePath: string;
    title: string;
    downloadFileName: string;
  } | null>(null);

  // Filtres
  const [clientId, setClientId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<LibraryDocumentType[]>(
    DOCUMENT_TYPES
  );

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadDocuments();
    setCurrentPage(0);
  }, [clientId, startDate, endDate, documentTypes]);

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

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');

      const allDocs: LibraryDocument[] = [];

      // Factures (invoice, stock_report, deposit_slip)
      let invoiceQuery = supabase
        .from('invoices')
        .select(
          `
          id,
          client_id,
          invoice_number,
          invoice_date,
          created_at,
          invoice_pdf_path,
          stock_report_pdf_path,
          deposit_slip_pdf_path,
          status,
          clients!inner(name)
        `
        )
        .eq('company_id', companyId)
        .eq('status', 'completed');

      if (clientId) {
        invoiceQuery = invoiceQuery.eq('client_id', clientId);
      }
      if (startDate) {
        invoiceQuery = invoiceQuery.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        invoiceQuery = invoiceQuery.lte(
          'created_at',
          `${endDate}T23:59:59.999`
        );
      }

      const { data: invoices, error: invError } = await invoiceQuery.order(
        'created_at',
        { ascending: false }
      );

      if (invError) throw invError;

      const clientNames: Record<string, string> = {};
      (invoices || []).forEach((inv: any) => {
        const c = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
        clientNames[inv.client_id] = c?.name || 'Client inconnu';
      });

      (invoices || []).forEach((inv: any) => {
        const clientName = clientNames[inv.client_id];
        const invNum = inv.invoice_number || inv.id.slice(0, 8);
        const dateStr = inv.invoice_date || inv.created_at?.slice(0, 10);

        if (
          documentTypes.includes('invoice') &&
          inv.invoice_pdf_path
        ) {
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

      // Avoirs
      if (documentTypes.includes('credit_note')) {
        let cnQuery = supabase
          .from('credit_notes')
          .select(
            `
            id,
            client_id,
            credit_note_number,
            credit_note_date,
            created_at,
            credit_note_pdf_path,
            status,
            clients!inner(name)
          `
          )
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .not('credit_note_pdf_path', 'is', null);

        if (clientId) {
          cnQuery = cnQuery.eq('client_id', clientId);
        }
        if (startDate) {
          cnQuery = cnQuery.gte('created_at', `${startDate}T00:00:00`);
        }
        if (endDate) {
          cnQuery = cnQuery.lte(
            'created_at',
            `${endDate}T23:59:59.999`
          );
        }

        const { data: creditNotes, error: cnError } = await cnQuery.order(
          'created_at',
          { ascending: false }
        );

        if (cnError) throw cnError;

        const cnClientNames: Record<string, string> = {};
        (creditNotes || []).forEach((cn: any) => {
          const c = Array.isArray(cn.clients) ? cn.clients[0] : cn.clients;
          cnClientNames[cn.client_id] = c?.name || 'Client inconnu';
        });

        (creditNotes || []).forEach((cn: any) => {
          const clientName = cnClientNames[cn.client_id];
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

      // Tri par date (plus récent en premier)
      allDocs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setDocuments(allDocs);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDocumentPreview = (doc: LibraryDocument) => {
    setPdfPreview({
      storagePath: doc.storagePath,
      title: `${DOCUMENT_TYPE_LABELS[doc.type]} — ${doc.name}`,
      downloadFileName: doc.name,
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedDocuments.map((d) => d.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const filteredDocuments = documents;
  const totalPages = Math.ceil(filteredDocuments.length / PAGE_SIZE) || 1;
  const paginatedDocuments = filteredDocuments.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  const saveWithPicker = async (blob: Blob, suggestedName: string): Promise<'saved' | 'cancelled' | 'unsupported'> => {
    if (!('showSaveFilePicker' in window)) return 'unsupported';
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: suggestedName.endsWith('.zip') ? 'Archive ZIP' : 'Document PDF',
            accept: suggestedName.endsWith('.zip')
              ? { 'application/zip': ['.zip'] }
              : { 'application/pdf': ['.pdf'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'cancelled';
      throw e;
    }
  };

  const fallbackDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    const toDownload = documents.filter((d) => selectedIds.has(d.id));
    if (toDownload.length === 0) {
      toast.error('Sélectionnez au moins un document');
      return;
    }

    setDownloading(true);
    try {
      if (toDownload.length === 1) {
        const doc = toDownload[0];
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storagePath, 3600);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('URL non disponible');

        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error('Erreur lors du téléchargement');
        const blob = await res.blob();

        const result = await saveWithPicker(blob, doc.name);
        if (result === 'unsupported') {
          fallbackDownload(blob, doc.name);
        } else if (result === 'cancelled') {
          return;
        }
        toast.success('Document téléchargé');
      } else {
        const zip = new JSZip();
        for (const doc of toDownload) {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.storagePath, 3600);

          if (error) throw error;
          if (!data?.signedUrl) continue;

          const res = await fetch(data.signedUrl);
          if (!res.ok) continue;
          const blob = await res.blob();
          zip.file(doc.name, blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const zipName = `documents_${format(new Date(), 'yyyy-MM-dd_HHmm')}.zip`;

        const result = await saveWithPicker(content, zipName);
        if (result === 'unsupported') {
          fallbackDownload(content, zipName);
        } else if (result === 'cancelled') {
          return;
        }
        toast.success(`${toDownload.length} documents téléchargés en archive ZIP`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#0B1F33] mb-2">
              Bibliothèque
            </h1>
            <p className="text-slate-600">
              Consultez et exportez vos documents générés
            </p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            <CardDescription>
              Affinez votre recherche par client, période et type de document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Client */}
              <div>
                <Popover
                  open={clientFilterOpen}
                  onOpenChange={setClientFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[250px] justify-between"
                    >
                      <span className="truncate">
                        {clientId
                          ? selectedClient?.name || 'Client'
                          : 'Tous les clients'}
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
                              className={cn(
                                'mr-2 h-4 w-4',
                                !clientId ? 'opacity-100' : 'opacity-0'
                              )}
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

              {/* Période */}
              <div>
                <Popover
                  open={periodFilterOpen}
                  onOpenChange={setPeriodFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[280px] justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate && endDate
                        ? `${startDate} → ${endDate}`
                        : 'Toutes les dates'}
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
                            onChange={(e) =>
                              setStartDate(e.target.value || null)
                            }
                          />
                        </div>
                        <div>
                          <Label>Fin</Label>
                          <Input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) =>
                              setEndDate(e.target.value || null)
                            }
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

              {/* Type de document */}
              <div>
                <Popover
                  open={typeFilterOpen}
                  onOpenChange={setTypeFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[220px] justify-between">
                      <span>
                        {documentTypes.length === DOCUMENT_TYPES.length
                          ? 'Tous les types'
                          : `${documentTypes.length} type(s)`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <div className="p-2 space-y-2">
                      {DOCUMENT_TYPES.map((t) => (
                        <div
                          key={t}
                          className="flex items-center space-x-2 cursor-pointer"
                          onClick={() => {
                            setDocumentTypes((prev) =>
                              prev.includes(t)
                                ? prev.filter((x) => x !== t)
                                : [...prev, t]
                            );
                          }}
                        >
                          <Checkbox
                            checked={documentTypes.includes(t)}
                            onCheckedChange={() => {}}
                          />
                          <Label className="cursor-pointer">
                            {DOCUMENT_TYPE_LABELS[t]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouton Télécharger */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-600">
            {filteredDocuments.length} document(s) trouvé(s)
          </p>
          <Button
            onClick={handleDownload}
            disabled={selectedIds.size === 0 || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Télécharger ({selectedIds.size})
          </Button>
        </div>

        {/* Tableau des documents */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun document trouvé</p>
                <p className="text-sm">
                  Ajustez vos filtres ou générez des documents depuis les fiches
                  clients.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          paginatedDocuments.length > 0 &&
                          paginatedDocuments.every((d) =>
                            selectedIds.has(d.id)
                          )
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nom du document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date de création</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className={cn(
                        selectedIds.has(doc.id) && 'bg-slate-50'
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={() => toggleSelect(doc.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => openDocumentPreview(doc)}
                          className="text-left text-[#0B1F33] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F33]/30 rounded-sm cursor-pointer bg-transparent border-0 p-0 font-medium"
                          title="Ouvrir la prévisualisation (comme sur la fiche client)"
                        >
                          {doc.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {DOCUMENT_TYPE_LABELS[doc.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.clientName}</TableCell>
                      <TableCell>
                        {format(
                          new Date(doc.createdAt),
                          'dd MMM yyyy',
                          { locale: fr }
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && filteredDocuments.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-slate-600">
                  Page {currentPage + 1} sur {totalPages} (
                  {filteredDocuments.length} documents)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages - 1, p + 1)
                      )
                    }
                    disabled={currentPage >= totalPages - 1}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StoredPdfPreviewDialog
        open={pdfPreview !== null}
        onOpenChange={(open) => {
          if (!open) setPdfPreview(null);
        }}
        title={pdfPreview?.title ?? ''}
        storagePath={pdfPreview?.storagePath ?? null}
        downloadFileName={pdfPreview?.downloadFileName ?? 'document.pdf'}
      />
    </div>
  );
}
