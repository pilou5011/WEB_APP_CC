'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, StockUpdate, Product, ClientProduct, Invoice, SubProduct, ClientSubProduct, CreditNote } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Package, TrendingDown, TrendingUp, Euro, FileText, Trash2, Edit2, Info, Plus, Download, Check, ChevronsUpDown, Calendar, Clock, XCircle, Phone, Hash, GripVertical, ClipboardList, Eye, Pencil, X, Mail, DoorClosed } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockUpdateConfirmationDialog } from '@/components/stock-update-confirmation-dialog';
import { GlobalInvoiceDialog } from '@/components/global-invoice-dialog';
import { DepositSlipDialog } from '@/components/deposit-slip-dialog';
import { StockReportDialog } from '@/components/stock-report-dialog';
import { DraftRecoveryDialog } from '@/components/draft-recovery-dialog';
import { CreditNoteDialog } from '@/components/credit-note-dialog';
import { formatWeekSchedule, formatWeekScheduleData } from '@/components/opening-hours-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useStockUpdateDraft } from '@/hooks/use-stock-update-draft';
import { ClientCalendar } from '@/components/client-calendar';
import { WeekSchedule, getDefaultWeekSchedule } from '@/components/opening-hours-editor';
import { MarketDaysSchedule, getDefaultMarketDaysSchedule } from '@/components/market-days-editor';
import { VacationPeriod, VacationPeriodsEditor } from '@/components/vacation-periods-editor';

// Helper functions for vacation periods (from vacation-periods-editor)
function getDateFromWeek(week: number, year: number = new Date().getFullYear()): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

function weekToDate(week: number, year: number): string {
  const date = getDateFromWeek(week, year);
  return date.toISOString().split('T')[0];
}

function getEndOfWeek(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate;
}

function periodsOverlap(p1: VacationPeriod, p2: VacationPeriod): boolean {
  if (!p1.startDate || !p1.endDate || !p2.startDate || !p2.endDate) {
    return false;
  }

  let start1: Date, end1: Date, start2: Date, end2: Date;

  if (p1.inputType === 'weeks' && p1.startWeek && p1.endWeek) {
    const year1 = p1.isRecurring ? 2000 : (p1.year || new Date().getFullYear());
    start1 = new Date(weekToDate(p1.startWeek, year1));
    const end1Start = new Date(weekToDate(p1.endWeek, year1));
    end1 = getEndOfWeek(end1Start);
  } else {
    start1 = new Date(p1.startDate);
    end1 = new Date(p1.endDate);
  }

  if (p2.inputType === 'weeks' && p2.startWeek && p2.endWeek) {
    const year2 = p2.isRecurring ? 2000 : (p2.year || new Date().getFullYear());
    start2 = new Date(weekToDate(p2.startWeek, year2));
    const end2Start = new Date(weekToDate(p2.endWeek, year2));
    end2 = getEndOfWeek(end2Start);
  } else {
    start2 = new Date(p2.startDate);
    end2 = new Date(p2.endDate);
  }

  if (p1.isRecurring) {
    start1.setFullYear(2000);
    end1.setFullYear(2000);
  }
  if (p2.isRecurring) {
    start2.setFullYear(2000);
    end2.setFullYear(2000);
  }

  return start1 <= end2 && start2 <= end1;
}

