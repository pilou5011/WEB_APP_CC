'use client';

import React, { useMemo, useState } from 'react';
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
import { Check, ChevronsUpDown, Edit2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, SubProduct } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatPriceHt,
  formatPriceTtc,
  resolveEffectiveDeliveryNotePrices,
  type ClientProductPriceOverride,
} from '@/lib/delivery-notes/pricing';

export type ProductLineSubRow = {
  id: string;
  sub_product_id: string;
  sub_product_name: string;
  quantity: string;
};

export type ProductLineRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  barcode?: string;
  quantity?: string;
  subRows?: ProductLineSubRow[];
  /** Prix BL (personnalisé ou figé) */
  unit_price_ht?: number | null;
  recommended_sale_price_ttc?: number | null;
  unit_price_ht_is_custom?: boolean;
  recommended_sale_price_ttc_is_custom?: boolean;
};

type ProductLinesEditorProps = {
  rows: ProductLineRow[];
  onChange: (rows: ProductLineRow[]) => void;
  allProducts: Product[];
  /** template = produit seul ; delivery-note = produit + quantité */
  mode: 'template' | 'delivery-note';
  addButtonLabel?: string;
  readOnly?: boolean;
  salesYears?: number[];
  salesByProduct?: Map<string, Record<number, number>>;
  salesBySubProduct?: Map<string, Record<number, number>>;
  subProductsByProductId?: Map<string, SubProduct[]>;
  allowEmpty?: boolean;
  /** Scroll interne avec en-têtes fixes (comme Facturer dépôt) */
  scrollable?: boolean;
  /** En-têtes de colonnes plus compacts */
  compactHeader?: boolean;
  /** Affiche colonnes prix + stylet (BL uniquement) */
  showPrices?: boolean;
  /** true = brouillon (héritage live) ; false = validé/importé (figé) */
  pricesAreDraft?: boolean;
  /** Prix client Facturer (dépôt) par product_id */
  clientPriceOverrides?: Map<string, ClientProductPriceOverride>;
  onEditPrice?: (row: ProductLineRow) => void;
};

