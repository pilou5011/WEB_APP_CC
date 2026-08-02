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
import { Check, ChevronsUpDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type ProductLineRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  barcode?: string;
  quantity?: string;
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
  allowEmpty?: boolean;
  /** Scroll interne avec en-têtes fixes (comme Facturer dépôt) */
  scrollable?: boolean;
  /** En-têtes de colonnes plus compacts */
  compactHeader?: boolean;
};

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

  return (
    <TableRow ref={setNodeRef} style={style}>
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
            {row.product_id ? salesByProduct?.get(row.product_id)?.[year] ?? 0 : '-'}
          </TableCell>
        ))}
      <TableCell>
        {readOnly ? (
          <span className="text-sm">{row.product_name || '-'}</span>
        ) : (
          <Popover
            modal
            open={openPopovers[row.id] || false}
            onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [row.id]: open }))}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between" type="button">
                {row.product_name || 'Sélectionner un produit...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher un produit..." />
                <CommandList className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty>Aucun produit trouvé</CommandEmpty>
                  <CommandGroup>
                    {availableProducts.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={`${product.name} ${product.id}`}
                        onSelect={() => onSelectProduct(row.id, product.id)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            row.product_id === product.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {product.name}
                        {mode === 'delivery-note' ? '' : ` — ${product.price.toFixed(2)} €`}
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
          {readOnly ? (
            <span className="text-sm">{row.quantity ?? '0'}</span>
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
      {!readOnly && (
        <TableCell>
          <div className="flex justify-end">
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

export function ProductLinesEditor({
  rows,
  onChange,
  allProducts,
  mode,
  addButtonLabel = 'Ajouter un produit',
  readOnly = false,
  salesYears,
  salesByProduct,
  allowEmpty = false,
  scrollable = false,
  compactHeader = false,
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
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              product_id: productId,
              product_name: product.name,
              barcode: product.barcode || '',
            }
          : row
      )
    );
    setOpenPopovers((prev) => ({ ...prev, [rowId]: false }));
  };

  const handleQuantityChange = (rowId: string, value: string) => {
    onChange(rows.map((row) => (row.id === rowId ? { ...row, quantity: value } : row)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    onChange(arrayMove(rows, oldIndex, newIndex));
  };

  const salesColumnCount = mode === 'delivery-note' ? (salesYears?.length ?? 0) : 0;
  const totalColumns = 1 + salesColumnCount + 1 + (mode === 'delivery-note' ? 1 : 0) + (readOnly ? 0 : 1);

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
                      readOnly ? 'w-[45%]' : 'w-[30%]',
                      headCompactClass,
                      headStickyTopClass,
                      headerShadowClass
                    )}
                  >
                    Produit
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className={cn('w-[12%]', headCompactClass, headStickyTopClass, headerShadowClass)}
                  >
                    Quantité
                  </TableHead>
                  {!readOnly && (
                    <TableHead
                      rowSpan={2}
                      className={cn('w-[15%]', headCompactClass, headStickyTopClass, headerShadowClass)}
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
                    headCompactClass,
                    headStickyTopClass,
                    headerShadowClass
                  )}
                >
                  Produit
                </TableHead>
                {mode === 'delivery-note' && (
                  <TableHead
                    className={cn('w-[12%]', headCompactClass, headStickyTopClass, headerShadowClass)}
                  >
                    Quantité
                  </TableHead>
                )}
                {!readOnly && (
                  <TableHead
                    className={cn('w-[15%]', headCompactClass, headStickyTopClass, headerShadowClass)}
                  >
                    Actions
                  </TableHead>
                )}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {rows.map((row) => (
                <SortableEditorRow
                  key={row.id}
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
                />
              ))}
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