// Component for sortable product row
function SortableProductRow({
  cp,
  effectivePrice,
  isCustomPrice,
  effectiveRecommendedSalePrice,
  isCustomRecommendedSalePrice,
  productSubProducts,
  hasSubProducts,
  parentCountedStock,
  parentCardsAdded,
  parentCurrentStock,
  perProductForm,
  setPerProductForm,
  clientSubProducts,
  perSubProductForm,
  setPerSubProductForm,
  onEditPrice,
  onDelete,
  subProducts,
  onAdjustStock,
  clientId
}: {
  cp: ClientProduct & { product?: Product };
  effectivePrice: number;
  isCustomPrice: boolean;
  effectiveRecommendedSalePrice: number | null;
  isCustomRecommendedSalePrice: boolean;
  productSubProducts: SubProduct[];
  hasSubProducts: boolean;
  parentCountedStock: number;
  parentCardsAdded: number;
  parentCurrentStock: number;
  perProductForm: Record<string, { counted_stock: string; stock_added: string; reassort: string; product_info: string }>;
  setPerProductForm: React.Dispatch<React.SetStateAction<Record<string, { counted_stock: string; stock_added: string; reassort: string; product_info: string }>>>;
  clientSubProducts: Record<string, ClientSubProduct>;
  perSubProductForm: Record<string, { counted_stock: string; stock_added: string }>;
  setPerSubProductForm: React.Dispatch<React.SetStateAction<Record<string, { counted_stock: string; stock_added: string }>>>;
  onEditPrice: () => void;
  onDelete: () => void;
  subProducts: Record<string, SubProduct[]>;
  onAdjustStock: () => void;
  clientId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("hover:bg-slate-50/50", hasSubProducts && "bg-slate-50")}
    >
      <TableCell className="align-middle py-3">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <p className={cn("font-medium text-slate-900", hasSubProducts && "font-semibold")}>
            {cp.product?.name || 'Produit'}
          </p>
        </div>
      </TableCell>
      <TableCell className="align-middle py-3 text-center w-[5%]">
        {!hasSubProducts && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdjustStock}
            className="h-8 w-8 p-0"
            title="Ajuster le stock"
          >
            <Pencil className="h-4 w-4 text-slate-600 hover:text-slate-900" />
          </Button>
        )}
      </TableCell>
      <TableCell className="align-middle py-3 text-center">
        {hasSubProducts ? (
          <></>
        ) : (
          <p className="text-sm font-medium text-slate-600">
            {cp.current_stock}
          </p>
        )}
      </TableCell>
      <TableCell className={hasSubProducts ? "align-middle py-3 text-center" : "align-top py-3"}>
        {hasSubProducts ? (
          <></>
        ) : (
          <Input
            type="text"
            inputMode="numeric"
            value={perProductForm[cp.id]?.counted_stock || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                const current = perProductForm[cp.id] || { counted_stock: '', stock_added: '', reassort: '', product_info: '' };
                setPerProductForm(p => ({ ...p, [cp.id]: { ...current, counted_stock: value } }));
              }
            }}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="......"
            className="h-9 placeholder:text-slate-400"
          />
        )}
      </TableCell>
      <TableCell className="align-middle py-3 text-center">
        {hasSubProducts ? (
          <></>
        ) : (
          <p className="text-sm font-medium text-slate-600">
            {(() => {
              const current = perProductForm[cp.id] || { counted_stock: '', stock_added: '', reassort: '', product_info: '' };
              const counted = parseInt(current.counted_stock) || 0;
              const added = parseInt(current.stock_added) || 0;
              // Calculate reassort: Réassort = Nouveau dépôt - Stock compté
              return added - counted;
            })()}
          </p>
        )}
      </TableCell>
      <TableCell className={hasSubProducts ? "align-middle py-3 text-center" : "align-top py-3"}>
        {hasSubProducts ? (
          <></>
        ) : (
          <Input
            type="text"
            inputMode="numeric"
            value={perProductForm[cp.id]?.stock_added || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                const current = perProductForm[cp.id] || { counted_stock: '', stock_added: '', reassort: '', product_info: '' };
                // Just update stock_added, reassort will be calculated automatically in the display
                setPerProductForm(p => ({ ...p, [cp.id]: { ...current, stock_added: value } }));
              }
            }}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="......"
            className="h-9 placeholder:text-slate-400"
          />
        )}
      </TableCell>
      <TableCell className="align-top py-3">
        <Input
          type="text"
          value={perProductForm[cp.id]?.product_info || ''}
          onChange={(e) => {
            const current = perProductForm[cp.id] || { counted_stock: '', stock_added: '', reassort: '', product_info: '' };
            setPerProductForm(p => ({ ...p, [cp.id]: { ...current, product_info: e.target.value } }));
          }}
          placeholder="......"
          className="h-9 placeholder:text-slate-400"
        />
      </TableCell>
      <TableCell className="align-top py-3 text-right">
        <div>
          <p className="text-sm font-medium text-slate-900">{effectivePrice.toFixed(2)} €</p>
          {isCustomPrice && (
            <p className="text-xs text-blue-600">Personnalisé</p>
          )}
          {!isCustomPrice && cp.product?.price != null && (
            <p className="text-xs text-slate-500">Par défaut</p>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top py-3 text-right">
        <div>
          {effectiveRecommendedSalePrice !== null ? (
            <>
              <p className="text-sm font-medium text-slate-900">{effectiveRecommendedSalePrice.toFixed(2)} €</p>
              {isCustomRecommendedSalePrice && (
                <p className="text-xs text-blue-600">Personnalisé</p>
              )}
              {!isCustomRecommendedSalePrice && cp.product?.recommended_sale_price != null && (
                <p className="text-xs text-slate-500">Par défaut</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">-</p>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top py-3">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditPrice}
            className="h-8"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [clientProducts, setClientProducts] = useState<(ClientProduct & { product?: Product })[]>([]);
  const [subProducts, setSubProducts] = useState<Record<string, SubProduct[]>>({}); // product_id -> SubProduct[]
  const [clientSubProducts, setClientSubProducts] = useState<Record<string, ClientSubProduct>>({}); // sub_product_id -> ClientSubProduct
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [globalInvoices, setGlobalInvoices] = useState<Invoice[]>([]);
  const [selectedGlobalInvoice, setSelectedGlobalInvoice] = useState<Invoice | null>(null);
  const [globalInvoiceDialogOpen, setGlobalInvoiceDialogOpen] = useState(false);
  const [depositSlipDialogOpen, setDepositSlipDialogOpen] = useState(false);
  const [stockReportDialogOpen, setStockReportDialogOpen] = useState(false);
  const [selectedInvoiceForStockReport, setSelectedInvoiceForStockReport] = useState<Invoice | null>(null);
  const [selectedInvoiceForDepositSlip, setSelectedInvoiceForDepositSlip] = useState<Invoice | null>(null);
  const [recentStockUpdatesWithoutInvoice, setRecentStockUpdatesWithoutInvoice] = useState<StockUpdate[]>([]);
  const [stockUpdatesForDialog, setStockUpdatesForDialog] = useState<StockUpdate[]>([]);
  const [stockUpdatesFromHistory, setStockUpdatesFromHistory] = useState<StockUpdate[]>([]);
  // Stocker les mises à jour de stock sans facture pour l'historique
  const [stockUpdatesWithoutInvoice, setStockUpdatesWithoutInvoice] = useState<Array<{
    id: string;
    created_at: string;
    total_stock_sold: number;
    total_amount: number;
    stockUpdates: StockUpdate[];
  }>>([]);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  
  // Calendar data
  const [openingHours, setOpeningHours] = useState<WeekSchedule>(getDefaultWeekSchedule());
  const [marketDaysSchedule, setMarketDaysSchedule] = useState<MarketDaysSchedule>(getDefaultMarketDaysSchedule());
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  
  // Vacation period dialog states
  const [vacationPeriodDialogOpen, setVacationPeriodDialogOpen] = useState(false);
  const [editingVacationPeriod, setEditingVacationPeriod] = useState<VacationPeriod | null>(null);
  const [vacationPeriodType, setVacationPeriodType] = useState<'recurring' | 'specific'>('specific');
  const [vacationPeriodInputType, setVacationPeriodInputType] = useState<'weeks' | 'dates'>('dates');
  const [tempVacationStartWeek, setTempVacationStartWeek] = useState<number | ''>('');
  const [tempVacationEndWeek, setTempVacationEndWeek] = useState<number | ''>('');
  const [tempVacationStartDate, setTempVacationStartDate] = useState('');
  const [tempVacationEndDate, setTempVacationEndDate] = useState('');
  const [tempVacationYear, setTempVacationYear] = useState(new Date().getFullYear().toString());
  const [savingVacationPeriod, setSavingVacationPeriod] = useState(false);
  
  // Draft recovery
  const [draftRecoveryOpen, setDraftRecoveryOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<string>('');
  const [hasDraft, setHasDraft] = useState(false);
  const draftCheckDoneRef = useRef(false); // Track if we've already checked for draft
  
  // Delete product dialog
  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ClientProduct & { product?: Product } | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  
  // Edit price dialog
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ClientProduct & { product?: Product } | null>(null);
  const [editPriceForm, setEditPriceForm] = useState<{
    price_type: 'default' | 'custom';
    custom_price: string;
    recommended_sale_price_type: 'default' | 'custom';
    custom_recommended_sale_price: string;
  }>({
    price_type: 'default',
    custom_price: '',
    recommended_sale_price_type: 'default',
    custom_recommended_sale_price: ''
  });
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Adjust stock dialog
  const [adjustStockDialogOpen, setAdjustStockDialogOpen] = useState(false);
  const [itemToAdjust, setItemToAdjust] = useState<{
    type: 'product' | 'sub-product';
    id: string;
    name: string;
    currentStock: number;
    productId: string | null;
  } | null>(null);
  const [adjustStockForm, setAdjustStockForm] = useState<{
    newStock: string;
  }>({
    newStock: ''
  });
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [confirmAdjustDialogOpen, setConfirmAdjustDialogOpen] = useState(false);

  // Credit note dialog
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);
  const [creditNoteForm, setCreditNoteForm] = useState<{
    invoice_id: string;
    operation_name: string;
    quantity: string;
    unit_price: string;
  }>({
    invoice_id: '',
    operation_name: '',
    quantity: '',
    unit_price: ''
  });
  const [creditNoteConfirmDialogOpen, setCreditNoteConfirmDialogOpen] = useState(false);
  const [creatingCreditNote, setCreatingCreditNote] = useState(false);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [invoicePopoverOpen, setInvoicePopoverOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [creditNotePreviewDialogOpen, setCreditNotePreviewDialogOpen] = useState(false);

  // Form per product: { [clientProductId]: { counted_stock, stock_added, product_info } }
  const [perProductForm, setPerProductForm] = useState<Record<string, { counted_stock: string; stock_added: string; reassort: string; product_info: string }>>({});
  // Form per sub-product: { [subProductId]: { counted_stock, stock_added } }
  const [perSubProductForm, setPerSubProductForm] = useState<Record<string, { counted_stock: string; stock_added: string }>>({});

  // Reprise de stock (ajustements de facture)
  const [pendingAdjustments, setPendingAdjustments] = useState<{ operation_name: string; unit_price: string; quantity: string }[]>([]);
  const [addAdjustmentOpen, setAddAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<{ operation_name: string; unit_price: string; quantity: string }>({ operation_name: '', unit_price: '', quantity: '' });

  // Association form
  const [associateForm, setAssociateForm] = useState<{ 
    product_id: string | null; 
    initial_stock: string;
    price_type: 'default' | 'custom';
    custom_price: string;
    recommended_sale_price_type: 'default' | 'custom';
    custom_recommended_sale_price: string;
  }>({
    product_id: null,
    initial_stock: '',
    price_type: 'default',
    custom_price: '',
    recommended_sale_price_type: 'default',
    custom_recommended_sale_price: ''
  });
  
  // Sub-products initial stocks dialog
  const [subProductsInitialStocksDialogOpen, setSubProductsInitialStocksDialogOpen] = useState(false);
  const [subProductsForAssociation, setSubProductsForAssociation] = useState<SubProduct[]>([]);
  const [subProductsInitialStocks, setSubProductsInitialStocks] = useState<Record<string, string>>({});
  const [pendingAssociationData, setPendingAssociationData] = useState<{
    customPrice: number | null;
    customRecommendedSalePrice: number | null;
  } | null>(null);
  
  // Check if selected product has sub-products
  const [selectedProductHasSubProducts,  setSelectedProductHasSubProducts] = useState(false);
  
  // Combobox state for product selector
  const [productComboboxOpen, setProductComboboxOpen] = useState(false);

  // Initialize draft management hook
  const draft = useStockUpdateDraft(clientId);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = clientProducts.findIndex(cp => cp.id === active.id);
      const newIndex = clientProducts.findIndex(cp => cp.id === over.id);

      const reorderedProducts = arrayMove(clientProducts, oldIndex, newIndex);
      setClientProducts(reorderedProducts);

      // Update display_order in database
      try {
        const updates = reorderedProducts.map((cp, index) => ({
          id: cp.id,
          display_order: index + 1
        }));

        // Update all products in a transaction-like manner
        const companyId = await getCurrentUserCompanyId();
        if (!companyId) {
          throw new Error('Non autorisé');
        }

        for (const update of updates) {
          const { error } = await supabase
            .from('client_products')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
            .eq('company_id', companyId);

          if (error) throw error;
        }

        toast.success('Ordre des produits mis à jour');
      } catch (error) {
        console.error('Error updating product order:', error);
        toast.error('Erreur lors de la mise à jour de l\'ordre');
        // Reload to revert changes
        await loadClientData();
      }
    }
  };

  useEffect(() => {
    // Reset draft check flag when clientId changes (navigating to different client)
    draftCheckDoneRef.current = false;
    
    // Check for draft BEFORE loading client data
    const initPage = async () => {
      // First, check if there's a draft
      const draftInfo = await draft.getDraftInfo();
      let hasDraftData = false;
      
      if (draftInfo) {
        console.log('[Draft] Found draft info before loading client data');
        // Load the draft data to check if it contains meaningful stock update data
        let draftData = draft.loadDraftLocally();
        if (!draftData) {
          draftData = await draft.loadDraftFromServer();
        }
        
        if (draftData && draft.hasMeaningfulDraft(draftData)) {
          hasDraftData = true;
          console.log('[Draft] Has meaningful draft, will skip form initialization');
        }
      }
      
      // Load client data (which will initialize the form if no draft)
      await loadClientData();
      
      // AFTER client data is loaded, show draft recovery dialog if needed
      if (hasDraftData) {
        const draftInfo = await draft.getDraftInfo();
        if (draftInfo) {
          let draftData = draft.loadDraftLocally();
          if (!draftData) {
            draftData = await draft.loadDraftFromServer();
          }
          
          if (draftData && draft.hasMeaningfulDraft(draftData)) {
            setDraftDate(draftInfo.createdAt);
            setHasDraft(true);
            setDraftRecoveryOpen(true);
            // Immediately restore draft data to prevent it from being overwritten
            // Add reassort field to existing draft data if missing
            const draftFormWithReassort: Record<string, { counted_stock: string; stock_added: string; reassort: string; product_info: string }> = {};
            if (draftData.perProductForm) {
              const perProductForm = draftData.perProductForm;
              Object.keys(perProductForm).forEach(key => {
                const oldData = perProductForm[key] as any;
                draftFormWithReassort[key] = {
                  ...oldData,
                  reassort: oldData.reassort || ''
                };
              });
            }
            setPerProductForm(draftFormWithReassort);
            if (draftData.perSubProductForm) {
              setPerSubProductForm(draftData.perSubProductForm);
            }
            if (draftData.pendingAdjustments) {
              setPendingAdjustments(draftData.pendingAdjustments);
            }
          }
        }
      }
      
      // Mark draft check as done
      draftCheckDoneRef.current = true;
    };
    
    initPage();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps


  // Initialize sub-product forms when subProducts data is loaded
  useEffect(() => {
    if (!loading && Object.keys(subProducts).length > 0) {
      const initialSubProductForm: Record<string, { counted_stock: string; stock_added: string }> = {};
      Object.values(subProducts).flat().forEach((sp) => {
        initialSubProductForm[sp.id] = {
          counted_stock: perSubProductForm[sp.id]?.counted_stock || '',
          stock_added: perSubProductForm[sp.id]?.stock_added || ''
        };
      });
      // Only update if there are new sub-products not yet in the form
      const hasNewSubProducts = Object.keys(initialSubProductForm).some(id => !(id in perSubProductForm));
      if (hasNewSubProducts) {
        setPerSubProductForm(prev => ({ ...prev, ...initialSubProductForm }));
      }
    }
  }, [subProducts, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if selected product has sub-products
  useEffect(() => {
    const checkSubProducts = async () => {
      if (!associateForm.product_id) {
         setSelectedProductHasSubProducts(false);
        return;
      }

      try {
        const companyId = await getCurrentUserCompanyId();
        if (!companyId) {
          throw new Error('Non autorisé');
        }

        const { data, error } = await supabase
          .from('sub_products')
          .select('id')
          .eq('product_id', associateForm.product_id)
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .limit(1);

        if (error) throw error;
         setSelectedProductHasSubProducts((data && data.length > 0) || false);
      } catch (error) {
        console.error('Error checking sub-products:', error);
         setSelectedProductHasSubProducts(false);
      }
    };

    checkSubProducts();
  }, [associateForm.product_id]);

  // Auto-save draft whenever form data changes (but not during submission or before draft check)
  useEffect(() => {
    // Don't autosave until we've checked for existing draft
    if (!draftCheckDoneRef.current) {
      console.log('[Draft] AutoSave disabled: waiting for draft check to complete');
      return;
    }
    
    // Don't autosave while the recovery dialog is open (user hasn't made a choice yet)
    if (draftRecoveryOpen) {
      console.log('[Draft] AutoSave disabled: draft recovery dialog is open');
      return;
    }
    
    if (!loading && client && clientProducts.length > 0 && !submitting) {
      draft.autoSave({
        perProductForm,
        perSubProductForm,
        pendingAdjustments
      });
    }
  }, [perProductForm, perSubProductForm, pendingAdjustments, loading, client, clientProducts.length, submitting, draftRecoveryOpen]); // eslint-disable-line react-hooks/exhaustive-deps



  const loadClientData = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!clientData) {
        toast.error('Client non trouvé');
        router.push('/clients');
        return;
      }

      setClient(clientData);

      // Load calendar data
      const defaultSchedule = getDefaultWeekSchedule();
      if (clientData.opening_hours) {
        const loadedSchedule = clientData.opening_hours as any;
        const mergedSchedule = { ...defaultSchedule };
        
        Object.keys(defaultSchedule).forEach((day) => {
          if (loadedSchedule[day]) {
            mergedSchedule[day as keyof WeekSchedule] = loadedSchedule[day];
          }
        });
        
        setOpeningHours(mergedSchedule);
      } else {
        setOpeningHours(defaultSchedule);
      }

      const defaultMarketSchedule = getDefaultMarketDaysSchedule();
      if (clientData.market_days_schedule) {
        const loadedMarketSchedule = clientData.market_days_schedule as any;
        const mergedMarketSchedule = { ...defaultMarketSchedule };
        
        Object.keys(defaultMarketSchedule).forEach((day) => {
          if (loadedMarketSchedule[day]) {
            mergedMarketSchedule[day as keyof MarketDaysSchedule] = loadedMarketSchedule[day];
          }
        });
        
        setMarketDaysSchedule(mergedMarketSchedule);
      } else {
        setMarketDaysSchedule(defaultMarketSchedule);
      }

      if (clientData.vacation_periods && Array.isArray(clientData.vacation_periods) && clientData.vacation_periods.length > 0) {
        const migratedPeriods = clientData.vacation_periods.map((period: any) => {
          if (!period.inputType) {
            let year: number | undefined = undefined;
            
            if (!period.isRecurring && period.startDate) {
              const dateYear = new Date(period.startDate).getFullYear();
              if (dateYear !== 2000) {
                year = dateYear;
              } else if (period.year) {
                year = period.year;
              }
            }
            
            return {
              ...period,
              inputType: 'dates' as const,
              year
            };
          }
          return period;
        });
        setVacationPeriods(migratedPeriods as VacationPeriod[]);
      } else {
        setVacationPeriods([]);
      }

      // Load all products (for association selector)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');

      if (productsError) throw productsError;
      setAllProducts(productsData || []);

      // Load client products with related product
      const { data: cpData, error: cpError } = await supabase
        .from('client_products')
        .select('*, product:products!inner(*)')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (cpError) throw cpError;
      const cpWithTyped = (cpData || []).map((row: any) => ({ ...row, product: row.product as Product }));
      setClientProducts(cpWithTyped);

      // Load sub-products for all products
      const productIds = cpWithTyped.map(cp => cp.product_id);
      if (productIds.length > 0) {
        const { data: subProductsData, error: subProductsError } = await supabase
          .from('sub_products')
          .select('*')
          .in('product_id', productIds)
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (subProductsError) throw subProductsError;

        const subProductsByProduct: Record<string, SubProduct[]> = {};
        (subProductsData || []).forEach((sp: SubProduct) => {
          if (!subProductsByProduct[sp.product_id]) {
            subProductsByProduct[sp.product_id] = [];
          }
          subProductsByProduct[sp.product_id].push(sp);
        });
        setSubProducts(subProductsByProduct);

        // Load client_sub_products
        const subProductIds = (subProductsData || []).map(sp => sp.id);
        if (subProductIds.length > 0) {
          const { data: clientSubProductsData, error: clientSubProductsError } = await supabase
            .from('client_sub_products')
            .select('*')
            .eq('client_id', clientId)
            .eq('company_id', companyId)
            .in('sub_product_id', subProductIds)
            .is('deleted_at', null);

          if (clientSubProductsError) throw clientSubProductsError;

          // Convert to Record<string, ClientSubProduct> for easier access (one per sub_product_id)
          const clientSubProductsMap: Record<string, ClientSubProduct> = {};
          (clientSubProductsData || []).forEach((csp: ClientSubProduct) => {
            clientSubProductsMap[csp.sub_product_id] = csp;
          });

          // Créer automatiquement les client_sub_products manquants pour tous les sous-produits
          const missingSubProducts: any[] = [];
          (subProductsData || []).forEach((sp: SubProduct) => {
            if (!clientSubProductsMap[sp.id]) {
              missingSubProducts.push({
                client_id: clientId,
                sub_product_id: sp.id,
                initial_stock: 0,
                current_stock: 0
              });
            }
          });

          if (missingSubProducts.length > 0) {
            const { data: createdSubProducts, error: createError } = await supabase
              .from('client_sub_products')
              .insert(missingSubProducts.map(csp => ({ ...csp, company_id: companyId })))
              .select('*');

            if (createError) throw createError;

            // Ajouter les nouveaux client_sub_products au map
            (createdSubProducts || []).forEach((csp: ClientSubProduct) => {
              clientSubProductsMap[csp.sub_product_id] = csp;
            });
          }

          setClientSubProducts(clientSubProductsMap as any); // Temporary cast
        }
      }

      // Load stock updates to get last product_info for each product
      const { data: updatesData, error: updatesError } = await supabase
        .from('stock_updates')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setStockUpdates(updatesData || []);

      // Initialize per-product form defaults with last product_info
      const initialForm: Record<string, { counted_stock: string; stock_added: string; reassort: string; product_info: string }> = {};
      const initialSubProductForm: Record<string, { counted_stock: string; stock_added: string }> = {};
      
      cpWithTyped.forEach((cp) => {
        // Find the last stock update for this product (most recent, regardless of product_info)
        const lastUpdate = (updatesData || []).find(
          (update: StockUpdate) => 
            update.product_id === cp.product_id
        );
        
        initialForm[cp.id] = { 
          counted_stock: '', 
          stock_added: '', 
          reassort: '',
          product_info: lastUpdate?.product_info || '' 
        };
      });

      // Initialize sub-product forms - wait for subProducts state to be set, will be initialized on next render
      // (subProducts state is set asynchronously, so we'll initialize the form in a useEffect)

      setPerProductForm(initialForm);
      setPerSubProductForm(initialSubProductForm);

      // Load global invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setGlobalInvoices(invoicesData || []);

      // Load credit notes
      const { data: creditNotesData, error: creditNotesError } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (creditNotesError) throw creditNotesError;
      setCreditNotes(creditNotesData || []);
      
      // Calculate last visit date (date of last invoice)
      if (invoicesData && invoicesData.length > 0) {
        setLastVisitDate(invoicesData[0].created_at);
      } else {
        setLastVisitDate(null);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const prepareProductUpdates = (validate: boolean = false) => {
    const updates: {
      Product: Product;
      previousStock: number;
      countedStock: number;
      stockSold: number;
      stockAdded: number;
      newStock: number;
      amount: number;
      effectivePrice: number;
      isCustomPrice: boolean;
      productInfo: string;
    }[] = [];

    for (const cp of clientProducts) {
      const productSubProducts = subProducts[cp.product_id] || [];
      const hasSubProducts = productSubProducts.length > 0;

      if (hasSubProducts) {
        // For products with sub-products, validate and calculate from sub-products
        let totalCountedStock = 0;
        let totalStockAdded = 0;
        let totalPreviousStock = 0;
        let hasAnySubProductData = false;

        for (const sp of productSubProducts) {
          const csp = clientSubProducts[sp.id];
          if (!csp) continue;

          const formData = perSubProductForm[sp.id];
          const hasCountedStock = formData?.counted_stock && formData.counted_stock.trim() !== '';
          const hasNewDeposit = formData?.stock_added && formData.stock_added.trim() !== '';

          if (!hasCountedStock && !hasNewDeposit) continue;
          hasAnySubProductData = true;

          if (validate) {
            if (hasCountedStock && !hasNewDeposit) {
              toast.error(`Veuillez renseigner le "Nouveau dépôt" pour le sous-produit « ${sp.name} » de « ${cp.product?.name || 'Product'} »`);
              return null;
            }
            if (!hasCountedStock && hasNewDeposit) {
              toast.error(`Veuillez renseigner le "Stock compté" pour le sous-produit « ${sp.name} » de « ${cp.product?.name || 'Product'} »`);
              return null;
            }

            const countedStock = parseInt(formData.counted_stock);
            const newDeposit = parseInt(formData.stock_added);

            if (isNaN(countedStock) || countedStock < 0) {
              toast.error(`Le stock compté doit être un nombre positif pour « ${sp.name} »`);
              return null;
            }
            if (isNaN(newDeposit) || newDeposit < 0) {
              toast.error(`Le nouveau dépôt doit être un nombre positif pour « ${sp.name} »`);
              return null;
            }
          }

          if (!hasCountedStock || !hasNewDeposit) continue;

          totalCountedStock += parseInt(formData.counted_stock) || 0;
          totalStockAdded += parseInt(formData.stock_added) || 0;
          totalPreviousStock += csp.current_stock || 0;
        }

        if (!hasAnySubProductData) continue;

        if (validate && (totalCountedStock === 0 && totalStockAdded === 0)) {
          continue; // Skip if no data entered
        }

        const previousStock = totalPreviousStock;
        const countedStock = totalCountedStock;
        const newDeposit = totalStockAdded;
        const stockSold = Math.max(0, previousStock - countedStock);
        const newStock = newDeposit;
        const stockAdded = Math.max(0, newStock - countedStock);
        const productInfo = perProductForm[cp.id]?.product_info || '';

        const effectivePrice = cp.custom_price ?? cp.product?.price ?? 0;
        const isCustomPrice = cp.custom_price !== null;
        const amount = stockSold * effectivePrice;

        if (cp.product) {
          updates.push({
            Product: cp.product,
            previousStock,
            countedStock,
            stockSold,
            stockAdded,
            newStock,
            amount,
            effectivePrice,
            isCustomPrice,
            productInfo
          });
        }
      } else {
        // Normal product without sub-products
        const form = perProductForm[cp.id];
        if (!form) continue;
        
        const hasCountedStock = form.counted_stock && form.counted_stock.trim() !== '';
        const hasNewDeposit = form.stock_added && form.stock_added.trim() !== '';
        
        if (!hasCountedStock && !hasNewDeposit) continue;

        if (validate) {
          if (hasCountedStock && !hasNewDeposit) {
            toast.error(`Veuillez renseigner le "Nouveau dépôt" pour « ${cp.product?.name || 'Product'} »`);
            return null;
          }
          if (!hasCountedStock && hasNewDeposit) {
            toast.error(`Veuillez renseigner le "Nouveau stock compté" pour « ${cp.product?.name || 'Product'} »`);
            return null;
          }
        }

        if (!hasCountedStock || !hasNewDeposit) continue;

        const countedStock = parseInt(form.counted_stock);
        const newDeposit = parseInt(form.stock_added);

        if (validate) {
          if (isNaN(countedStock) || countedStock < 0) {
            toast.error(`Le stock compté doit être un nombre positif pour « ${cp.product?.name || 'Product'} »`);
            return null;
          }
          if (isNaN(newDeposit) || newDeposit < 0) {
            toast.error(`Le nouveau dépôt doit être un nombre positif pour « ${cp.product?.name || 'Product'} »`);
            return null;
          }
        }

        const previousStock = cp.current_stock;
        const stockSold = Math.max(0, previousStock - countedStock);
        const newStock = newDeposit;
        const stockAdded = Math.max(0, newStock - countedStock);
        const productInfo = form.product_info || '';

        const effectivePrice = cp.custom_price ?? cp.product?.price ?? 0;
        const isCustomPrice = cp.custom_price !== null;
        const amount = stockSold * effectivePrice;

        if (cp.product) {
          updates.push({
            Product: cp.product,
            previousStock,
            countedStock,
            stockSold,
            stockAdded,
            newStock,
            amount,
            effectivePrice,
            isCustomPrice,
            productInfo
          });
        }
      }
    }

    return updates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const updates = prepareProductUpdates(true); // Valider au moment de la soumission
    if (!updates) return;
    
    // Vérifier s'il y a des changements de stock OU des reprises de stock
    const hasStockUpdates = updates.length > 0;
    const hasAdjustments = pendingAdjustments.length > 0;
    
    if (!hasStockUpdates && !hasAdjustments) {
      toast.info('Aucun changement détecté');
      return;
    }

    // Open confirmation dialog
    setConfirmationDialogOpen(true);
  };

  const handleResumeDraft = async () => {
    try {
      console.log('[Draft] User confirmed to resume draft (data already loaded)');
      toast.success('Brouillon restauré avec succès');
    } catch (error) {
      console.error('Error resuming draft:', error);
      toast.error('Erreur lors de la restauration du brouillon');
    } finally {
      setDraftRecoveryOpen(false);
      setHasDraft(false);
    }
  };

  const handleDiscardDraft = async () => {
    try {
      console.log('[Draft] Discarding draft for client:', clientId);
      
      // CRITICAL: Mark draft check as not done temporarily to prevent auto-save
      // from recreating the draft while we're deleting it
      draftCheckDoneRef.current = false;
      
      // Delete the draft
      await draft.deleteDraft();
      
      console.log('[Draft] Draft deleted successfully, reinitializing form');
      
      // Reinitialize form with default values (from last invoice)
      const initialForm: Record<string, { counted_stock: string; stock_added: string; reassort: string; product_info: string }> = {};
      clientProducts.forEach((cp) => {
        // Find the last stock update for this product (most recent, regardless of product_info)
        const lastUpdate = stockUpdates.find(
          (update: StockUpdate) => 
            update.product_id === cp.product_id
        );
        
        initialForm[cp.id] = { 
          counted_stock: '', 
          stock_added: '', 
          reassort: '',
          product_info: lastUpdate?.product_info || '' 
        };
      });
      
      // Set form data - this will trigger auto-save, but we've disabled it temporarily
      setPerProductForm(initialForm);
      setPerSubProductForm({});
      setPendingAdjustments([]);
      
      // CRITICAL: Re-enable draft check and auto-save AFTER a delay to ensure
      // the deletion is complete and no new draft is created
      setTimeout(() => {
        draftCheckDoneRef.current = true;
        console.log('[Draft] Auto-save re-enabled after draft deletion');
      }, 1000);
      
      setDraftRecoveryOpen(false);
      setHasDraft(false);
      
      toast.success('Brouillon supprimé avec succès');
    } catch (error) {
      console.error('[Draft] Error discarding draft:', error);
      toast.error('Erreur lors de la suppression du brouillon');
      // Re-enable draft check even on error
      draftCheckDoneRef.current = true;
      setDraftRecoveryOpen(false);
      setHasDraft(false);
    }
  };

  const handleConfirmStockUpdate = async (discountPercentage?: number) => {
    if (!client) return;

    setSubmitting(true);

    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const updates = prepareProductUpdates();
      
      // Vérifier qu'il y a au moins des mises à jour de stock OU des reprises
      const hasStockUpdates = updates && updates.length > 0;
      const hasAdjustments = pendingAdjustments && pendingAdjustments.length > 0;
      
      if (!hasStockUpdates && !hasAdjustments) {
        setSubmitting(false);
        setConfirmationDialogOpen(false);
        return;
      }

      // Calculate totals
      const totalStockSold = hasStockUpdates ? updates.reduce((sum, u) => sum + u.stockSold, 0) : 0;
      const totalAmount = hasStockUpdates ? updates.reduce((sum, u) => sum + u.amount, 0) : 0;
      const adjustmentsTotal = (pendingAdjustments || []).reduce((sum, a) => {
        const unitPrice = parseFloat(a.unit_price);
        const quantity = parseInt(a.quantity);
        if (isNaN(unitPrice) || isNaN(quantity)) return sum;
        return sum + (unitPrice * quantity);
      }, 0);

      const totalAmountBeforeDiscount = totalAmount + adjustmentsTotal;
      
      // Appliquer la remise commerciale si fournie
      const discountAmount = discountPercentage && discountPercentage > 0 && discountPercentage <= 100
        ? (totalAmountBeforeDiscount * discountPercentage / 100)
        : 0;
      
      const finalTotalAmount = totalAmountBeforeDiscount - discountAmount;

      // Vérifier si le montant total est négatif
      if (finalTotalAmount < 0) {
        setSubmitting(false);
        setConfirmationDialogOpen(false);
        toast.error('Une facture ne peut pas avoir un montant négatif. Veuillez créer un avoir.');
        return;
      }

      // Toujours créer un enregistrement invoice si il y a des mises à jour de stock
      // Cela permet d'avoir un invoice_id unique pour regrouper les stock_updates d'un relevé
      let invoiceData: Invoice | null = null;
      if (hasStockUpdates || adjustmentsTotal !== 0) {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            client_id: clientId,
            company_id: companyId,
            total_stock_sold: totalStockSold,
            total_amount: finalTotalAmount,
            discount_percentage: discountPercentage && discountPercentage > 0 ? discountPercentage : null
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceData = invoice;
      }

      // Prepare stock updates with invoice_id
      const updatesToInsert: any[] = [];
      const cpUpdates: { id: string; new_stock: number }[] = [];
      const cspUpdates: { id: string; new_stock: number }[] = []; // Sub-product updates

      if (hasStockUpdates) {
        for (const cp of clientProducts) {
          const productSubProducts = subProducts[cp.product_id] || [];
          const hasSubProducts = productSubProducts.length > 0;

          if (hasSubProducts) {
            // Handle sub-products
            // IMPORTANT: Le stock du produit parent doit être la somme de TOUS les sous-produits
            let totalNewStock = 0;
            let totalCountedStock = 0;
            let totalPreviousStock = 0;
            let totalStockAdded = 0;
            let totalStockSold = 0;

            // D'abord, s'assurer que tous les sous-produits existent et calculer le stock total
            for (const sp of productSubProducts) {
              let csp = clientSubProducts[sp.id];
              
              // Si le client_sub_product n'existe pas, le créer avec stock 0
              if (!csp) {
                try {
                  const { data: newCsp, error: createError } = await supabase
                    .from('client_sub_products')
                    .insert({
                      client_id: clientId,
                      company_id: companyId,
                      sub_product_id: sp.id,
                      initial_stock: 0,
                      current_stock: 0
                    })
                    .select('*')
                    .single();
                  
                  if (createError) throw createError;
                  if (newCsp) {
                    csp = newCsp as ClientSubProduct;
                    // Mettre à jour le state pour éviter de recréer
                    setClientSubProducts(prev => ({ ...prev, [sp.id]: csp! }));
                  }
                } catch (err) {
                  console.error('Error creating missing client_sub_product:', err);
                  // Continuer avec le prochain sous-produit
                  continue;
                }
              }

              if (!csp) continue;

              const formData = perSubProductForm[sp.id];
              const hasCountedStock = formData?.counted_stock && formData.counted_stock.trim() !== '';
              const hasNewDeposit = formData?.stock_added && formData.stock_added.trim() !== '';

              const previousStock = csp.current_stock;
              
              // Déterminer le nouveau stock et le stock compté pour ce sous-produit
              let newStock: number;
              let countedStock: number;
              
              if (hasCountedStock || hasNewDeposit) {
                // Sous-produit mis à jour : utiliser les valeurs du formulaire
                countedStock = parseInt(formData.counted_stock || '0');
                const newDeposit = parseInt(formData.stock_added || '0');
                // Si newDeposit n'est pas renseigné, utiliser countedStock comme nouveau stock
                newStock = hasNewDeposit ? newDeposit : countedStock;
                
                // Si counted_stock n'est pas renseigné (0), il est égal à l'ancien dépôt (pas de mouvement)
                if (countedStock === 0 && !hasCountedStock) {
                  countedStock = previousStock;
                }
                
                const stockSold = Math.max(0, previousStock - countedStock);
                const stockAdded = Math.max(0, newStock - countedStock);

                totalStockAdded += stockAdded;
                totalStockSold += stockSold;

                // Create stock update for sub-product (for stock report)
                updatesToInsert.push({
                  client_id: clientId,
                  company_id: companyId,
                  sub_product_id: sp.id,
                  invoice_id: invoiceData?.id || null,
                  previous_stock: previousStock,
                  counted_stock: countedStock,
                  stock_sold: stockSold,
                  stock_added: stockAdded,
                  new_stock: newStock
                });

                // Update sub-product stock
                cspUpdates.push({ id: csp.id, new_stock: newStock });
              } else {
                // Sous-produit non mis à jour : conserver son stock actuel
                // Le stock compté = ancien dépôt (pas de mouvement)
                newStock = previousStock;
                countedStock = previousStock;
              }

              // TOUJOURS inclure le stock et le stock compté de ce sous-produit dans les totaux du produit
              totalNewStock += newStock;
              totalPreviousStock += previousStock;
              totalCountedStock += countedStock;
            }

            // Create stock update for the parent product (for invoice)
            // IMPORTANT: Ne créer le stock_update pour le produit parent QUE si du stock a été vendu
            // (totalStockSold > 0). Si aucun stock n'est vendu, pas de ligne dans stock_updates.
            if (totalStockSold > 0) {
              const productInfo = perProductForm[cp.id]?.product_info || '';
              // Calculer le prix effectif du produit
              const effectivePrice = cp.custom_price ?? cp.product?.price ?? 0;
              // Calculer unit_price_ht et total_amount_ht uniquement si une facture est générée
              const unitPriceHt = invoiceData ? effectivePrice : null;
              const totalAmountHt = invoiceData && unitPriceHt ? totalStockSold * unitPriceHt : null;
              
              updatesToInsert.push({
                client_id: clientId,
                company_id: companyId,
                product_id: cp.product_id, // Parent product ID for invoice
                invoice_id: invoiceData?.id || null,
                previous_stock: totalPreviousStock,
                counted_stock: totalCountedStock,
                stock_sold: totalStockSold,
                stock_added: totalStockAdded,
                new_stock: totalNewStock,
                product_info: productInfo,
                unit_price_ht: unitPriceHt,
                total_amount_ht: totalAmountHt
              });
            }

            // Update parent product stock (sum of ALL sub-products)
            cpUpdates.push({ id: cp.id, new_stock: totalNewStock });
          } else {
            // Normal product without sub-products
            const form = perProductForm[cp.id];
            if (!form) continue;
            const hasAny = (form.counted_stock && form.counted_stock.trim() !== '') || (form.stock_added && form.stock_added.trim() !== '');
            if (!hasAny) continue;

            const countedStock = parseInt(form.counted_stock);
            const newDeposit = parseInt(form.stock_added);
            const previousStock = cp.current_stock;
            const stockSold = Math.max(0, previousStock - countedStock);
            const newStock = newDeposit;
            const stockAdded = Math.max(0, newStock - countedStock);
            const productInfo = form.product_info || '';
            // Calculer le prix effectif du produit
            const effectivePrice = cp.custom_price ?? cp.product?.price ?? 0;
            // Calculer unit_price_ht et total_amount_ht uniquement si une facture est générée et du stock est vendu
            const unitPriceHt = invoiceData && stockSold > 0 ? effectivePrice : null;
            const totalAmountHt = invoiceData && stockSold > 0 && unitPriceHt ? stockSold * unitPriceHt : null;

            updatesToInsert.push({
              client_id: clientId,
              company_id: companyId,
              product_id: cp.product_id,
              invoice_id: invoiceData?.id || null,
              previous_stock: previousStock,
              counted_stock: countedStock,
              stock_sold: stockSold,
              stock_added: stockAdded,
              new_stock: newStock,
              product_info: productInfo,
              unit_price_ht: unitPriceHt,
              total_amount_ht: totalAmountHt
            });
            cpUpdates.push({ id: cp.id, new_stock: newStock });
          }
        }
      }

      // Insert stock updates only if there are any
      let insertedStockUpdates: StockUpdate[] = [];
      if (updatesToInsert.length > 0) {
        const { data: insertedUpdates, error: updatesInsertError } = await supabase
          .from('stock_updates')
          .insert(updatesToInsert)
          .select('*');
        if (updatesInsertError) throw updatesInsertError;
        insertedStockUpdates = insertedUpdates || [];
      }

      // Insert invoice adjustments (reprise de stock) only if invoice exists
      if (invoiceData && (pendingAdjustments || []).length > 0) {
        const invoiceId = invoiceData.id; // Store in a const to help TypeScript
        const rows = pendingAdjustments
          .map(a => {
            const unitPrice = parseFloat(a.unit_price);
            const quantity = parseInt(a.quantity);
            if (isNaN(unitPrice) || isNaN(quantity)) return null;
            const amount = unitPrice * quantity;
            return {
              client_id: clientId,
              invoice_id: invoiceId,
              operation_name: a.operation_name,
              unit_price: unitPrice,
              quantity: quantity,
              amount
            };
          })
          .filter(Boolean) as any[];
        if (rows.length > 0) {
          const { error: adjError } = await supabase
            .from('invoice_adjustments')
            .insert(rows);
          if (adjError) throw adjError;
        }
      }

      // Générer et sauvegarder les 3 PDFs (facture, relevé de stock, bon de dépôt)
      // après que tous les stock_updates et adjustments ont été insérés
      if (invoiceData) {
        try {
          // Import dynamique pour éviter de charger les dépendances lourdes si pas nécessaire
          const pdfGenerators = await import('@/lib/pdf-generators');
          const { generateAndSaveInvoicePDF, generateAndSaveStockReportPDF, generateAndSaveDepositSlipPDF } = pdfGenerators;
          
          // Charger les données nécessaires pour la génération des PDFs
          const { data: userProfile } = await supabase
            .from('user_profile')
            .select('*')
            .eq('company_id', companyId)
            .limit(1)
            .maybeSingle();

          const { data: invoiceAdjustments } = await supabase
            .from('invoice_adjustments')
            .select('*')
            .eq('invoice_id', invoiceData.id)
            .eq('company_id', companyId);

          // Générer les 3 PDFs en parallèle
          await Promise.all([
            generateAndSaveInvoicePDF({
              invoice: invoiceData,
              client,
              clientProducts,
              products: allProducts,
              stockUpdates: insertedStockUpdates,
              adjustments: invoiceAdjustments || [],
              userProfile: userProfile || null
            }),
            generateAndSaveStockReportPDF({
              invoice: invoiceData,
              client,
              clientProducts,
              stockUpdates: insertedStockUpdates
            }),
            generateAndSaveDepositSlipPDF({
              invoice: invoiceData,
              client,
              clientProducts,
              stockUpdates: insertedStockUpdates,
              userProfile: userProfile || null
            })
          ]);

          console.log('All PDFs generated and saved successfully');
        } catch (pdfError) {
          console.error('Error generating PDFs:', pdfError);
          // Ne pas bloquer le processus si la génération des PDFs échoue
          toast.warning('Les documents PDF n\'ont pas pu être générés automatiquement. Vous pourrez les générer manuellement depuis l\'historique.');
        }
      }

      // Apply per-sub-product stock updates first
      for (const upd of cspUpdates) {
        const { error: cspUpdateError } = await supabase
          .from('client_sub_products')
          .update({ current_stock: upd.new_stock, updated_at: new Date().toISOString() })
          .eq('id', upd.id)
          .eq('company_id', companyId);
        if (cspUpdateError) throw cspUpdateError;
      }

      // Apply per-product stock (will be sum of sub-products for products with sub-products)
      for (const upd of cpUpdates) {
        const { error: cpUpdateError } = await supabase
          .from('client_products')
          .update({ current_stock: upd.new_stock, updated_at: new Date().toISOString() })
          .eq('id', upd.id)
          .eq('company_id', companyId);
        if (cpUpdateError) throw cpUpdateError;
      }

      // Stock is now managed at client_products and client_sub_products level
      // No need to update client.current_stock as it no longer exists
      // The total stock can be computed by summing client_products.current_stock when needed

      // ✅ Débloquer l'interface IMMÉDIATEMENT
      setConfirmationDialogOpen(false);
      setSubmitting(false);
      
      // ✅ CRITICAL: Supprimer le brouillon après succès de toutes les opérations
      // (facture créée et stock updates insérés sans erreur)
      // Désactiver temporairement l'auto-save pour éviter qu'il recrée le brouillon
      draftCheckDoneRef.current = false;
      
      try {
        console.log('[Draft] Attempting to delete draft after successful stock update for client:', clientId);
        
        const companyId = await getCurrentUserCompanyId();
        if (!companyId) {
          throw new Error('Non autorisé');
        }
        
        // Vérifier d'abord si un brouillon existe
        const { data: existingDraft, error: checkError } = await supabase
          .from('draft_stock_updates')
          .select('id')
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (checkError) {
          console.error('[Draft] Error checking for existing draft:', checkError);
        } else if (existingDraft) {
          console.log('[Draft] Found existing draft with id:', existingDraft.id);
        } else {
          console.log('[Draft] No draft found to delete');
        }
        
        // Supprimer le brouillon via le hook
        await draft.deleteDraft();
        setHasDraft(false);
        console.log('[Draft] Draft deleted successfully after successful stock update');
        
        // Vérifier que la suppression a bien fonctionné
        const { data: verifyDraft, error: verifyError } = await supabase
          .from('draft_stock_updates')
          .select('id')
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (verifyError) {
          console.error('[Draft] Error verifying draft deletion:', verifyError);
        } else if (verifyDraft) {
          console.warn('[Draft] WARNING: Draft still exists after deletion! ID:', verifyDraft.id);
          // Essayer une suppression directe (soft delete)
          const { error: directDeleteError } = await supabase
            .from('draft_stock_updates')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', verifyDraft.id)
            .eq('company_id', companyId);
          
          if (directDeleteError) {
            console.error('[Draft] Direct deletion also failed:', directDeleteError);
            throw directDeleteError;
          } else {
            console.log('[Draft] Draft deleted via direct deletion');
          }
        } else {
          console.log('[Draft] Draft deletion verified: no draft remains');
        }
        
        // Réinitialiser les formulaires pour éviter qu'un auto-save recrée le brouillon
        setPerProductForm({});
        setPerSubProductForm({});
        setPendingAdjustments([]);
        
        // Réactiver l'auto-save après un délai pour s'assurer que la suppression est complète
        setTimeout(() => {
          draftCheckDoneRef.current = true;
          console.log('[Draft] Auto-save re-enabled after draft deletion');
        }, 2000);
      } catch (draftError) {
        console.error('[Draft] Error deleting draft after stock update:', draftError);
        toast.error('Erreur lors de la suppression du brouillon. Veuillez le supprimer manuellement.');
        // Réactiver l'auto-save même en cas d'erreur
        setTimeout(() => {
          draftCheckDoneRef.current = true;
        }, 1000);
      }

      // Success message based on what was done
      if (invoiceData) {
        if (hasStockUpdates && hasAdjustments) {
          toast.success('Facture créée avec reprises de stock et mise à jour du stock');
        } else if (hasStockUpdates) {
          toast.success('Facture créée et stock mis à jour');
        } else {
          toast.success('Facture créée avec reprises de stock');
        }
      } else {
        // No invoice created (no cards sold and no adjustments)
        if (hasStockUpdates) {
          toast.success('Stock mis à jour (aucun stock vendu, aucune facture créée)');
        }
      }
      
      // ✅ Reset adjustments et reload data
      setPendingAdjustments([]);
      
      // Open dialogs for deposit slip and stock report if stock was updated
      if (hasStockUpdates && insertedStockUpdates.length > 0) {
        // Create a temporary invoice-like object for the dialogs if no invoice was created
        const tempInvoiceForDialogs: Invoice | null = invoiceData || {
          id: '', // Will not be used for filtering, but needed for dialog
          client_id: clientId,
          total_stock_sold: totalStockSold,
          total_amount: 0,
          invoice_number: null, // No invoice number when amount is 0
          created_at: new Date().toISOString()
        } as Invoice;
        
        // Set the stock updates and open dialogs
        // Maintenant, invoiceData existe toujours si hasStockUpdates est vrai
        if (invoiceData) {
          setSelectedInvoiceForStockReport(invoiceData);
          setSelectedInvoiceForDepositSlip(invoiceData);
        } else {
          // Cas où il n'y a pas de stock updates mais seulement des adjustments
          // (ne devrait plus arriver maintenant, mais gardons pour sécurité)
          setSelectedInvoiceForStockReport(tempInvoiceForDialogs);
          setSelectedInvoiceForDepositSlip(tempInvoiceForDialogs);
        }
      }
      
      // Reload client data pour rafraîchir (sans await pour ne pas bloquer)
      loadClientData().catch(err => {
        console.error('Error reloading client data:', err);
      });
      
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour du stock');
      setSubmitting(false);
      setConfirmationDialogOpen(false);
    }
  };

  const handleDeleteProductClick = (cp: ClientProduct & { product?: Product }) => {
    setProductToDelete(cp);
    setDeleteProductDialogOpen(true);
  };

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return;
    
    setDeletingProduct(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Récupérer les IDs des sous-produits du produit
      const { data: productSubProducts, error: subProductsError } = await supabase
        .from('sub_products')
        .select('id')
        .eq('product_id', productToDelete.product_id)
        .eq('company_id', companyId)
        .is('deleted_at', null);

      if (subProductsError) throw subProductsError;

      // Supprimer tous les client_sub_products associés aux sous-produits de ce produit
      if (productSubProducts && productSubProducts.length > 0) {
        const subProductIds = productSubProducts.map(sp => sp.id);
        const { error: deleteSubProductsError } = await supabase
          .from('client_sub_products')
          .update({ deleted_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .in('sub_product_id', subProductIds);

        if (deleteSubProductsError) throw deleteSubProductsError;
      }

      // Supprimer le produit du client (soft delete)
      const { error } = await supabase
        .from('client_products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', productToDelete.id)
        .eq('company_id', companyId);
      
      if (error) throw error;

      // Stock is now managed at client_products level
      // No need to update client.current_stock as it no longer exists

      toast.success('Produit dissociée avec succès');
      setDeleteProductDialogOpen(false);
      setProductToDelete(null);
      await loadClientData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erreur lors de la suppression du produit');
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleEditPriceClick = (cp: ClientProduct & { product?: Product }) => {
    setProductToEdit(cp);
    
    // Initialiser le prix de cession
    const priceType = cp.custom_price !== null ? 'custom' : 'default';
    const customPrice = cp.custom_price !== null ? cp.custom_price.toString() : '';
    
    // Initialiser le prix de vente conseillé
    let recommendedSalePriceType: 'default' | 'custom' = 'default';
    let customRecommendedSalePrice = '';
    
    if (cp.custom_recommended_sale_price !== null) {
      recommendedSalePriceType = 'custom';
      customRecommendedSalePrice = cp.custom_recommended_sale_price.toString();
    } else {
      recommendedSalePriceType = 'default';
    }
    
    setEditPriceForm({
      price_type: priceType,
      custom_price: customPrice,
      recommended_sale_price_type: recommendedSalePriceType,
      custom_recommended_sale_price: customRecommendedSalePrice
    });
    setEditPriceDialogOpen(true);
  };

  const handleEditPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToEdit) return;

    setUpdatingPrice(true);
    try {
      let customPrice: number | null = null;
      
      if (editPriceForm.price_type === 'custom') {
        const parsedPrice = parseFloat(editPriceForm.custom_price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          toast.error('Le prix personnalisé doit être un nombre positif');
          setUpdatingPrice(false);
          return;
        }
        customPrice = parsedPrice;
      }

      let customRecommendedSalePrice: number | null = null;
      
      if (editPriceForm.recommended_sale_price_type === 'custom') {
        const parsedRecommendedPrice = parseFloat(editPriceForm.custom_recommended_sale_price);
        if (isNaN(parsedRecommendedPrice) || parsedRecommendedPrice < 0) {
          toast.error('Le prix de vente conseillé personnalisé doit être un nombre positif');
          setUpdatingPrice(false);
          return;
        }
        customRecommendedSalePrice = parsedRecommendedPrice;
      } else {
        // 'default' : utiliser le prix par défaut du produit (mettre null pour utiliser celui du produit)
        customRecommendedSalePrice = null;
      }

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('client_products')
        .update({
          custom_price: customPrice,
          custom_recommended_sale_price: customRecommendedSalePrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', productToEdit.id)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Prix modifié avec succès');
      setEditPriceDialogOpen(false);
      setProductToEdit(null);
      setEditPriceForm({ 
        price_type: 'default', 
        custom_price: '',
        recommended_sale_price_type: 'default',
        custom_recommended_sale_price: ''
      });
      await loadClientData();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Erreur lors de la modification du prix');
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleAdjustStockClick = async (type: 'product' | 'sub-product', id: string) => {
    try {
      if (type === 'product') {
        const cp = clientProducts.find(c => c.id === id);
        if (!cp) {
          toast.error('Produit non trouvée');
          return;
        }
        setItemToAdjust({
          type: 'product',
          id: cp.id,
          name: cp.product?.name || 'Product',
          currentStock: cp.current_stock || 0,
          productId: cp.product_id
        });
      } else if (type === 'sub-product') {
        const sp = Object.values(subProducts).flat().find(s => s.id === id);
        if (!sp) {
          toast.error('Sous-produit non trouvé');
          return;
        }
        const csp = clientSubProducts[sp.id];
        const currentStock = csp ? (csp.current_stock || 0) : 0;
        setItemToAdjust({
          type: 'sub-product',
          id: sp.id,
          name: sp.name,
          currentStock,
          productId: sp.product_id
        });
      }
      setAdjustStockForm({ newStock: '' });
      setAdjustStockDialogOpen(true);
    } catch (error) {
      console.error('Error loading item for adjustment:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToAdjust || !adjustStockForm.newStock || adjustStockForm.newStock === '') {
      toast.error('Veuillez saisir un nouveau stock');
      return;
    }

    const newStockValue = parseInt(adjustStockForm.newStock);
    if (isNaN(newStockValue) || newStockValue < 0) {
      toast.error('Le nouveau stock doit être un nombre positif');
      return;
    }

    if (newStockValue === itemToAdjust.currentStock) {
      toast.error('Le nouveau stock est identique au stock actuel');
      return;
    }

    setConfirmAdjustDialogOpen(true);
  };

  const handleConfirmAdjustStock = async () => {
    if (!itemToAdjust || !adjustStockForm.newStock || adjustStockForm.newStock === '') {
      return;
    }

    const newStockValue = parseInt(adjustStockForm.newStock);
    if (isNaN(newStockValue) || newStockValue < 0) {
      return;
    }

    setAdjustingStock(true);
    setConfirmAdjustDialogOpen(false);

    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      if (itemToAdjust.type === 'product') {
        // Update client product stock
        const { error: updateError } = await supabase
          .from('client_products')
          .update({ current_stock: newStockValue })
          .eq('id', itemToAdjust.id)
          .eq('client_id', clientId)
          .eq('company_id', companyId);

        if (updateError) throw updateError;

        // Create stock_update record with null invoice_id
        const { error: stockUpdateError } = await supabase
          .from('stock_updates')
          .insert({
            client_id: clientId,
            company_id: companyId,
            product_id: itemToAdjust.productId,
            sub_product_id: null,
            invoice_id: null,
            previous_stock: itemToAdjust.currentStock,
            counted_stock: newStockValue,
            stock_sold: 0,
            stock_added: newStockValue - itemToAdjust.currentStock,
            new_stock: newStockValue
          });

        if (stockUpdateError) throw stockUpdateError;
      } else if (itemToAdjust.type === 'sub-product') {
        // Update or create client sub-product stock
        const { data: existingCSP, error: checkError } = await supabase
          .from('client_sub_products')
          .select('*')
          .eq('sub_product_id', itemToAdjust.id)
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingCSP) {
          const { error: updateError } = await supabase
            .from('client_sub_products')
            .update({ current_stock: newStockValue })
            .eq('id', existingCSP.id)
            .eq('company_id', companyId);

          if (updateError) throw updateError;
        } else {
          // Create new client_sub_product
          const { error: createError } = await supabase
            .from('client_sub_products')
            .insert({
              client_id: clientId,
              company_id: companyId,
              sub_product_id: itemToAdjust.id,
              initial_stock: newStockValue,
              current_stock: newStockValue
            });

          if (createError) throw createError;
        }

        // Create stock_update record for sub-product with null invoice_id
        const { error: stockUpdateError } = await supabase
          .from('stock_updates')
          .insert({
            client_id: clientId,
            company_id: companyId,
            product_id: null,
            sub_product_id: itemToAdjust.id,
            invoice_id: null,
            previous_stock: itemToAdjust.currentStock,
            counted_stock: newStockValue,
            stock_sold: 0,
            stock_added: newStockValue - itemToAdjust.currentStock,
            new_stock: newStockValue
          });

        if (stockUpdateError) throw stockUpdateError;

        // Update parent product stock
        if (itemToAdjust.productId) {
          // Get all sub-products for this product
          const { data: allSubProducts, error: spError } = await supabase
            .from('sub_products')
            .select('id')
            .eq('product_id', itemToAdjust.productId)
            .eq('company_id', companyId)
            .is('deleted_at', null);

          if (spError) throw spError;

          if (allSubProducts && allSubProducts.length > 0) {
            const subProductIds = allSubProducts.map(sp => sp.id);

            // Get all client_sub_products for these sub-products
            const { data: allClientSubProducts, error: cspError } = await supabase
              .from('client_sub_products')
              .select('sub_product_id, current_stock')
              .eq('client_id', clientId)
              .eq('company_id', companyId)
              .in('sub_product_id', subProductIds)
              .is('deleted_at', null);

            if (cspError) throw cspError;

            // Calculate total stock for parent product
            let parentStock = 0;
            (allClientSubProducts || []).forEach(csp => {
              if (csp.sub_product_id === itemToAdjust.id) {
                parentStock += newStockValue;
              } else {
                parentStock += csp.current_stock || 0;
              }
            });

            // Get current client product
            const { data: clientProduct, error: cpError } = await supabase
              .from('client_products')
              .select('*')
              .eq('client_id', clientId)
              .eq('company_id', companyId)
              .eq('product_id', itemToAdjust.productId)
              .is('deleted_at', null)
              .maybeSingle();

            if (cpError) throw cpError;

            if (clientProduct) {
              const previousParentStock = clientProduct.current_stock || 0;

              // Update parent product stock
              const { error: updateParentError } = await supabase
                .from('client_products')
                .update({ current_stock: parentStock })
                .eq('id', clientProduct.id)
                .eq('company_id', companyId);

              if (updateParentError) throw updateParentError;

              // Create stock_update record for parent product with null invoice_id
              const { error: parentStockUpdateError } = await supabase
                .from('stock_updates')
                .insert({
                  client_id: clientId,
                  company_id: companyId,
                  product_id: itemToAdjust.productId,
                  sub_product_id: null,
                  invoice_id: null,
                  previous_stock: previousParentStock,
                  counted_stock: parentStock,
                  stock_sold: 0,
                  stock_added: parentStock - previousParentStock,
                  new_stock: parentStock
                });

              if (parentStockUpdateError) throw parentStockUpdateError;
            }
          }
        }
      }

      toast.success('Stock ajusté avec succès');
      setAdjustStockDialogOpen(false);
      setItemToAdjust(null);
      setAdjustStockForm({ newStock: '' });
      await loadClientData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Erreur lors de l\'ajustement du stock');
    } finally {
      setAdjustingStock(false);
    }
  };

  const handleCreditNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteForm.invoice_id || !creditNoteForm.operation_name || !creditNoteForm.quantity || !creditNoteForm.unit_price) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const quantity = parseInt(creditNoteForm.quantity);
    const unitPrice = parseFloat(creditNoteForm.unit_price.replace(',', '.'));

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('La quantité doit être un nombre entier positif');
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast.error('Le prix unitaire doit être un nombre positif');
      return;
    }

    setCreditNoteConfirmDialogOpen(true);
  };

  const handleCreateCreditNote = async () => {
    if (!creditNoteForm.invoice_id || !creditNoteForm.operation_name || !creditNoteForm.quantity || !creditNoteForm.unit_price) {
      return;
    }

    setCreatingCreditNote(true);
    try {
      const quantity = parseInt(creditNoteForm.quantity);
      const unitPrice = parseFloat(creditNoteForm.unit_price.replace(',', '.'));
      const totalAmount = quantity * unitPrice;

      // Create credit note
      const { data: creditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .insert({
          invoice_id: creditNoteForm.invoice_id,
          client_id: clientId,
          unit_price: unitPrice,
          quantity: quantity,
          total_amount: totalAmount,
          operation_name: creditNoteForm.operation_name
        })
        .select()
        .single();

      if (creditNoteError) throw creditNoteError;

      if (!creditNote) {
        throw new Error('Erreur lors de la création de l\'avoir');
      }

      // Generate PDF
      const { generateAndSaveCreditNotePDF } = await import('@/lib/pdf-generators');
      
      const invoice = globalInvoices.find(inv => inv.id === creditNoteForm.invoice_id);
      if (!invoice) {
        throw new Error('Facture non trouvée');
      }

      if (!client) {
        throw new Error('Client non trouvé');
      }

      // Load user profile
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

      await generateAndSaveCreditNotePDF({
        creditNote: creditNote as CreditNote,
        invoice,
        client,
        userProfile: userProfileData
      });

      // Reload credit notes
      const { data: creditNotesData, error: creditNotesError } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (creditNotesError) throw creditNotesError;
      setCreditNotes(creditNotesData || []);

      toast.success('Avoir créé avec succès');
      setCreditNoteDialogOpen(false);
      setCreditNoteConfirmDialogOpen(false);
      setCreditNoteForm({
        invoice_id: '',
        operation_name: '',
        quantity: '',
        unit_price: ''
      });
      setInvoicePopoverOpen(false);
    } catch (error) {
      console.error('Error creating credit note:', error);
      toast.error('Erreur lors de la création de l\'avoir');
    } finally {
      setCreatingCreditNote(false);
    }
  };

  // Vacation period management functions
  const resetVacationPeriodDialog = () => {
    setVacationPeriodType('specific');
    setVacationPeriodInputType('dates');
    setTempVacationStartWeek('');
    setTempVacationEndWeek('');
    setTempVacationStartDate('');
    setTempVacationEndDate('');
    setTempVacationYear(new Date().getFullYear().toString());
    setEditingVacationPeriod(null);
  };

  const handleAddVacationPeriodClick = () => {
    resetVacationPeriodDialog();
    setVacationPeriodDialogOpen(true);
  };

  // Initialiser les valeurs lors de l'édition d'une période
  useEffect(() => {
    if (editingVacationPeriod && vacationPeriodDialogOpen) {
      setVacationPeriodType(editingVacationPeriod.isRecurring ? 'recurring' : 'specific');
      setVacationPeriodInputType(editingVacationPeriod.inputType);
      
      if (editingVacationPeriod.inputType === 'weeks') {
        setTempVacationStartWeek(editingVacationPeriod.startWeek || '');
        setTempVacationEndWeek(editingVacationPeriod.endWeek || '');
        // Pour les semaines, utiliser l'année de la période si spécifique
        if (!editingVacationPeriod.isRecurring && editingVacationPeriod.year) {
          setTempVacationYear(editingVacationPeriod.year.toString());
        } else {
          setTempVacationYear(new Date().getFullYear().toString());
        }
      } else {
        // Pour les dates, extraire directement les dates
        setTempVacationStartDate(editingVacationPeriod.startDate || '');
        setTempVacationEndDate(editingVacationPeriod.endDate || '');
        // Extraire l'année des dates si période spécifique
        if (!editingVacationPeriod.isRecurring && editingVacationPeriod.startDate) {
          const yearFromDate = editingVacationPeriod.startDate.split('-')[0];
          setTempVacationYear(yearFromDate);
        } else {
          setTempVacationYear(new Date().getFullYear().toString());
        }
      }
    }
  }, [editingVacationPeriod, vacationPeriodDialogOpen]);

  const handleSaveVacationPeriod = async () => {
    if (!client) return;

    let newPeriod: VacationPeriod;

    if (vacationPeriodInputType === 'weeks') {
      if (!tempVacationStartWeek || !tempVacationEndWeek) {
        toast.error('Veuillez renseigner les semaines de début et de fin');
        return;
      }

      if (tempVacationStartWeek > tempVacationEndWeek) {
        toast.error('La semaine de fin doit être supérieure ou égale à la semaine de début');
        return;
      }

      const startWeek = Number(tempVacationStartWeek);
      const endWeek = Number(tempVacationEndWeek);
      const year = vacationPeriodType === 'specific' ? Number(tempVacationYear) : undefined;

      let startDate: string;
      let endDate: string;

      if (vacationPeriodType === 'recurring') {
        startDate = weekToDate(startWeek, 2000);
        const endWeekStart = new Date(weekToDate(endWeek, 2000));
        const endWeekEnd = getEndOfWeek(endWeekStart);
        endDate = endWeekEnd.toISOString().split('T')[0];
      } else {
        if (!year) {
          toast.error('Veuillez renseigner l\'année');
          return;
        }
        startDate = weekToDate(startWeek, year);
        const endWeekStart = new Date(weekToDate(endWeek, year));
        const endWeekEnd = getEndOfWeek(endWeekStart);
        endDate = endWeekEnd.toISOString().split('T')[0];
      }

      newPeriod = {
        id: editingVacationPeriod?.id || `period-${Date.now()}`,
        startDate,
        endDate,
        isRecurring: vacationPeriodType === 'recurring',
        inputType: 'weeks',
        startWeek,
        endWeek,
        year
      };
    } else {
      if (!tempVacationStartDate || !tempVacationEndDate) {
        toast.error('Veuillez renseigner les dates de début et de fin');
        return;
      }

      const startParts = tempVacationStartDate.split('-');
      const endParts = tempVacationEndDate.split('-');

      let startDate: string;
      let endDate: string;

      if (vacationPeriodType === 'recurring') {
        startDate = `2000-${startParts[1]}-${startParts[2]}`;
        endDate = `2000-${endParts[1]}-${endParts[2]}`;
      } else {
        // Extraire l'année directement des dates
        const year = Number(startParts[0]);
        startDate = tempVacationStartDate;
        endDate = tempVacationEndDate;
        
        // Vérifier que les deux dates ont la même année
        if (startParts[0] !== endParts[0]) {
          toast.error('Les dates de début et de fin doivent être de la même année');
          return;
        }
      }

      if (startDate > endDate) {
        toast.error('La date de fin doit être postérieure à la date de début');
        return;
      }

      newPeriod = {
        id: editingVacationPeriod?.id || `period-${Date.now()}`,
        startDate,
        endDate,
        isRecurring: vacationPeriodType === 'recurring',
        inputType: 'dates',
        year: vacationPeriodType === 'specific' ? Number(startParts[0]) : undefined
      };
    }

    // Vérifier les chevauchements avec les autres périodes (sauf celle en édition)
    const otherPeriods = editingVacationPeriod 
      ? vacationPeriods.filter(p => p.id !== editingVacationPeriod.id)
      : vacationPeriods;

    const overlapping = otherPeriods.find(p => {
      if (p.isRecurring !== newPeriod.isRecurring) {
        return false;
      }
      return periodsOverlap(p, newPeriod);
    });

    if (overlapping) {
      toast.error('Cette période chevauche avec une autre période existante');
      return;
    }

    setSavingVacationPeriod(true);
    try {
      const updatedPeriods = editingVacationPeriod
        ? vacationPeriods.map(p => p.id === editingVacationPeriod.id ? newPeriod : p)
        : [...vacationPeriods, newPeriod];

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Sauvegarder dans la base de données
      const { error } = await supabase
        .from('clients')
        .update({
          vacation_periods: updatedPeriods.length > 0 ? updatedPeriods : null
        })
        .eq('id', clientId)
        .eq('company_id', companyId);

      if (error) throw error;

      setVacationPeriods(updatedPeriods);
      setVacationPeriodDialogOpen(false);
      resetVacationPeriodDialog();
      toast.success(editingVacationPeriod ? 'Période de fermeture modifiée' : 'Période de fermeture ajoutée');
      
      // Recharger les données du client
      await loadClientData();
    } catch (error) {
      console.error('Error saving vacation period:', error);
      toast.error('Erreur lors de la sauvegarde de la période');
    } finally {
      setSavingVacationPeriod(false);
    }
  };

  const handleAddAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = adjustmentForm.operation_name.trim();
    const unitPriceStr = adjustmentForm.unit_price.trim().replace(',', '.');
    const quantityStr = adjustmentForm.quantity.trim();
    
    if (!name) {
      toast.error("Veuillez renseigner un nom d'opération");
      return;
    }
    
    const unitPrice = parseFloat(unitPriceStr);
    if (isNaN(unitPrice)) {
      toast.error('Le prix unitaire doit être un nombre');
      return;
    }

    // Accepter uniquement des valeurs positives
    if (unitPrice <= 0) {
      toast.error('Le prix unitaire doit être positif');
      return;
    }
    
    const quantity = parseInt(quantityStr);
    if (isNaN(quantity)) {
      toast.error('La quantité doit être un nombre entier');
      return;
    }
    if (quantity <= 0) {
      toast.error('La quantité doit être positive');
      return;
    }
    
     // Convertir le prix positif en négatif pour le stockage (la facture affichera un montant négatif)
    const negativeUnitPrice = -Math.abs(unitPrice);


    setPendingAdjustments((list) => [
      ...list,
      { operation_name: name, unit_price: negativeUnitPrice.toFixed(2), quantity: quantity.toString() }
    ]);
    setAdjustmentForm({ operation_name: '', unit_price: '', quantity: '' });
    setAddAdjustmentOpen(false);
  };

  const handleAssociate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associateForm.product_id) {
      toast.error('Sélectionnez un produit');
      return;
    }

    // Validate custom price if selected
    let customPrice: number | null = null;
    if (associateForm.price_type === 'custom') {
      const parsedPrice = parseFloat(associateForm.custom_price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        toast.error('Le prix personnalisé doit être un nombre positif');
        return;
      }
      customPrice = parsedPrice;
    }

    // Validate custom recommended sale price if selected
    let customRecommendedSalePrice: number | null = null;
    if (associateForm.recommended_sale_price_type === 'custom') {
      const parsedRecommendedSalePrice = parseFloat(associateForm.custom_recommended_sale_price);
      if (isNaN(parsedRecommendedSalePrice) || parsedRecommendedSalePrice < 0) {
        toast.error('Le prix de vente conseillé personnalisé doit être un nombre positif');
        return;
      }
      customRecommendedSalePrice = parsedRecommendedSalePrice;
    }

    // Check if product has sub-products
    try {
      const { data: productSubProducts, error: subProductsError } = await supabase
        .from('sub_products')
        .select('*')
        .eq('product_id', associateForm.product_id)
        .is('deleted_at', null); // Filtrer uniquement les sous-produits non supprimés

      if (subProductsError) throw subProductsError;

      if (productSubProducts && productSubProducts.length > 0) {
        // Product has sub-products: open dialog to enter initial stocks
        // IMPORTANT: Utiliser TOUS les sous-produits du produit
        setSubProductsForAssociation(productSubProducts);
        const initialStocks: Record<string, string> = {};
        // Initialiser tous les sous-produits avec une chaîne vide (sera validé comme 0 si non rempli)
        productSubProducts.forEach(sp => {
          initialStocks[sp.id] = '';
        });
        setSubProductsInitialStocks(initialStocks);
        setPendingAssociationData({ customPrice, customRecommendedSalePrice });
        setSubProductsInitialStocksDialogOpen(true);
        return;
      }
    } catch (err) {
      console.error('Error checking sub-products:', err);
      toast.error('Erreur lors de la vérification des sous-produits');
      return;
    }

    // No sub-products: proceed with normal association
    // Stock initial is required (can be 0)
    if (!associateForm.initial_stock || associateForm.initial_stock.trim() === '') {
      toast.error('Le stock initial est obligatoire');
      return;
    }
    const initialStock = parseInt(associateForm.initial_stock);
    if (isNaN(initialStock) || initialStock < 0) {
      toast.error('Le stock initial doit être un nombre positif ou zéro');
      return;
    }
    await performAssociation(initialStock, customPrice, customRecommendedSalePrice, null);
  };

  const handleSubProductsInitialStocksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Récupérer TOUS les sous-produits du produit (au cas où certains auraient été ajoutés entre-temps)
    try {
      const { data: allSubProducts, error: fetchError } = await supabase
        .from('sub_products')
        .select('*')
        .eq('product_id', associateForm.product_id!);

      if (fetchError) throw fetchError;

      // Validate all stocks - inclure TOUS les sous-produits
      const stocks: Record<string, number> = {};
      for (const sp of (allSubProducts || [])) {
        // Si le sous-produit était dans le formulaire, utiliser la valeur saisie
        // Sinon, utiliser 0 par défaut
        const stockStr = subProductsInitialStocks[sp.id] || '0';
        const stock = parseInt(stockStr);
        if (isNaN(stock) || stock < 0) {
          toast.error(`Le stock initial du sous-produit "${sp.name}" doit être un nombre positif`);
          return;
        }
        stocks[sp.id] = stock;
      }

      if (!pendingAssociationData) return;

      // Calculate total initial stock
      const totalInitialStock = Object.values(stocks).reduce((sum, stock) => sum + stock, 0);

      setSubProductsInitialStocksDialogOpen(false);
      await performAssociation(0, pendingAssociationData.customPrice, pendingAssociationData.customRecommendedSalePrice, stocks);
    } catch (err) {
      console.error('Error fetching all sub-products:', err);
      toast.error('Erreur lors de la récupération des sous-produits');
    }
  };

  const performAssociation = async (
    initialStock: number,
    customPrice: number | null,
    customRecommendedSalePrice: number | null,
    subProductsStocks: Record<string, number> | null
  ) => {
    try {
      // Validate required fields
      if (!clientId) {
        toast.error('ID client manquant');
        return;
      }
      if (!associateForm.product_id) {
        toast.error('ID produit manquant');
        return;
      }

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      console.log('performAssociation called with:', {
        initialStock,
        customPrice,
        customRecommendedSalePrice,
        subProductsStocks,
        clientId,
        productId: associateForm.product_id
      });

      // Calculate display_order: max + 1 to add at the bottom
      const maxOrder = clientProducts.length > 0 
        ? Math.max(...clientProducts.map(cp => cp.display_order || 0))
        : 0;
      const newDisplayOrder = maxOrder + 1;

      const insertData: any = {
        client_id: clientId,
        company_id: companyId,
        product_id: associateForm.product_id,
        initial_stock: subProductsStocks ? 0 : initialStock,
        current_stock: subProductsStocks ? 0 : initialStock,
        display_order: newDisplayOrder
      };

      // Only set custom_price if it's a custom price
      if (customPrice !== null) {
        insertData.custom_price = customPrice;
      }

      // Only set custom_recommended_sale_price if it's a custom price
      if (customRecommendedSalePrice !== null) {
        insertData.custom_recommended_sale_price = customRecommendedSalePrice;
      }

      console.log('Inserting client_product with data:', insertData);

      const { data, error } = await supabase
        .from('client_products')
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting client_product:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Successfully inserted client_product:', data);

      // Load the product data separately if needed
      if (data) {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', associateForm.product_id)
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .single();
        
        if (productError) {
          console.error('Error loading product:', productError);
        } else {
          console.log('Product data loaded:', productData);
        }
      }

      // Créer un stock_update pour le produit lors de l'association
      const stockUpdateForProduct = {
        client_id: clientId,
        company_id: companyId,
        product_id: associateForm.product_id!,
        previous_stock: 0,
        counted_stock: 0,
        stock_sold: 0,
        stock_added: subProductsStocks ? 0 : initialStock,
        new_stock: subProductsStocks ? 0 : initialStock
      };

      const { error: stockUpdateError } = await supabase
        .from('stock_updates')
        .insert([stockUpdateForProduct]);

      if (stockUpdateError) {
        console.error('Error creating stock_update for product:', stockUpdateError);
        // Ne pas bloquer l'association si l'insertion du stock_update échoue
      }

      if (subProductsStocks) {
        // Product has sub-products: create client_sub_products with provided stocks
        // IMPORTANT: Ajouter TOUS les sous-produits du produit, même ceux qui n'ont pas été saisis
        // Récupérer tous les sous-produits du produit (non supprimés)
        const { data: allSubProducts, error: fetchSubProductsError } = await supabase
          .from('sub_products')
          .select('*')
          .eq('product_id', associateForm.product_id!)
          .eq('company_id', companyId)
          .is('deleted_at', null); // Filtrer uniquement les sous-produits non supprimés

        if (fetchSubProductsError) throw fetchSubProductsError;

        // Créer les client_sub_products pour TOUS les sous-produits
        const clientSubProductsToInsert = (allSubProducts || []).map(sp => ({
          client_id: clientId,
          company_id: companyId,
          sub_product_id: sp.id,
          initial_stock: subProductsStocks[sp.id] || 0, // Utiliser le stock saisi ou 0 par défaut
          current_stock: subProductsStocks[sp.id] || 0
        }));

        const { error: insertClientSubProductsError } = await supabase
          .from('client_sub_products')
          .insert(clientSubProductsToInsert);

        if (insertClientSubProductsError) throw insertClientSubProductsError;

        // Créer un stock_update pour chaque sous-produit lors de l'association
        const stockUpdatesForSubProducts = (allSubProducts || []).map(sp => ({
          client_id: clientId,
          company_id: companyId,
          sub_product_id: sp.id,
          previous_stock: 0,
          counted_stock: 0,
          stock_sold: 0,
          stock_added: subProductsStocks[sp.id] || 0,
          new_stock: subProductsStocks[sp.id] || 0
        }));

        const { error: stockUpdatesSubProductsError } = await supabase
          .from('stock_updates')
          .insert(stockUpdatesForSubProducts);

        if (stockUpdatesSubProductsError) {
          console.error('Error creating stock_updates for sub-products:', stockUpdatesSubProductsError);
          // Ne pas bloquer l'association si l'insertion des stock_updates échoue
        }

        // Update the product's stock to sum of sub-products
        const totalStock = Object.values(subProductsStocks).reduce((sum, stock) => sum + stock, 0);
        const { error: updateProductError } = await supabase
          .from('client_products')
          .update({ initial_stock: totalStock, current_stock: totalStock })
          .eq('id', data.id)
          .eq('company_id', companyId);

        if (updateProductError) throw updateProductError;

        // Mettre à jour le stock_update du produit parent avec le total des sous-produits
        // Récupérer d'abord le dernier stock_update du produit
        const { data: lastProductStockUpdate, error: fetchStockUpdateError } = await supabase
          .from('stock_updates')
          .select('id')
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .eq('product_id', associateForm.product_id!)
          .is('sub_product_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!fetchStockUpdateError && lastProductStockUpdate) {
          const { error: updateProductStockUpdateError } = await supabase
            .from('stock_updates')
            .update({ 
              stock_added: totalStock,
              new_stock: totalStock
            })
            .eq('id', lastProductStockUpdate.id)
            .eq('company_id', companyId);

          if (updateProductStockUpdateError) {
            console.error('Error updating stock_update for product:', updateProductStockUpdateError);
            // Ne pas bloquer l'association si la mise à jour du stock_update échoue
          }
        }

        // Stock is now managed at client_products and client_sub_products level
        // No need to update client.current_stock as it no longer exists
      } else {
        // No sub-products: use the normal stock
        // Stock is now managed at client_products level
        // No need to update client.current_stock as it no longer exists
      }

      toast.success('Produit associée au client');
      setAssociateForm({ 
        product_id: null, 
        initial_stock: '', 
        price_type: 'default', 
        custom_price: '',
        recommended_sale_price_type: 'default',
        custom_recommended_sale_price: ''
      });
      setSubProductsInitialStocksDialogOpen(false);
      setSubProductsForAssociation([]);
      setSubProductsInitialStocks({});
      setPendingAssociationData(null);
      await loadClientData();
    } catch (err: any) {
      console.error('Error associating product:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        details: err.details,
        hint: err.hint
      });
      if (err.code === '23505') {
        toast.error('Ce produit est déjà associée à ce client');
      } else if (err.code === '23503') {
        toast.error('Erreur de référence : le produit ou le client n\'existe pas');
      } else if (err.code === '23502') {
        toast.error('Un champ obligatoire est manquant');
      } else {
        toast.error(`Erreur lors de l'association : ${err.message || JSON.stringify(err)}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  // Calculate total cards sold from client_products
  const stockSold = clientProducts.reduce((sum, cp) => {
    const sold = (cp.initial_stock || 0) - (cp.current_stock || 0);
    return sum + Math.max(0, sold);
  }, 0);
  const amountDue = stockSold * 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/clients')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux clients
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              Retour à l'accueil
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/clients/${clientId}/info`)}
            className="shadow-md"
          >
            <Info className="mr-2 h-4 w-4" />
            Infos client
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-3xl">{client.name}</CardTitle>
              <CardDescription className="flex items-start gap-1.5 mt-2 text-base">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>{client.address}</span>
              </CardDescription>
              
              {/* Informations complémentaires */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date de dernier passage */}
                    {lastVisitDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-base">Dernier passage : </span>
                          <span className="text-slate-900 font-semibold text-base">
                            {new Date(lastVisitDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Code client */}
                    {client.client_number && (
                      <div className="flex items-start gap-2">
                        <Hash className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-base">Code client : </span>
                          <span className="text-slate-900 font-bold text-lg font-mono">{client.client_number}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Téléphone 1 */}
                    {client.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-base">Tél : </span>
                          <span className="text-slate-900 font-bold text-base">{client.phone}</span>
                          {client.phone_1_info && (
                            <span className="text-slate-500 ml-1 text-sm">({client.phone_1_info})</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* E-mail */}
                    {client.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
                          <span className="font-medium text-slate-700 text-base">E-mail : </span>
                          <a 
                            href={`mailto:${client.email}`}
                            className="text-slate-900 font-bold text-base hover:text-blue-600 hover:underline transition-colors"
                          >
                            {client.email}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Jour de fermeture - removed as closing_day no longer exists */}
                  </div>
                  
                  {/* Commentaire */}
                  {client.comment && (
                    <div className="mt-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-900 text-base flex-1">{client.comment}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Périodes de fermeture dans les 2 prochains mois */}
                  {(() => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const twoMonthsLater = new Date();
                    twoMonthsLater.setMonth(now.getMonth() + 2);
                    twoMonthsLater.setHours(23, 59, 59, 999);
                    
                    // Filtrer les périodes de fermeture dans les 2 prochains mois
                    const upcomingPeriods = vacationPeriods.filter(period => {
                      let periodStart: Date;
                      let periodEnd: Date;
                      
                      if (period.inputType === 'weeks' && period.startWeek && period.endWeek) {
                        if (period.isRecurring) {
                          // Pour les périodes récurrentes, utiliser l'année actuelle
                          const currentYear = now.getFullYear();
                          periodStart = new Date(weekToDate(period.startWeek, currentYear));
                          const endWeekStart = new Date(weekToDate(period.endWeek, currentYear));
                          periodEnd = getEndOfWeek(endWeekStart);
                        } else {
                          // Pour les périodes ponctuelles, utiliser l'année de la période
                          const year = period.year || now.getFullYear();
                          periodStart = new Date(weekToDate(period.startWeek, year));
                          const endWeekStart = new Date(weekToDate(period.endWeek, year));
                          periodEnd = getEndOfWeek(endWeekStart);
                        }
                      } else {
                        periodStart = new Date(period.startDate);
                        periodEnd = new Date(period.endDate);
                        
                        // Pour les périodes récurrentes, utiliser l'année actuelle
                        if (period.isRecurring) {
                          const currentYear = now.getFullYear();
                          const startMonth = periodStart.getMonth();
                          const startDay = periodStart.getDate();
                          const endMonth = periodEnd.getMonth();
                          const endDay = periodEnd.getDate();
                          
                          periodStart = new Date(currentYear, startMonth, startDay);
                          periodEnd = new Date(currentYear, endMonth, endDay);
                        }
                      }
                      
                      // Vérifier si la période chevauche avec les 2 prochains mois
                      return periodStart <= twoMonthsLater && periodEnd >= now;
                    });
                    
                    if (upcomingPeriods.length > 0) {
                      return (
                        <div className="mt-3">
                          <div className="flex items-start gap-2">
                            <DoorClosed className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-slate-900 text-base font-medium mb-1">Périodes de fermeture à venir :</div>
                              <div className="space-y-1">
                                {upcomingPeriods.map((period) => {
                                  let periodDisplay: string;
                                  
                                  if (period.inputType === 'weeks' && period.startWeek && period.endWeek) {
                                    const weekStr = period.startWeek === period.endWeek 
                                      ? `S${period.startWeek}`
                                      : `S${period.startWeek} à S${period.endWeek}`;
                                    
                                    if (period.isRecurring) {
                                      periodDisplay = `${weekStr} (annuel)`;
                                    } else {
                                      periodDisplay = `${weekStr} - ${period.year}`;
                                    }
                                  } else {
                                    const start = new Date(period.startDate);
                                    const end = new Date(period.endDate);
                                    
                                    // Pour les périodes récurrentes, utiliser l'année actuelle pour l'affichage
                                    if (period.isRecurring) {
                                      const currentYear = now.getFullYear();
                                      const startMonth = start.getMonth();
                                      const startDay = start.getDate();
                                      const endMonth = end.getMonth();
                                      const endDay = end.getDate();
                                      
                                      const displayStart = new Date(currentYear, startMonth, startDay);
                                      const displayEnd = new Date(currentYear, endMonth, endDay);
                                      periodDisplay = `${displayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${displayEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} (annuel)`;
                                    } else {
                                      periodDisplay = `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                                    }
                                  }
                                  
                                  return (
                                    <div key={period.id} className="text-slate-700 text-sm">
                                      • {periodDisplay}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Horaires d'ouverture */}
                  {client.opening_hours && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-slate-700 text-base">Horaires d'ouverture</span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-medium">
                          {formatWeekScheduleData(client.opening_hours).map((item, index) => (
                            <React.Fragment key={`schedule-${index}`}>
                              <div className="text-slate-600">{item.day}</div>
                              <div className="text-slate-800">{item.hours}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Calendrier */}
                  {client && (
                    <div className="mt-4 space-y-4">
                      <ClientCalendar
                        openingHours={openingHours}
                        vacationPeriods={vacationPeriods}
                        marketDaysSchedule={marketDaysSchedule}
                        clientName={client.name}
                      />
                      <Button type="button" onClick={handleAddVacationPeriodClick} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une période de fermeture
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Separator className="my-6" />

{/* {              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Résumé de facturation
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Stock vendu</span>
                    <span className="font-semibold text-slate-900">{stockSold}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Prix unitaire</span>
                    <span className="font-semibold text-slate-900">2,00 €</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-900">Montant dû</span>
                    <span className="text-2xl font-bold text-slate-900">{amountDue.toFixed(2)} €</span>
                  </div>
                </div> 
               </div>}  */}
            </CardContent>
                    </Card>
          
          {/* Sections déplacées vers les sous-pages :
              - Produits liés, Reprise de stock, Mise à jour du stock → /clients/[id]/stock
              - Générer un avoir → /clients/[id]/credit-note
              - Bon de dépôt, Historique des documents → /clients/[id]/documents
          */}
                  </div>

        {client && (
          <StockUpdateConfirmationDialog
            open={confirmationDialogOpen}
            onOpenChange={setConfirmationDialogOpen}
            onConfirm={handleConfirmStockUpdate}
            productUpdates={prepareProductUpdates() || []}
            pendingAdjustments={pendingAdjustments}
            loading={submitting}
          />
        )}

        {client && selectedGlobalInvoice && (
          <GlobalInvoiceDialog
            open={globalInvoiceDialogOpen}
            onOpenChange={setGlobalInvoiceDialogOpen}
            client={client}
            invoice={selectedGlobalInvoice}
            stockUpdates={stockUpdates.filter(u => u.invoice_id === selectedGlobalInvoice.id)}
            products={allProducts}
            clientProducts={clientProducts}
          />
        )}

        {client && (
          <DepositSlipDialog
            open={depositSlipDialogOpen}
            onOpenChange={(open) => {
              setDepositSlipDialogOpen(open);
              if (!open) {
                // Reset selected invoice when dialog closes
                setSelectedInvoiceForDepositSlip(null);
              }
            }}
            client={client}
            clientProducts={clientProducts}
            invoice={selectedInvoiceForDepositSlip}
            stockUpdates={selectedInvoiceForDepositSlip 
              ? stockUpdates.filter(u => u.invoice_id === selectedInvoiceForDepositSlip.id)
              : recentStockUpdatesWithoutInvoice}
          />
        )}

        {client && selectedInvoiceForStockReport && (
          <StockReportDialog
            open={stockReportDialogOpen}
            onOpenChange={setStockReportDialogOpen}
            client={client}
            clientProducts={clientProducts}
            stockUpdates={(() => {
              if (selectedInvoiceForStockReport) {
                const filtered = stockUpdates.filter(u => u.invoice_id === selectedInvoiceForStockReport.id);
                if (filtered.length > 0) {
                  return filtered;
                }
              }
              if (stockUpdatesFromHistory.length > 0) {
                return stockUpdatesFromHistory;
              }
              if (stockUpdatesForDialog.length > 0) {
                return stockUpdatesForDialog;
              }
              return recentStockUpdatesWithoutInvoice;
            })()}
            invoice={selectedInvoiceForStockReport}
          />
        )}

        {client && (
          <StockUpdateConfirmationDialog
            open={confirmationDialogOpen}
            onOpenChange={setConfirmationDialogOpen}
            onConfirm={handleConfirmStockUpdate}
            productUpdates={prepareProductUpdates() || []}
            pendingAdjustments={pendingAdjustments}
            loading={submitting}
          />
        )}

        {client && selectedGlobalInvoice && (
          <GlobalInvoiceDialog
            open={globalInvoiceDialogOpen}
            onOpenChange={setGlobalInvoiceDialogOpen}
            client={client}
            invoice={selectedGlobalInvoice}
            stockUpdates={stockUpdates.filter(u => u.invoice_id === selectedGlobalInvoice.id)}
            products={allProducts}
            clientProducts={clientProducts}
          />
        )}

        {/* Delete Product Dialog */}
        <AlertDialog open={deleteProductDialogOpen} onOpenChange={setDeleteProductDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir dissocier le produit "{productToDelete?.product?.name}" de ce client ?
                Cette action est irréversible.
                {productToDelete && productToDelete.current_stock > 0 && (
                  <span className="block mt-2 text-orange-600 font-medium">
                    ⚠️ Attention : Ce produit a encore {productToDelete.current_stock} unité(s) en stock.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingProduct}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProductConfirm}
                disabled={deletingProduct}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingProduct ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Price Dialog */}
        <Dialog open={editPriceDialogOpen} onOpenChange={(open) => {
          setEditPriceDialogOpen(open);
          if (!open) {
            // Réinitialiser le formulaire quand le dialog se ferme
            setEditPriceForm({ 
              price_type: 'default', 
              custom_price: '',
              recommended_sale_price_type: 'default',
              custom_recommended_sale_price: ''
            });
            setProductToEdit(null);
          }
        }}>
          <DialogContent>
            <form onSubmit={handleEditPriceSubmit}>
              <DialogHeader>
                <DialogTitle>Modifier le prix</DialogTitle>
                <DialogDescription>
                  Modifiez le prix de "{productToEdit?.product?.name}" pour ce client
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {productToEdit?.product && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                    <p className="text-sm text-slate-600">
                      Prix par défaut du produit : 
                      <span className="font-semibold text-slate-900 ml-2">
                        {productToEdit.product.price.toFixed(2)} €
                      </span>
                    </p>
                    {productToEdit.product.recommended_sale_price !== null && (
                      <p className="text-sm text-slate-600">
                        Prix de vente conseillé par défaut : 
                        <span className="font-semibold text-slate-900 ml-2">
                          {productToEdit.product.recommended_sale_price.toFixed(2)} €
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3 border border-slate-200 rounded-lg p-4">
                  <Label>Type de prix</Label>
                  <RadioGroup
                    value={editPriceForm.price_type}
                    onValueChange={(val: 'default' | 'custom') => setEditPriceForm({ ...editPriceForm, price_type: val })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="edit-price-default" />
                      <Label htmlFor="edit-price-default" className="font-normal cursor-pointer">
                        Utiliser le prix par défaut
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="edit-price-custom" />
                      <Label htmlFor="edit-price-custom" className="font-normal cursor-pointer">
                        Utiliser un prix spécifique
                      </Label>
                    </div>
                  </RadioGroup>

                  {editPriceForm.price_type === 'custom' && (
                    <div className="pt-2">
                      <Label htmlFor="edit-custom-price">Prix personnalisé (€)</Label>
                      <Input
                        id="edit-custom-price"
                        type="text"
                        inputMode="decimal"
                        value={editPriceForm.custom_price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // N'accepter que les nombres et le point décimal
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setEditPriceForm({ ...editPriceForm, custom_price: value });
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ex: 2.50"
                        className="mt-1.5"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Prix de vente conseillé */}
                <div className="space-y-3 border border-slate-200 rounded-lg p-4">
                  <Label>Prix de vente conseillé (TTC)</Label>
                  <RadioGroup
                    value={editPriceForm.recommended_sale_price_type}
                    onValueChange={(val) => {
                      if (val === 'default' || val === 'custom') {
                        setEditPriceForm({ ...editPriceForm, recommended_sale_price_type: val });
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="edit-recommended-price-default" />
                      <Label htmlFor="edit-recommended-price-default" className="font-normal cursor-pointer">
                        Utiliser le prix par défaut
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="edit-recommended-price-custom" />
                      <Label htmlFor="edit-recommended-price-custom" className="font-normal cursor-pointer">
                        Utiliser un prix spécifique
                      </Label>
                    </div>
                  </RadioGroup>

                  {editPriceForm.recommended_sale_price_type === 'custom' && (
                    <div className="pt-2">
                      <Label htmlFor="edit-custom-recommended-price">Prix de vente conseillé personnalisé (€)</Label>
                      <Input
                        id="edit-custom-recommended-price"
                        type="text"
                        inputMode="decimal"
                        value={editPriceForm.custom_recommended_sale_price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // N'accepter que les nombres et le point décimal
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setEditPriceForm({ ...editPriceForm, custom_recommended_sale_price: value });
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ex: 3.50"
                        className="mt-1.5"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditPriceDialogOpen(false);
                    setEditPriceForm({ 
                      price_type: 'default', 
                      custom_price: '',
                      recommended_sale_price_type: 'default',
                      custom_recommended_sale_price: ''
                    });
                  }}
                  disabled={updatingPrice}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updatingPrice}>
                  {updatingPrice ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Adjust Stock Dialog */}
        <Dialog open={adjustStockDialogOpen} onOpenChange={setAdjustStockDialogOpen}>
          <DialogContent>
            <form onSubmit={handleAdjustStockSubmit}>
              <DialogHeader>
                <DialogTitle>Ajuster le stock</DialogTitle>
                <DialogDescription>
                  Ajustez le stock de "{itemToAdjust?.name}" pour ce client
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-600">
                    Stock actuel : 
                    <span className="font-semibold text-slate-900 ml-2">
                      {itemToAdjust?.currentStock}
                    </span>
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="adjust-new-stock">Nouveau stock</Label>
                  <Input
                    id="adjust-new-stock"
                    type="number"
                    min="0"
                    value={adjustStockForm.newStock}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setAdjustStockForm({ newStock: value });
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Entrez le nouveau stock"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                  
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustStockDialogOpen(false)}
                  disabled={adjustingStock}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={adjustingStock || !adjustStockForm.newStock || adjustStockForm.newStock === '' || parseInt(adjustStockForm.newStock) === itemToAdjust?.currentStock}>
                  {adjustingStock ? 'Ajustement...' : 'Ajuster le stock'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirm Adjust Stock Dialog */}
        <Dialog open={confirmAdjustDialogOpen} onOpenChange={setConfirmAdjustDialogOpen}>
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 z-50 bg-slate-500/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
              )}
            >
              <DialogHeader>
                <DialogTitle>Êtes-vous sûr ?</DialogTitle>
                <DialogDescription>
                  Cette action ne peut pas être annulée. Cela ajustera le stock de <strong>"{itemToAdjust?.name}"</strong> de <strong>{itemToAdjust?.currentStock}</strong> à <strong>{adjustStockForm.newStock}</strong>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAdjustDialogOpen(false)}
                  disabled={adjustingStock}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmAdjustStock}
                  disabled={adjustingStock}
                >
                  {adjustingStock ? 'Ajustement en cours...' : 'Ajuster'}
                </Button>
              </DialogFooter>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>

        {/* Sub-Products Initial Stocks Dialog */}
        <Dialog open={subProductsInitialStocksDialogOpen} onOpenChange={setSubProductsInitialStocksDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
            <form onSubmit={handleSubProductsInitialStocksSubmit} className="flex flex-col flex-1 min-h-0">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Stocks initiaux des sous-produits</DialogTitle>
                <DialogDescription>
                  Ce produit contient des sous-produits. Veuillez renseigner le stock initial pour chaque sous-produit.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2 -mr-2">
                {subProductsForAssociation.map((sp) => (
                  <div key={sp.id} className="flex-shrink-0">
                    <Label htmlFor={`sub-product-stock-${sp.id}`}>{sp.name}</Label>
                    <Input
                      id={`sub-product-stock-${sp.id}`}
                      type="text"
                      inputMode="numeric"
                      value={subProductsInitialStocks[sp.id] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          setSubProductsInitialStocks(prev => ({ ...prev, [sp.id]: value }));
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Ex: 50"
                      className="mt-1.5"
                      required
                    />
                  </div>
                ))}
              </div>

              <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setSubProductsInitialStocksDialogOpen(false);
                  setSubProductsForAssociation([]);
                  setSubProductsInitialStocks({});
                  setPendingAssociationData(null);
                }}>
                  Annuler
                </Button>
                <Button type="submit">Valider les stocks</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Deposit Slip Dialog */}
        {client && (
          <DepositSlipDialog
            open={depositSlipDialogOpen}
            onOpenChange={(open) => {
              setDepositSlipDialogOpen(open);
              if (!open) {
                // Reset selected invoice when dialog closes
                setSelectedInvoiceForDepositSlip(null);
              }
            }}
            client={client}
            clientProducts={clientProducts}
            stockUpdates={
              selectedInvoiceForDepositSlip?.id 
                ? stockUpdates.filter(u => u.invoice_id === selectedInvoiceForDepositSlip.id)
                : recentStockUpdatesWithoutInvoice.length > 0
                ? recentStockUpdatesWithoutInvoice
                : []
            }
            invoice={selectedInvoiceForDepositSlip}
            generateMode={!selectedInvoiceForDepositSlip} // Mode génération si pas d'invoice sélectionnée (bouton "Générer un bon de dépôt")
          />
        )}

        {client && selectedInvoiceForStockReport && (
          <StockReportDialog
            open={stockReportDialogOpen}
            onOpenChange={setStockReportDialogOpen}
            client={client}
            clientProducts={clientProducts}
            stockUpdates={(() => {
              // Maintenant, toutes les mises à jour de stock ont un invoice_id
              // Utiliser invoice_id pour filtrer les stock_updates depuis la base
              if (selectedInvoiceForStockReport.id && selectedInvoiceForStockReport.id.trim() !== '') {
                const filtered = stockUpdates.filter(u => u.invoice_id === selectedInvoiceForStockReport.id);
                console.log('[StockReportDialog] Using filtered stockUpdates from invoice', { 
                  invoiceId: selectedInvoiceForStockReport.id,
                  count: filtered.length, 
                  filtered 
                });
                return filtered;
              } else {
                // Fallback pour compatibilité avec anciennes données (ne devrait plus arriver)
                console.warn('[StockReportDialog] No invoice ID, using fallback logic');
                if (stockUpdatesFromHistory.length > 0) {
                  return stockUpdatesFromHistory;
                }
                if (stockUpdatesForDialog.length > 0) {
                  return stockUpdatesForDialog;
                }
                if (recentStockUpdatesWithoutInvoice.length > 0) {
                  return recentStockUpdatesWithoutInvoice;
                }
                return [];
              }
            })()}
            invoice={selectedInvoiceForStockReport}
          />
        )}

        {/* Draft Recovery Dialog */}
        <DraftRecoveryDialog
          open={draftRecoveryOpen}
          onOpenChange={setDraftRecoveryOpen}
          onResume={handleResumeDraft}
          onDiscard={handleDiscardDraft}
          draftDate={draftDate}
        />

        {client && selectedCreditNote && (() => {
          const relatedInvoice = globalInvoices.find(inv => inv.id === selectedCreditNote.invoice_id);
          if (!relatedInvoice) return null;
          return (
            <CreditNoteDialog
              open={creditNotePreviewDialogOpen}
              onOpenChange={setCreditNotePreviewDialogOpen}
              client={client}
              creditNote={selectedCreditNote}
              invoice={relatedInvoice}
            />
          );
        })()}

        {/* Vacation Period Dialog */}
        <Dialog open={vacationPeriodDialogOpen} onOpenChange={(open) => {
          setVacationPeriodDialogOpen(open);
          if (!open) resetVacationPeriodDialog();
        }}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>
                {editingVacationPeriod ? 'Modifier une période de fermeture' : 'Ajouter une période de fermeture'}
              </DialogTitle>
              <DialogDescription>
                Choisissez le type de période et le format de saisie.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Type de période */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Type de période</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={vacationPeriodType === 'specific' ? 'default' : 'outline'}
                    onClick={() => setVacationPeriodType('specific')}
                    className="flex-1"
                  >
                    Ponctuel
                  </Button>
                  <Button
                    type="button"
                    variant={vacationPeriodType === 'recurring' ? 'default' : 'outline'}
                    onClick={() => setVacationPeriodType('recurring')}
                    className="flex-1"
                  >
                    Annuel
                  </Button>
                </div>
              </div>

              {/* Format de saisie */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Format de saisie</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={vacationPeriodInputType === 'dates' ? 'default' : 'outline'}
                    onClick={() => setVacationPeriodInputType('dates')}
                    className="flex-1"
                  >
                    Dates précises
                  </Button>
                  <Button
                    type="button"
                    variant={vacationPeriodInputType === 'weeks' ? 'default' : 'outline'}
                    onClick={() => setVacationPeriodInputType('weeks')}
                    className="flex-1"
                  >
                    Semaines (S1 à S52)
                  </Button>
                </div>
              </div>

              {/* Année (seulement pour période spécifique avec saisie par semaines) */}
              {vacationPeriodType === 'specific' && vacationPeriodInputType === 'weeks' && (
                <div>
                  <Label htmlFor="vacation-year">Année</Label>
                  <Input
                    id="vacation-year"
                    type="number"
                    min="2000"
                    max="2100"
                    value={tempVacationYear}
                    onChange={(e) => setTempVacationYear(e.target.value)}
                    className="mt-1.5 w-32"
                    placeholder="2024"
                  />
                </div>
              )}

              {/* Saisie par semaines */}
              {vacationPeriodInputType === 'weeks' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-slate-600">Semaine de début</Label>
                      <Select
                        value={tempVacationStartWeek.toString()}
                        onValueChange={(val) => setTempVacationStartWeek(Number(val))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                            <SelectItem key={week} value={week.toString()}>
                              S{week}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm mt-6">à</span>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-600">Semaine de fin</Label>
                      <Select
                        value={tempVacationEndWeek.toString()}
                        onValueChange={(val) => setTempVacationEndWeek(Number(val))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                            <SelectItem key={week} value={week.toString()}>
                              S{week}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Saisie par dates */}
              {vacationPeriodInputType === 'dates' && (
                <div className="flex items-center gap-2">
                  <div>
                    <Label className="text-xs text-slate-600">Date de début</Label>
                    <Input
                      type="date"
                      value={tempVacationStartDate}
                      onChange={(e) => setTempVacationStartDate(e.target.value)}
                      className="mt-1 w-40"
                    />
                  </div>
                  <span className="text-sm mt-6">au</span>
                  <div>
                    <Label className="text-xs text-slate-600">Date de fin</Label>
                    <Input
                      type="date"
                      value={tempVacationEndDate}
                      onChange={(e) => setTempVacationEndDate(e.target.value)}
                      className="mt-1 w-40"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setVacationPeriodDialogOpen(false);
                resetVacationPeriodDialog();
              }}>
                Annuler
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveVacationPeriod}
                disabled={
                  savingVacationPeriod ||
                  (vacationPeriodInputType === 'weeks' && (!tempVacationStartWeek || !tempVacationEndWeek)) ||
                  (vacationPeriodInputType === 'dates' && (!tempVacationStartDate || !tempVacationEndDate)) ||
                  (vacationPeriodType === 'specific' && vacationPeriodInputType === 'weeks' && !tempVacationYear)
                }
              >
                {savingVacationPeriod ? 'Enregistrement...' : (editingVacationPeriod ? 'Modifier' : 'Ajouter')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
