'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  FilePenLine,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Client, DeliveryNote, DeliveryNoteTemplate, Product, SubProduct, addSoftDeleteFilter } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ProductLineRow, ProductLinesEditor } from '@/components/product-lines-editor';
import { DeliveryNoteDialog } from '@/components/delivery-notes/delivery-note-dialog';
import {
  cancelValidatedDeliveryNote,
  createDeliveryNoteFromTemplate,
  createEmptyDeliveryNote,
  createTemplate,
  deleteDraftDeliveryNote,
  deleteTemplate,
  duplicateTemplate,
  fetchActiveSubProductsByProductIds,
  fetchClientDeliveryNotes,
  fetchClientProductSalesByYear,
  fetchClientSubProductSalesByYear,
  fetchDeliveryNoteTemplates,
  fetchImportableProducts,
  fetchTemplateProducts,
  getSalesHistoryYears,
  renameTemplate,
  resolveDeliveryNoteLines,
  saveDeliveryNoteLines,
  setTemplateProducts,
  validateDeliveryNote,
} from '@/lib/delivery-notes';

function serializeDraftRows(rows: ProductLineRow[]): string {
  return JSON.stringify(
    rows.map((row, index) => ({
      product_id: row.product_id,
      quantity:
        row.quantity === '' || row.quantity === undefined ? 0 : parseInt(row.quantity || '0', 10),
      display_order: index,
      subRows: (row.subRows ?? []).map((sub) => ({
        sub_product_id: sub.sub_product_id,
        quantity: sub.quantity === '' ? 0 : parseInt(sub.quantity || '0', 10),
      })),
    }))
  );
}

function resolvedLinesToRows(
  lines: Awaited<ReturnType<typeof resolveDeliveryNoteLines>>
): ProductLineRow[] {
  return lines.map((line) => ({
    id: line.product_id,
    product_id: line.product_id,
    product_name: line.product_name,
    barcode: line.barcode,
    quantity: String(line.quantity),
    subRows: line.subLines.map((sub) => ({
      id: `${line.product_id}-sub-${sub.sub_product_id}`,
      sub_product_id: sub.sub_product_id,
      sub_product_name: sub.sub_product_name,
      quantity: String(sub.quantity),
    })),
  }));
}

async function buildNoteRowsCache(
  noteIds: string[],
  companyId: string,
  mergeCurrentSubProducts: boolean
): Promise<Map<string, ProductLineRow[]>> {
  if (noteIds.length === 0) return new Map();

  const entries = await Promise.all(
    noteIds.map(async (noteId) => {
      const lines = await resolveDeliveryNoteLines(noteId, companyId, { mergeCurrentSubProducts });
      return [noteId, resolvedLinesToRows(lines)] as const;
    })
  );

  return new Map(entries);
}

function collectProductIdsFromRowsCache(cache: Map<string, ProductLineRow[]>): string[] {
  const ids = new Set<string>();
  Array.from(cache.values()).forEach((rows) => {
    rows.forEach((row) => {
      if (row.product_id) ids.add(row.product_id);
    });
  });
  return Array.from(ids);
}

function collectSubProductIdsFromRows(rows: ProductLineRow[]): string[] {
  return rows.flatMap((row) => (row.subRows ?? []).map((sub) => sub.sub_product_id));
}

function collectSubProductIdsFromRowsCache(cache: Map<string, ProductLineRow[]>): string[] {
  const ids = new Set<string>();
  Array.from(cache.values()).forEach((rows) => {
    collectSubProductIdsFromRows(rows).forEach((id) => ids.add(id));
  });
  return Array.from(ids);
}