function parentQuantityFromSubs(subRows: ProductLineSubRow[] | undefined): string {
  if (!subRows || subRows.length === 0) return '0';
  const total = subRows.reduce((sum, sub) => {
    const parsed = parseInt(sub.quantity || '0', 10);
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  return String(total);
}

function salesForYear(
  row: ProductLineRow,
  year: number,
  salesByProduct?: Map<string, Record<number, number>>,
  salesBySubProduct?: Map<string, Record<number, number>>
): number | string {
  if (!row.product_id) return '-';
  if (row.subRows && row.subRows.length > 0) {
    return row.subRows.reduce(
      (sum, sub) => sum + (salesBySubProduct?.get(sub.sub_product_id)?.[year] ?? 0),
      0
    );
  }
  return salesByProduct?.get(row.product_id)?.[year] ?? 0;
}

const SALES_CELL_CLASS =
  'w-[18px] min-w-[18px] max-w-[18px] px-0 text-center text-xs tabular-nums text-slate-600';
const SALES_HEAD_CLASS =
  'w-[18px] min-w-[18px] max-w-[18px] px-0 text-center text-[10px] font-normal leading-tight text-slate-600';

function SortableEditorRow({
  row,
  mode,
  readOnly,
  allProducts,
  usedProductIds,
  openPopovers,
  setOpenPopovers,
  onSelectProduct,
  onQuantityChange,
  onDelete,
  salesYears,
  salesByProduct,
  salesBySubProduct,
  showPrices,
  pricesAreDraft,
  clientPriceOverrides,
  onEditPrice,
}: {
  row: ProductLineRow;
  mode: 'template' | 'delivery-note';
  readOnly?: boolean;
  allProducts: Product[];
  usedProductIds: Set<string>;
  openPopovers: Record<string, boolean>;
  setOpenPopovers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSelectProduct: (rowId: string, productId: string) => void;
  onQuantityChange: (rowId: string, value: string) => void;
  onDelete: (rowId: string) => void;
  salesYears?: number[];
  salesByProduct?: Map<string, Record<number, number>>;
  salesBySubProduct?: Map<string, Record<number, number>>;
  showPrices?: boolean;
  pricesAreDraft?: boolean;
  clientPriceOverrides?: Map<string, ClientProductPriceOverride>;
  onEditPrice?: (row: ProductLineRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const availableProducts = allProducts.filter(
    (p) => p.id === row.product_id || !usedProductIds.has(p.id)
  );
  const hasSubRows = mode === 'delivery-note' && (row.subRows?.length ?? 0) > 0;
  const parentQuantity = hasSubRows ? parentQuantityFromSubs(row.subRows) : (row.quantity ?? '');

  const product = row.product_id ? allProducts.find((p) => p.id === row.product_id) : null;
  const override = row.product_id ? clientPriceOverrides?.get(row.product_id) : undefined;
  const effectivePrices =
    showPrices && row.product_id
      ? resolveEffectiveDeliveryNotePrices({
          line: {
            unit_price_ht: row.unit_price_ht ?? null,
            recommended_sale_price_ttc: row.recommended_sale_price_ttc ?? null,
            unit_price_ht_is_custom: Boolean(row.unit_price_ht_is_custom),
            recommended_sale_price_ttc_is_custom: Boolean(row.recommended_sale_price_ttc_is_custom),
          },
          product: product
            ? {
                price: product.price,
                recommended_sale_price: product.recommended_sale_price,
              }
            : { price: 0, recommended_sale_price: null },
          clientOverride: override ?? null,
          isDraft: Boolean(pricesAreDraft),
        })
      : null;

  const priceLocked =
    Boolean(pricesAreDraft) && Boolean(effectivePrices?.lockedFromDeposit);

  return (
    <TableRow ref={setNodeRef} style={style} className={hasSubRows ? 'bg-slate-50' : undefined}>
      <TableCell className="w-10">
        {!readOnly && (
          <button type="button" className="cursor-grab text-slate-400" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      {mode === 'delivery-note' &&
        salesYears?.map((year) => (
          <TableCell key={year} className={SALES_CELL_CLASS}>
            {salesForYear(row, year, salesByProduct, salesBySubProduct)}
          </TableCell>
        ))}
      <TableCell className="min-w-0 overflow-hidden">
        {readOnly ? (
          <span
            className={cn('block truncate text-sm', hasSubRows && 'font-semibold')}
            title={row.product_name || undefined}
          >
            {row.product_name || '-'}
          </span>
        ) : (
          <Popover
            modal
            open={openPopovers[row.id] || false}
            onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [row.id]: open }))}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  'w-full min-w-0 max-w-full justify-between gap-2 overflow-hidden',
                  hasSubRows && 'font-semibold'
                )}
                type="button"
                title={row.product_name || undefined}
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {row.product_name || 'Sélectionner un produit...'}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher un produit..." />
                <CommandList className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty>Aucun produit trouvé</CommandEmpty>
                  <CommandGroup>
                    {availableProducts.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.id}`}
                        onSelect={() => onSelectProduct(row.id, p.id)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            row.product_id === p.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {p.name}
                        {mode === 'delivery-note' ? '' : ` — ${p.price.toFixed(2)} €`}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </TableCell>
      {mode === 'delivery-note' && (
        <TableCell>
          {readOnly || hasSubRows ? (
            <span
              className={cn(
                'flex h-9 w-full items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700',
                hasSubRows && 'font-medium'
              )}
            >
              {parentQuantity || '0'}
            </span>
          ) : (
            <Input
              type="text"
              inputMode="numeric"
              value={row.quantity ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  onQuantityChange(row.id, value);
                }
              }}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0"
              className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          )}
        </TableCell>
      )}
      {showPrices && (
        <>
          <TableCell className="text-center text-sm tabular-nums">
            {row.product_id && effectivePrices
              ? formatPriceHt(effectivePrices.cessionHt)
              : '-'}
          </TableCell>
          <TableCell className="text-center text-sm tabular-nums">
            {row.product_id && effectivePrices
              ? formatPriceTtc(effectivePrices.recommendedTtc)
              : '-'}
          </TableCell>
        </>
      )}
      {!readOnly && (
        <TableCell>
          <div className="flex justify-end gap-1">
            {showPrices && row.product_id && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className={cn(
                  'h-8 w-8 p-0',
                  priceLocked
                    ? 'text-slate-300 hover:text-slate-300 hover:bg-transparent'
                    : 'text-slate-600 hover:text-[#0B1F33]'
                )}
                title={
                  priceLocked
                    ? 'Prix défini dans Facturer (dépôt)'
                    : 'Modifier le prix'
                }
                aria-disabled={priceLocked}
                onClick={() => {
                  if (priceLocked) {
                    toast.error(
                      'Le prix de ce produit est déjà défini dans Facturer (dépôt). Il ne peut pas être modifié depuis le bon de livraison.'
                    );
                    return;
                  }
                  onEditPrice?.(row);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Supprimer la ligne"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

function SubProductEditorRow({
  parentRowId,
  subRow,
  readOnly,
  salesYears,
  salesBySubProduct,
  actionColumn,
  showPrices,
  parentCessionHt,
  parentRecommendedTtc,
  onQuantityChange,
}: {
  parentRowId: string;
  subRow: ProductLineSubRow;
  readOnly?: boolean;
  salesYears?: number[];
  salesBySubProduct?: Map<string, Record<number, number>>;
  actionColumn: boolean;
  showPrices?: boolean;
  parentCessionHt: number | null;
  parentRecommendedTtc: number | null;
  onQuantityChange: (parentRowId: string, subProductId: string, value: string) => void;
}) {
  return (
    <TableRow className="bg-white">
      <TableCell className="w-10" />
      {salesYears?.map((year) => (
        <TableCell key={year} className={SALES_CELL_CLASS}>
          {salesBySubProduct?.get(subRow.sub_product_id)?.[year] ?? 0}
        </TableCell>
      ))}
      <TableCell>
        <span className="pl-6 text-sm text-slate-700">└ {subRow.sub_product_name}</span>
      </TableCell>
      <TableCell>
        {readOnly ? (
          <span className="text-sm">{subRow.quantity || '0'}</span>
        ) : (
          <Input
            type="text"
            inputMode="numeric"
            value={subRow.quantity}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                onQuantityChange(parentRowId, subRow.sub_product_id, value);
              }
            }}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="0"
            className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        )}
      </TableCell>
      {showPrices && (
        <>
          <TableCell className="text-center text-xs tabular-nums text-slate-600">
            {parentCessionHt != null ? formatPriceHt(parentCessionHt) : '-'}
          </TableCell>
          <TableCell className="text-center text-xs tabular-nums text-slate-600">
            {formatPriceTtc(parentRecommendedTtc)}
          </TableCell>
        </>
      )}
      {actionColumn && <TableCell />}
    </TableRow>
  );
}

export function ProductLinesEditor({
  rows,
  onChange,
  allProducts,
  mode,
  addButtonLabel = 'Ajouter un produit',
  readOnly = false,
  salesYears,
  salesByProduct,
  salesBySubProduct,
  subProductsByProductId,
  allowEmpty = false,
  scrollable = false,
  compactHeader = false,
  showPrices = false,
  pricesAreDraft = true,
  clientPriceOverrides,
  onEditPrice,
}: ProductLinesEditorProps) {
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const usedProductIds = useMemo(() => {
    return new Set(rows.map((r) => r.product_id).filter(Boolean) as string[]);
  }, [rows]);

  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    onChange([
      ...rows,
      {
        id: newId,
        product_id: null,
        product_name: '',
        barcode: '',
        quantity: mode === 'delivery-note' ? '0' : undefined,
        unit_price_ht: null,
        recommended_sale_price_ttc: null,
        unit_price_ht_is_custom: false,
        recommended_sale_price_ttc_is_custom: false,
      },
    ]);
  };

  const handleDeleteRow = (rowId: string) => {
    if (!allowEmpty && rows.length === 1) {
      toast.error('Au moins une ligne est requise');
      return;
    }
    onChange(rows.filter((row) => row.id !== rowId));
  };

  const handleSelectProduct = (rowId: string, productId: string) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;

    if (rows.some((r) => r.id !== rowId && r.product_id === productId)) {
      toast.error('Ce produit est déjà présent dans la liste');
      return;
    }

    onChange(
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const catalogSubs = mode === 'delivery-note' ? (subProductsByProductId?.get(productId) ?? []) : [];
        const subRows: ProductLineSubRow[] = catalogSubs.map((sp) => ({
          id: `${rowId}-sub-${sp.id}`,
          sub_product_id: sp.id,
          sub_product_name: sp.name,
          quantity: '0',
        }));
        return {
          ...row,
          product_id: productId,
          product_name: product.name,
          barcode: product.barcode || '',
          subRows,
          quantity: subRows.length > 0 ? parentQuantityFromSubs(subRows) : row.quantity ?? '0',
          // Nouveau produit : hérite (pas custom)
          unit_price_ht: null,
          recommended_sale_price_ttc: null,
          unit_price_ht_is_custom: false,
          recommended_sale_price_ttc_is_custom: false,
        };
      })
    );
    setOpenPopovers((prev) => ({ ...prev, [rowId]: false }));
  };

  const handleQuantityChange = (rowId: string, value: string) => {
    onChange(rows.map((row) => (row.id === rowId ? { ...row, quantity: value } : row)));
  };

  const handleSubQuantityChange = (parentRowId: string, subProductId: string, value: string) => {
    onChange(
      rows.map((row) => {
        if (row.id !== parentRowId || !row.subRows) return row;
        const subRows = row.subRows.map((sub) =>
          sub.sub_product_id === subProductId ? { ...sub, quantity: value } : sub
        );
        return {
          ...row,
          subRows,
          quantity: parentQuantityFromSubs(subRows),
        };
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    onChange(arrayMove(rows, oldIndex, newIndex));
  };

  const salesColumnCount = mode === 'delivery-note' ? (salesYears?.length ?? 0) : 0;
  const priceColumnCount = showPrices ? 2 : 0;
  const totalColumns =
    1 + salesColumnCount + 1 + (mode === 'delivery-note' ? 1 : 0) + priceColumnCount + (readOnly ? 0 : 1);

  const headCompactClass = compactHeader ? 'h-7 py-0.5 px-2' : '';
  const yearHeadCompactClass = compactHeader ? 'h-6 py-0 px-0' : headCompactClass;
  const headStickyTopClass = scrollable ? 'sticky top-0 z-10 bg-slate-50' : '';
  const headStickyYearClass = scrollable
    ? compactHeader
      ? 'sticky top-7 z-10 bg-slate-50'
      : 'sticky top-12 z-10 bg-slate-50'
    : '';
  const headerBgClass = scrollable ? 'bg-slate-50' : '';
  const headerShadowClass = scrollable ? 'shadow-sm' : '';

  const blHeaderClass = 'text-center text-xs font-semibold';

  const priceHeads = showPrices ? (
    <>
      <TableHead
        rowSpan={2}
        className={cn(
          'w-[12%]',
          blHeaderClass,
          headCompactClass,
          headStickyTopClass,
          headerShadowClass
        )}
      >
        Prix de cession (HT)
      </TableHead>
      <TableHead
        rowSpan={2}
        className={cn(
          'w-[12%]',
          blHeaderClass,
          headCompactClass,
          headStickyTopClass,
          headerShadowClass
        )}
      >
        Prix de vente conseillé (TTC)
      </TableHead>
    </>
  ) : null;

  const priceHeadsSimple = showPrices ? (
    <>
      <TableHead
        className={cn(
          'w-[12%]',
          blHeaderClass,
          headCompactClass,
          headStickyTopClass,
          headerShadowClass
        )}
      >
        Prix de cession (HT)
      </TableHead>
      <TableHead
        className={cn(
          'w-[12%]',
          blHeaderClass,
          headCompactClass,
          headStickyTopClass,
          headerShadowClass
        )}
      >
        Prix de vente conseillé (TTC)
      </TableHead>
    </>
  ) : null;

  return (
    <div
      className={cn(
        'border border-slate-200 rounded-lg',
        scrollable ? 'max-h-[600px] overflow-auto' : 'overflow-hidden'
      )}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table noWrapper={scrollable} className="table-fixed w-full">
          <TableHeader className={cn(scrollable && 'shadow-sm')}>
            {mode === 'delivery-note' && salesYears && salesYears.length > 0 ? (
              <>
                <TableRow className={headerBgClass}>
                  <TableHead
                    rowSpan={2}
                    className={cn('w-10', headCompactClass, headStickyTopClass, headerShadowClass)}
                  />
                  <TableHead
                    colSpan={salesYears.length}
                    className={cn(
                      'text-center border-b-0 text-xs font-medium px-0.5',
                      headCompactClass,
                      headStickyTopClass,
                      headerShadowClass
                    )}
                  >
                    Stocks vendus
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className={cn(
                      readOnly ? 'w-[30%]' : 'w-[22%]',
                      blHeaderClass,
                      headCompactClass,
                      headStickyTopClass,
                      headerShadowClass
                    )}
                  >
                    Produit
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className={cn(
                      'w-[10%]',
                      blHeaderClass,
                      headCompactClass,
                      headStickyTopClass,
                      headerShadowClass
                    )}
                  >
                    Quantité
                  </TableHead>
                  {priceHeads}
                  {!readOnly && (
                    <TableHead
                      rowSpan={2}
                      className={cn(
                        'w-[12%]',
                        blHeaderClass,
                        headCompactClass,
                        headStickyTopClass,
                        headerShadowClass
                      )}
                    >
                      Actions
                    </TableHead>
                  )}
                </TableRow>
                <TableRow className={headerBgClass}>
                  {salesYears.map((year) => (
                    <TableHead
                      key={year}
                      className={cn(SALES_HEAD_CLASS, yearHeadCompactClass, headStickyYearClass, headerShadowClass)}
                    >
                      {year}
                    </TableHead>
                  ))}
                </TableRow>
              </>
            ) : (
              <TableRow className={headerBgClass}>
                <TableHead
                  className={cn('w-10', headCompactClass, headStickyTopClass, headerShadowClass)}
                />
                <TableHead
                  className={cn(
                    mode === 'template' ? 'w-[70%]' : 'w-[25%]',
                    mode === 'delivery-note' ? blHeaderClass : '',
                    headCompactClass,
                    headStickyTopClass,
                    headerShadowClass
                  )}
                >
                  Produit
                </TableHead>
                {mode === 'delivery-note' && (
                  <TableHead
                    className={cn(
                      'w-[12%]',
                      blHeaderClass,
                      headCompactClass,
                      headStickyTopClass,
                      headerShadowClass
                    )}
                  >
                    Quantité
                  </TableHead>
                )}
                {priceHeadsSimple}
                {!readOnly && (
                  <TableHead
                    className={cn(
                      'w-[15%]',
                      mode === 'delivery-note' ? blHeaderClass : '',
                      headCompactClass,
                      headStickyTopClass,
                      headerShadowClass
                    )}
                  >
                    Actions
                  </TableHead>
                )}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {rows.map((row) => {
                const product = row.product_id
                  ? allProducts.find((p) => p.id === row.product_id)
                  : null;
                const override = row.product_id
                  ? clientPriceOverrides?.get(row.product_id)
                  : undefined;
                const parentEffective =
                  showPrices && row.product_id
                    ? resolveEffectiveDeliveryNotePrices({
                        line: {
                          unit_price_ht: row.unit_price_ht ?? null,
                          recommended_sale_price_ttc: row.recommended_sale_price_ttc ?? null,
                          unit_price_ht_is_custom: Boolean(row.unit_price_ht_is_custom),
                          recommended_sale_price_ttc_is_custom: Boolean(
                            row.recommended_sale_price_ttc_is_custom
                          ),
                        },
                        product: product
                          ? {
                              price: product.price,
                              recommended_sale_price: product.recommended_sale_price,
                            }
                          : { price: 0, recommended_sale_price: null },
                        clientOverride: override ?? null,
                        isDraft: Boolean(pricesAreDraft),
                      })
                    : null;

                return (
                  <React.Fragment key={row.id}>
                    <SortableEditorRow
                      row={row}
                      mode={mode}
                      readOnly={readOnly}
                      allProducts={allProducts}
                      usedProductIds={usedProductIds}
                      openPopovers={openPopovers}
                      setOpenPopovers={setOpenPopovers}
                      onSelectProduct={handleSelectProduct}
                      onQuantityChange={handleQuantityChange}
                      onDelete={handleDeleteRow}
                      salesYears={salesYears}
                      salesByProduct={salesByProduct}
                      salesBySubProduct={salesBySubProduct}
                      showPrices={showPrices}
                      pricesAreDraft={pricesAreDraft}
                      clientPriceOverrides={clientPriceOverrides}
                      onEditPrice={onEditPrice}
                    />
                    {mode === 'delivery-note' &&
                      row.subRows?.map((subRow) => (
                        <SubProductEditorRow
                          key={subRow.id}
                          parentRowId={row.id}
                          subRow={subRow}
                          readOnly={readOnly}
                          salesYears={salesYears}
                          salesBySubProduct={salesBySubProduct}
                          actionColumn={!readOnly}
                          showPrices={showPrices}
                          parentCessionHt={parentEffective?.cessionHt ?? null}
                          parentRecommendedTtc={parentEffective?.recommendedTtc ?? null}
                          onQuantityChange={handleSubQuantityChange}
                        />
                      ))}
                  </React.Fragment>
                );
              })}
            </SortableContext>
            {!readOnly && (
              <TableRow className="bg-slate-50">
                <TableCell colSpan={totalColumns}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    type="button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addButtonLabel}
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}