export function DeliveryNotesClientPage({ clientId }: { clientId: string }) {
  const router = useRouter();
  const salesYears = useMemo(() => getSalesHistoryYears(), []);

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DeliveryNoteTemplate[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [draftNotes, setDraftNotes] = useState<DeliveryNote[]>([]);
  const [validatedNotes, setValidatedNotes] = useState<DeliveryNote[]>([]);
  const [importedNotes, setImportedNotes] = useState<DeliveryNote[]>([]);
  const [draftRowsByNoteId, setDraftRowsByNoteId] = useState<Map<string, ProductLineRow[]>>(new Map());
  const [validatedRowsByNoteId, setValidatedRowsByNoteId] = useState<Map<string, ProductLineRow[]>>(
    new Map()
  );
  const [importedRowsByNoteId, setImportedRowsByNoteId] = useState<Map<string, ProductLineRow[]>>(
    new Map()
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedValidatedId, setSelectedValidatedId] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<ProductLineRow[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<Map<string, Record<number, number>>>(new Map());
  const [salesBySubProduct, setSalesBySubProduct] = useState<Map<string, Record<number, number>>>(
    new Map()
  );
  const [subProductsByProductId, setSubProductsByProductId] = useState<Map<string, SubProduct[]>>(
    new Map()
  );
  const [readOnlyViewId, setReadOnlyViewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateConfirmOpen, setValidateConfirmOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const [pdfDialogNote, setPdfDialogNote] = useState<DeliveryNote | null>(null);

  const [templateEditorMode, setTemplateEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DeliveryNoteTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateRows, setTemplateRows] = useState<ProductLineRow[]>([]);
  const [renameTemplateDialog, setRenameTemplateDialog] = useState<DeliveryNoteTemplate | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showCreateNoteOptions, setShowCreateNoteOptions] = useState(false);
  const [templatesSectionOpen, setTemplatesSectionOpen] = useState(false);
  const [createFromTemplate, setCreateFromTemplate] = useState(false);
  const [templateComboboxOpen, setTemplateComboboxOpen] = useState(false);
  const templateSearchInputRef = useRef<HTMLInputElement>(null);
  const [pickedTemplateId, setPickedTemplateId] = useState('');
  const [createEmptyConfirmOpen, setCreateEmptyConfirmOpen] = useState(false);
  const [zeroQtyConfirmOpen, setZeroQtyConfirmOpen] = useState(false);
  const [deleteDraftConfirm, setDeleteDraftConfirm] = useState<DeliveryNote | null>(null);
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<DeliveryNoteTemplate | null>(null);
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState<{ noteId: string; serialized: string } | null>(
    null
  );
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [closeDraftConfirmOpen, setCloseDraftConfirmOpen] = useState(false);
  const pendingNavigationRef = useRef<string | null>(null);

  const hasUnsavedDraftChanges = useMemo(() => {
    if (!selectedDraftId || !savedDraftSnapshot) return false;
    if (savedDraftSnapshot.noteId !== selectedDraftId) return true;
    return serializeDraftRows(draftRows) !== savedDraftSnapshot.serialized;
  }, [selectedDraftId, savedDraftSnapshot, draftRows]);

  const syncSavedSnapshot = useCallback((noteId: string, rows: ProductLineRow[]) => {
    setSavedDraftSnapshot({ noteId, serialized: serializeDraftRows(rows) });
  }, []);

  const closeDraftEditor = useCallback(() => {
    setSelectedDraftId(null);
    setSavedDraftSnapshot(null);
  }, []);

  const selectedDraft = useMemo(
    () => draftNotes.find((n) => n.id === selectedDraftId) || null,
    [draftNotes, selectedDraftId]
  );

  const selectedValidated = useMemo(
    () => validatedNotes.find((n) => n.id === selectedValidatedId) || null,
    [validatedNotes, selectedValidatedId]
  );

  const activeNotes = useMemo(
    () => [...draftNotes, ...validatedNotes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [draftNotes, validatedNotes]
  );

  const loadData = useCallback(async () => {
    const cid = await getCurrentUserCompanyId();
    if (!cid) throw new Error('Non autorisé');

    const { data: clientData, error: clientError } = await addSoftDeleteFilter(
      supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('company_id', cid),
      'clients'
    ).maybeSingle();

    if (clientError) throw clientError;
    if (!clientData) throw new Error('Client introuvable');

    const [templatesData, productsData, drafts, validated, imported] = await Promise.all([
      fetchDeliveryNoteTemplates(cid),
      fetchImportableProducts(cid),
      fetchClientDeliveryNotes(clientId, cid, 'draft'),
      fetchClientDeliveryNotes(clientId, cid, 'validated'),
      fetchClientDeliveryNotes(clientId, cid, 'imported'),
    ]);

    const [draftRowsCache, validatedRowsCache, importedRowsCache] = await Promise.all([
      buildNoteRowsCache(
        drafts.map((d) => d.id),
        cid,
        true
      ),
      buildNoteRowsCache(
        validated.map((n) => n.id),
        cid,
        false
      ),
      buildNoteRowsCache(
        imported.map((n) => n.id),
        cid,
        false
      ),
    ]);

    const productIds = [
      ...collectProductIdsFromRowsCache(draftRowsCache),
      ...collectProductIdsFromRowsCache(validatedRowsCache),
      ...collectProductIdsFromRowsCache(importedRowsCache),
      ...productsData.map((p) => p.id),
    ];
    const uniqueProductIds = Array.from(new Set(productIds));
    const subProductIds = [
      ...collectSubProductIdsFromRowsCache(draftRowsCache),
      ...collectSubProductIdsFromRowsCache(validatedRowsCache),
      ...collectSubProductIdsFromRowsCache(importedRowsCache),
    ];
    const uniqueSubProductIds = Array.from(new Set(subProductIds));

    const [sales, subSales, subProductsMap] = await Promise.all([
      uniqueProductIds.length > 0
        ? fetchClientProductSalesByYear(clientId, cid, uniqueProductIds, [...salesYears])
        : Promise.resolve(new Map<string, Record<number, number>>()),
      uniqueSubProductIds.length > 0
        ? fetchClientSubProductSalesByYear(clientId, cid, uniqueSubProductIds, [...salesYears])
        : Promise.resolve(new Map<string, Record<number, number>>()),
      fetchActiveSubProductsByProductIds(cid, uniqueProductIds),
    ]);

    setCompanyId(cid);
    setClient(clientData);
    setTemplates(templatesData);
    setAllProducts(productsData);
    setDraftNotes(drafts);
    setValidatedNotes(validated);
    setImportedNotes(imported);
    setDraftRowsByNoteId(draftRowsCache);
    setValidatedRowsByNoteId(validatedRowsCache);
    setImportedRowsByNoteId(importedRowsCache);
    setSalesByProduct(sales);
    setSalesBySubProduct(subSales);
    setSubProductsByProductId(subProductsMap);

    return { draftRowsCache, validatedRowsCache, importedRowsCache };
  }, [clientId, salesYears]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          const message =
            error instanceof Error && error.message.includes('delivery_note')
              ? 'Les tables Bons de livraison ne sont pas disponibles. Appliquez les migrations Supabase.'
              : error instanceof Error
                ? error.message
                : 'Erreur lors du chargement';
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void init();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useEffect(() => {
    if (!hasUnsavedDraftChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedDraftChanges]);

  useEffect(() => {
    if (!hasUnsavedDraftChanges) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor?.href) return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      pendingNavigationRef.current = `${url.pathname}${url.search}${url.hash}`;
      setLeaveConfirmOpen(true);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [hasUnsavedDraftChanges]);

  const navigateAway = useCallback(
    (href: string) => {
      pendingNavigationRef.current = null;
      setLeaveConfirmOpen(false);
      router.push(href);
    },
    [router]
  );

  const requestNavigation = useCallback(
    (href: string) => {
      if (hasUnsavedDraftChanges) {
        pendingNavigationRef.current = href;
        setLeaveConfirmOpen(true);
        return;
      }
      router.push(href);
    },
    [hasUnsavedDraftChanges, router]
  );

  const handleSelectDraft = (note: DeliveryNote) => {
    if (selectedDraftId === note.id) {
      if (hasUnsavedDraftChanges) {
        setCloseDraftConfirmOpen(true);
      } else {
        closeDraftEditor();
      }
      return;
    }

    setSelectedValidatedId(null);
    const rows = draftRowsByNoteId.get(note.id) ?? [];
    setSelectedDraftId(note.id);
    setReadOnlyViewId(null);
    setDraftRows(rows);
    syncSavedSnapshot(note.id, rows);
  };

  const handleSelectValidated = (note: DeliveryNote) => {
    if (selectedValidatedId === note.id) {
      setSelectedValidatedId(null);
      return;
    }
    if (hasUnsavedDraftChanges) {
      setCloseDraftConfirmOpen(true);
      return;
    }
    closeDraftEditor();
    setReadOnlyViewId(null);
    setSelectedValidatedId(note.id);
  };

  const handleValidateDeliveryNote = async () => {
    if (!selectedDraftId || !companyId || !client) return;
    setValidating(true);
    try {
      if (hasUnsavedDraftChanges) {
        await persistDraft();
      }
      const validated = await validateDeliveryNote(selectedDraftId, companyId, client);
      setValidateConfirmOpen(false);
      closeDraftEditor();
      await loadData();
      setSelectedValidatedId(validated.id);
      setPdfDialogNote(validated);
      toast.success('Bon de livraison validé — PDF généré');
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmCancelValidated = async () => {
    if (!selectedValidatedId || !companyId) return;
    try {
      await cancelValidatedDeliveryNote(selectedValidatedId, companyId);
      setCancelStep(0);
      setSelectedValidatedId(null);
      await loadData();
      toast.success('Bon de livraison annulé');
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'annulation");
    }
  };

  const closeCreateNoteMenu = useCallback(() => {
    setShowCreateNoteOptions(false);
    setCreateFromTemplate(false);
    setPickedTemplateId('');
    setTemplateComboboxOpen(false);
  }, []);

  const handleViewImported = (note: DeliveryNote) => {
    if (readOnlyViewId === note.id) {
      setReadOnlyViewId(null);
      return;
    }

    setReadOnlyViewId(note.id);
    setSelectedDraftId(null);
    setSelectedValidatedId(null);
    setSavedDraftSnapshot(null);
  };

  const handleCreateEmpty = async () => {
    if (!companyId) return;
    try {
      const note = await createEmptyDeliveryNote(clientId, companyId);
      const { draftRowsCache } = await loadData();
      const rows = draftRowsCache.get(note.id) ?? [];
      setSelectedValidatedId(null);
      setSelectedDraftId(note.id);
      setReadOnlyViewId(null);
      setDraftRows(rows);
      syncSavedSnapshot(note.id, rows);
      closeCreateNoteMenu();
      toast.success(`Bon ${note.delivery_number} créé`);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création');
    }
  };

  const handleImportTemplateToBl = async () => {
    if (!companyId || !pickedTemplateId) {
      toast.error('Sélectionnez un modèle');
      return;
    }
    try {
      const note = await createDeliveryNoteFromTemplate(clientId, companyId, pickedTemplateId);
      closeCreateNoteMenu();
      const { draftRowsCache } = await loadData();
      const rows = draftRowsCache.get(note.id) ?? [];
      setSelectedDraftId(note.id);
      setReadOnlyViewId(null);
      setDraftRows(rows);
      syncSavedSnapshot(note.id, rows);
      toast.success(`Bon ${note.delivery_number} créé à partir du modèle`);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création');
    }
  };

  const cancelTemplateEditor = () => {
    setTemplateEditorMode(null);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateRows([]);
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateRows([{ id: `row-${Date.now()}`, product_id: null, product_name: '', barcode: '' }]);
    setTemplateEditorMode('create');
  };

  const openEditTemplate = async (template: DeliveryNoteTemplate) => {
    if (!companyId) return;
    const products = await fetchTemplateProducts(template.id, companyId);
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateRows(
      products.length > 0
        ? products.map((tp) => ({
            id: tp.id,
            product_id: tp.product_id,
            product_name: tp.product?.name || '',
            barcode: tp.product?.barcode || '',
          }))
        : [{ id: `row-${Date.now()}`, product_id: null, product_name: '', barcode: '' }]
    );
    setTemplateEditorMode('edit');
  };

  useEffect(() => {
    if (!templateComboboxOpen) return;
    const timer = window.setTimeout(() => templateSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [templateComboboxOpen]);

  const handleSaveTemplate = async () => {
    if (!companyId) return;
    if (!templateName.trim()) {
      toast.error('Le nom du modèle est requis');
      return;
    }

    const productIds = templateRows
      .map((r) => r.product_id)
      .filter((id): id is string => Boolean(id));

    if (new Set(productIds).size !== productIds.length) {
      toast.error('Chaque produit ne peut apparaître qu\'une seule fois');
      return;
    }

    try {
      let templateId = editingTemplate?.id;
      if (editingTemplate) {
        await renameTemplate(editingTemplate.id, companyId, templateName.trim());
      } else {
        const created = await createTemplate(companyId, templateName.trim());
        templateId = created.id;
      }
      if (!templateId) throw new Error('Modèle introuvable');
      await setTemplateProducts(templateId, companyId, productIds);
      cancelTemplateEditor();
      await loadData();
      toast.success(editingTemplate ? 'Modèle enregistré' : 'Modèle créé');
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erreur');
    }
  };

  const persistDraft = async () => {
    if (!companyId || !selectedDraftId) return;
    const lines = draftRows
      .filter((r) => r.product_id)
      .map((row, index) => {
        const subLines = (row.subRows ?? []).map((sub, subIndex) => ({
          sub_product_id: sub.sub_product_id,
          quantity: sub.quantity === '' ? 0 : parseInt(sub.quantity, 10) || 0,
          display_order: subIndex + 1,
        }));
        const quantity =
          subLines.length > 0
            ? subLines.reduce((sum, sub) => sum + sub.quantity, 0)
            : row.quantity === '' || row.quantity === undefined
              ? 0
              : parseInt(row.quantity, 10) || 0;
        return {
          product_id: row.product_id!,
          quantity,
          display_order: index + 1,
          subLines,
        };
      });

    await saveDeliveryNoteLines(selectedDraftId, companyId, lines);
    await loadData();
  };

  const finalizeDraftSave = () => {
    toast.success('Bon de livraison enregistré');
    closeDraftEditor();
  };

  const handleSaveDraft = async () => {
    if (!selectedDraftId) return;
    const hasZero = draftRows.some((r) => {
      if (!r.product_id) return false;
      if (r.subRows && r.subRows.length > 0) {
        return r.subRows.some((sub) => sub.quantity === '' || parseInt(sub.quantity || '0', 10) === 0);
      }
      return r.quantity === '' || parseInt(r.quantity || '0', 10) === 0;
    });
    if (hasZero) {
      setZeroQtyConfirmOpen(true);
      return;
    }
    setSaving(true);
    try {
      await persistDraft();
      finalizeDraftSave();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDraftRowsChange = async (rows: ProductLineRow[]) => {
    setDraftRows(rows);
    if (selectedDraftId) {
      setDraftRowsByNoteId((prev) => {
        const next = new Map(prev);
        next.set(selectedDraftId, rows);
        return next;
      });
    }
    if (!companyId) return;

    const productIds = rows.map((r) => r.product_id).filter(Boolean) as string[];
    const missingProductIds = productIds.filter((id) => !salesByProduct.has(id));
    const subProductIds = collectSubProductIdsFromRows(rows);
    const missingSubProductIds = subProductIds.filter((id) => !salesBySubProduct.has(id));

    if (missingProductIds.length === 0 && missingSubProductIds.length === 0) return;

    const [newSales, newSubSales] = await Promise.all([
      missingProductIds.length > 0
        ? fetchClientProductSalesByYear(clientId, companyId, missingProductIds, [...salesYears])
        : Promise.resolve(new Map<string, Record<number, number>>()),
      missingSubProductIds.length > 0
        ? fetchClientSubProductSalesByYear(clientId, companyId, missingSubProductIds, [...salesYears])
        : Promise.resolve(new Map<string, Record<number, number>>()),
    ]);

    if (missingProductIds.length > 0) {
      setSalesByProduct((prev) => {
        const next = new Map(prev);
        newSales.forEach((value, key) => next.set(key, value));
        return next;
      });
    }
    if (missingSubProductIds.length > 0) {
      setSalesBySubProduct((prev) => {
        const next = new Map(prev);
        newSubSales.forEach((value, key) => next.set(key, value));
        return next;
      });
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Button variant="outline" onClick={() => requestNavigation(`/clients/${clientId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">{client?.name}</h1>
          <p className="mt-1 flex items-center justify-center gap-2 text-slate-600">
            <Truck className="h-4 w-4" />
            Bon de livraison
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <button
                type="button"
                onClick={() => setTemplatesSectionOpen((open) => !open)}
                className="flex w-full items-center gap-2 text-left hover:opacity-80 transition-opacity"
                aria-expanded={templatesSectionOpen}
              >
                {templatesSectionOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                )}
                <CardTitle className="text-lg">Modèles</CardTitle>
              </button>
            </CardHeader>
            <div className={cn(!templatesSectionOpen && 'hidden')}>
              <CardContent className="space-y-4 pt-0">
                <CardDescription>
                  Modèles globaux réutilisables pour tous vos clients.
                </CardDescription>
                <Button onClick={openCreateTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un modèle
                </Button>
              {templateEditorMode && (
                <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {templateEditorMode === 'create' ? 'Créer un modèle' : 'Modifier le modèle'}
                    </h3>
                    <p className="text-sm text-slate-600">Liste des produits sans quantités.</p>
                  </div>
                  <div>
                    <Label htmlFor="template-name">Nom du modèle</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="mt-1.5 bg-white"
                    />
                  </div>
                  <ProductLinesEditor
                    rows={templateRows}
                    onChange={setTemplateRows}
                    allProducts={allProducts}
                    mode="template"
                    addButtonLabel="Ajouter un produit"
                    allowEmpty
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSaveTemplate}>Enregistrer</Button>
                    <Button variant="outline" onClick={cancelTemplateEditor}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {templates.length === 0 && !templateEditorMode ? (
                <p className="text-sm text-slate-600">Aucun modèle pour le moment.</p>
              ) : templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3',
                        templateEditorMode === 'edit' && editingTemplate?.id === template.id
                          ? 'border-blue-400 ring-1 ring-blue-200'
                          : 'border-slate-200'
                      )}
                    >
                      <span className="font-medium">{template.name}</span>
                      <div className="flex flex-wrap gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEditTemplate(template)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRenameTemplateDialog(template);
                            setRenameValue(template.name);
                          }}
                        >
                          Renommer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!companyId) return;
                            try {
                              await duplicateTemplate(template.id, companyId);
                              await loadData();
                              toast.success('Modèle dupliqué');
                            } catch {
                              toast.error('Erreur');
                            }
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Dupliquer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => setDeleteTemplateConfirm(template)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              </CardContent>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bons de livraison</CardTitle>
              <CardDescription>
                Brouillons modifiables, puis validation définitive avant import dans Facturer (dépôt).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-start gap-2">
                <Button
                  onClick={() => {
                    setShowCreateNoteOptions((open) => {
                      if (open) {
                        setCreateFromTemplate(false);
                        setPickedTemplateId('');
                        setTemplateComboboxOpen(false);
                      }
                      return !open;
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un bon de livraison
                </Button>

                {showCreateNoteOptions && (
                  <div className="flex flex-col items-start gap-2 border-l-2 border-slate-200 pl-4">
                    <Button variant="outline" onClick={() => setCreateEmptyConfirmOpen(true)}>
                      Vierge
                    </Button>
                    <Button variant="outline" onClick={() => setCreateFromTemplate(true)}>
                      Depuis un modèle
                    </Button>

                    {createFromTemplate && (
                      <div className="mt-1 w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {templates.length === 0 ? (
                          <p className="text-sm text-slate-600">
                            Aucun modèle disponible. Créez d&apos;abord un modèle dans la section ci-dessus.
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="template-create-picker">Modèle</Label>
                              <Popover open={templateComboboxOpen} onOpenChange={setTemplateComboboxOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    id="template-create-picker"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={templateComboboxOpen}
                                    className="w-full justify-between font-normal"
                                  >
                                    {pickedTemplateId
                                      ? templates.find((t) => t.id === pickedTemplateId)?.name
                                      : 'Choisir un modèle'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-[var(--radix-popover-trigger-width)] p-0"
                                  align="start"
                                >
                                  <Command shouldFilter>
                                    <CommandInput
                                      ref={templateSearchInputRef}
                                      placeholder="Rechercher un modèle..."
                                    />
                                    <CommandList
                                      className="max-h-[min(16rem,50vh)] overflow-y-auto overscroll-contain"
                                      onWheel={(event) => event.stopPropagation()}
                                    >
                                      <CommandEmpty>Aucun modèle trouvé.</CommandEmpty>
                                      <CommandGroup>
                                        {templates.map((t) => (
                                          <CommandItem
                                            key={t.id}
                                            value={`${t.name} ${t.id}`}
                                            onSelect={() => {
                                              setPickedTemplateId(t.id);
                                              setTemplateComboboxOpen(false);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                          >
                                            <Check
                                              className={cn(
                                                'mr-2 h-4 w-4',
                                                pickedTemplateId === t.id ? 'opacity-100' : 'opacity-0'
                                              )}
                                            />
                                            {t.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <Button
                              onClick={() => void handleImportTemplateToBl()}
                              disabled={!pickedTemplateId}
                            >
                              Créer le bon de livraison
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeNotes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeNotes.map((note) => (
                    <Button
                      key={note.id}
                      variant={
                        selectedDraftId === note.id || selectedValidatedId === note.id
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() =>
                        note.status === 'validated'
                          ? handleSelectValidated(note)
                          : handleSelectDraft(note)
                      }
                      className="gap-1.5"
                    >
                      {note.status === 'validated' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Validé" />
                      ) : (
                        <FilePenLine className="h-3.5 w-3.5 text-slate-500" aria-label="Brouillon" />
                      )}
                      {note.delivery_number}
                    </Button>
                  ))}
                </div>
              )}

              {draftNotes.length > 0 && (
                <div
                  className={cn(
                    'space-y-4 rounded-lg border border-slate-200 bg-white p-4',
                    !selectedDraftId && 'hidden'
                  )}
                >
                  {selectedDraft && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{selectedDraft.delivery_number}</p>
                        <p className="text-xs text-slate-500">
                          Brouillon · Créé le{' '}
                          {new Date(selectedDraft.created_at).toLocaleDateString('fr-FR')}
                          {' · '}
                          Modifié le {new Date(selectedDraft.updated_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={handleSaveDraft} disabled={saving || validating}>
                          {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setValidateConfirmOpen(true)}
                          disabled={saving || validating}
                        >
                          Valider le bon de livraison
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => setDeleteDraftConfirm(selectedDraft)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )}

                  <ProductLinesEditor
                    rows={draftRows}
                    onChange={(rows) => void handleDraftRowsChange(rows)}
                    allProducts={allProducts}
                    mode="delivery-note"
                    addButtonLabel="Ajouter un produit"
                    salesYears={[...salesYears]}
                    salesByProduct={salesByProduct}
                    salesBySubProduct={salesBySubProduct}
                    subProductsByProductId={subProductsByProductId}
                    allowEmpty
                    scrollable
                    compactHeader
                  />
                </div>
              )}

              {selectedValidated && (
                <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {selectedValidated.delivery_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        Validé
                        {selectedValidated.validated_at &&
                          ` le ${new Date(selectedValidated.validated_at).toLocaleDateString('fr-FR')}`}
                        {' · '}
                        Non modifiable — importable dans Facturer (dépôt)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setPdfDialogNote(selectedValidated)}>
                        Voir le PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => setCancelStep(1)}
                      >
                        Annuler le bon de livraison
                      </Button>
                    </div>
                  </div>
                  <ProductLinesEditor
                    rows={validatedRowsByNoteId.get(selectedValidated.id) ?? []}
                    onChange={() => {}}
                    allProducts={allProducts}
                    mode="delivery-note"
                    readOnly
                    salesYears={[...salesYears]}
                    salesByProduct={salesByProduct}
                    salesBySubProduct={salesBySubProduct}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique
              </CardTitle>
              <CardDescription>Bons importés (lecture seule).</CardDescription>
            </CardHeader>
            <CardContent>
              {importedNotes.length === 0 ? (
                <p className="text-sm text-slate-600">Aucun bon importé.</p>
              ) : (
                <div className="space-y-2">
                  {importedNotes.map((note) => (
                    <div key={note.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleViewImported(note)}
                        className={cn(
                          'w-full rounded-lg border p-3 text-left transition-colors hover:bg-slate-50',
                          readOnlyViewId === note.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                        )}
                      >
                        <p className="font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          {note.delivery_number}
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                            Importé
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Créé le {new Date(note.created_at).toLocaleDateString('fr-FR')}
                          {note.imported_at &&
                            ` · Importé le ${new Date(note.imported_at).toLocaleDateString('fr-FR')}`}
                        </p>
                      </button>
                      <div
                        className={cn(
                          'rounded-lg border border-slate-200 bg-slate-50 p-4',
                          readOnlyViewId !== note.id && 'hidden'
                        )}
                      >
                        <div className="mb-3 flex flex-wrap gap-2">
                          {note.pdf_path && (
                            <Button size="sm" variant="outline" onClick={() => setPdfDialogNote(note)}>
                              Voir le PDF
                            </Button>
                          )}
                        </div>
                        <ProductLinesEditor
                          rows={importedRowsByNoteId.get(note.id) ?? []}
                          onChange={() => {}}
                          allProducts={allProducts}
                          mode="delivery-note"
                          readOnly
                          salesYears={[...salesYears]}
                          salesByProduct={salesByProduct}
                          salesBySubProduct={salesBySubProduct}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!renameTemplateDialog} onOpenChange={(o) => !o && setRenameTemplateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le modèle</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTemplateDialog(null)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!companyId || !renameTemplateDialog) return;
                try {
                  await renameTemplate(renameTemplateDialog.id, companyId, renameValue);
                  setRenameTemplateDialog(null);
                  await loadData();
                  toast.success('Modèle renommé');
                } catch {
                  toast.error('Erreur');
                }
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={createEmptyConfirmOpen} onOpenChange={setCreateEmptyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Créer un bon vierge ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un nouveau bon de livraison vide sera créé pour ce client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCreateEmptyConfirmOpen(false);
                void handleCreateEmpty();
              }}
            >
              Créer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={zeroQtyConfirmOpen} onOpenChange={setZeroQtyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quantités à zéro</AlertDialogTitle>
            <AlertDialogDescription>
              Attention, certains produits ont une quantité égale à 0. Êtes-vous sûr de vouloir
              enregistrer ce bon de livraison ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setZeroQtyConfirmOpen(false);
                setSaving(true);
                try {
                  await persistDraft();
                  finalizeDraftSave();
                } catch (error: unknown) {
                  toast.error(error instanceof Error ? error.message : 'Erreur');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDraftConfirm} onOpenChange={(o) => !o && setDeleteDraftConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le bon {deleteDraftConfirm?.delivery_number} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!companyId || !deleteDraftConfirm) return;
                try {
                  await deleteDraftDeliveryNote(deleteDraftConfirm.id, companyId);
                  setDeleteDraftConfirm(null);
                  closeDraftEditor();
                  setDraftRows([]);
                  await loadData();
                  toast.success('Brouillon supprimé');
                } catch {
                  toast.error('Erreur');
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTemplateConfirm} onOpenChange={(o) => !o && setDeleteTemplateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le modèle « {deleteTemplateConfirm?.name} » sera supprimé pour tous vos clients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!companyId || !deleteTemplateConfirm) return;
                try {
                  await deleteTemplate(deleteTemplateConfirm.id, companyId);
                  setDeleteTemplateConfirm(null);
                  await loadData();
                  toast.success('Modèle supprimé');
                } catch {
                  toast.error('Erreur');
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closeDraftConfirmOpen} onOpenChange={setCloseDraftConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez modifié ce bon de livraison sans l&apos;enregistrer. Êtes-vous sûr de vouloir fermer ce bon
              sans enregistrer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer l&apos;édition</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setCloseDraftConfirmOpen(false);
                closeDraftEditor();
              }}
            >
              Fermer sans enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez modifié ce bon de livraison sans l&apos;enregistrer. Êtes-vous sûr de vouloir quitter la page
              sans enregistrer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => (pendingNavigationRef.current = null)}>
              Rester sur la page
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                const href = pendingNavigationRef.current || `/clients/${clientId}`;
                closeDraftEditor();
                navigateAway(href);
              }}
            >
              Quitter sans enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={validateConfirmOpen} onOpenChange={setValidateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider le bon de livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : la validation du bon de livraison est définitive. Une fois validé, le bon de
              livraison ne pourra plus être modifié. Vous certifiez qu&apos;il s&apos;agit de la dernière
              version du bon avant son import chez le client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validating}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={validating}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.preventDefault();
                void handleValidateDeliveryNote();
              }}
            >
              {validating ? 'Validation...' : 'Valider le bon de livraison'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelStep === 1}
        onOpenChange={(open) => {
          if (!open) setCancelStep(0);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce bon de livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : vous êtes sur le point d&apos;annuler ce bon de livraison. Cette action est
              définitive. Le bon ne sera plus accessible dans l&apos;application et ne pourra plus être
              importé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => setCancelStep(2)}>Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelStep === 2}
        onOpenChange={(open) => {
          if (!open) setCancelStep(0);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation définitive</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmez-vous définitivement l&apos;annulation de ce bon de livraison ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelStep(1)}>Retour</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmCancelValidated();
              }}
            >
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {client && pdfDialogNote && (
        <DeliveryNoteDialog
          open={!!pdfDialogNote}
          onOpenChange={(open) => {
            if (!open) setPdfDialogNote(null);
          }}
          client={client}
          deliveryNote={pdfDialogNote}
          onEmailSent={() => void loadData()}
        />
      )}
    </div>
  );
}
