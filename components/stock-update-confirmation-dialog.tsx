'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Euro, Package, TrendingDown, Percent } from 'lucide-react';
import { Product } from '@/lib/supabase';

interface ProductUpdate {
  Product: Product;
  previousStock: number;
  countedStock: number;
  stockSold: number;
  stockAdded: number;
  newStock: number;
  amount: number;
  effectivePrice: number;
  isCustomPrice: boolean;
}

interface PendingAdjustment {
  operation_name: string;
  unit_price: string;
  quantity: string;
}

interface StockUpdateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (discountPercentage?: number) => void;
  productUpdates: ProductUpdate[];
  pendingAdjustments?: PendingAdjustment[];
  loading?: boolean;
}

export function StockUpdateConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  productUpdates,
  pendingAdjustments = [],
  loading = false
}: StockUpdateConfirmationDialogProps) {
  const [discountPercentage, setDiscountPercentage] = useState<string>('');
  
  // Réinitialiser la remise quand le dialogue s'ouvre
  useEffect(() => {
    if (open) {
      setDiscountPercentage('');
    }
  }, [open]);
  
  const totalStockSold = productUpdates.reduce((sum, item) => sum + item.stockSold, 0);
  const productsAmount = productUpdates.reduce((sum, item) => sum + item.amount, 0);
  
  // Calcul du total des ajustements (reprises de stock)
  const adjustmentsTotal = pendingAdjustments.reduce((sum, adj) => {
    const unitPrice = parseFloat(adj.unit_price);
    const quantity = parseInt(adj.quantity);
    if (isNaN(unitPrice) || isNaN(quantity)) return sum;
    return sum + (unitPrice * quantity);
  }, 0);
  
  const totalAmountBeforeDiscount = productsAmount + adjustmentsTotal;
  
  // Calcul de la remise
  const discountValue = discountPercentage ? parseFloat(discountPercentage) : 0;
  const discountAmount = discountValue > 0 && discountValue <= 100 
    ? (totalAmountBeforeDiscount * discountValue / 100) 
    : 0;
  
  const totalAmount = totalAmountBeforeDiscount - discountAmount;
  
  const handleConfirm = () => {
    const discount = discountPercentage ? parseFloat(discountPercentage) : undefined;
    onConfirm(discount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Résumé de la facturation</DialogTitle>
          <DialogDescription>
            Vérifiez les détails avant de valider la mise à jour du stock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <TrendingDown className="h-5 w-5" />
                <span className="text-sm font-medium">Total stock vendu</span>
              </div>
              <p className="text-3xl font-bold text-orange-900">{totalStockSold}</p>
            </div>

            <div className={`rounded-lg p-4 border ${totalAmount < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className={`flex items-center gap-2 mb-2 ${totalAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                <Euro className="h-5 w-5" />
                <span className="text-sm font-medium">Montant total</span>
              </div>
              <p className={`text-3xl font-bold ${totalAmount < 0 ? 'text-red-900' : 'text-green-900'}`}>
                {totalAmount.toFixed(2)} €
              </p>
            </div>
          </div>

          <Separator />

          {/* Remise commerciale */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-3">
              <Percent className="h-5 w-5" />
              <h3 className="font-semibold">Remise commerciale</h3>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="discount" className="text-sm text-slate-600">
                  Pourcentage de remise (%)
                </Label>
                <Input
                  id="discount"
                  type="text"
                  inputMode="decimal"
                  value={discountPercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permettre les nombres décimaux entre 0 et 100
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const numValue = parseFloat(value);
                      if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
                        setDiscountPercentage(value);
                      }
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className="mt-1.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              {discountAmount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-slate-500">Montant de la remise</p>
                  <p className="text-xl font-bold text-blue-700">
                    -{discountAmount.toFixed(2)} €
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Product details */}
          {productUpdates.length > 0 && (
            <>
              <div>
                <h3 className="font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Détail par Product
                </h3>
                <div className="space-y-3">
                  {productUpdates.map((update, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-lg p-4 bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-[#0B1F33]">{update.Product.name}</p>
                          <p className="text-sm text-slate-500">
                            Prix unitaire : {update.effectivePrice.toFixed(2)} €
                            {update.isCustomPrice && <span className="ml-1 text-blue-600">(personnalisé)</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Montant</p>
                          <p className="text-xl font-bold text-[#0B1F33]">
                            {update.amount.toFixed(2)} €
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 block mb-1">Stock précédent</span>
                          <span className="font-semibold">{update.previousStock}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Stock compté</span>
                          <span className="font-semibold">{update.countedStock}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Stock vendu</span>
                          <span className="font-semibold text-orange-600">{update.stockSold}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Nouveau dépôt</span>
                          <span className="font-semibold text-blue-600">{update.newStock}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Stock ajouté</span>
                          <span className="font-semibold text-green-600">+{update.stockAdded}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Adjustments (reprises de stock) */}
          {pendingAdjustments.length > 0 && (
            <>
              <div>
                <h3 className="font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Reprises de stock
                </h3>
                <div className="space-y-3">
                  {pendingAdjustments.map((adj, index) => {
                    const unitPrice = parseFloat(adj.unit_price);
                    const quantity = parseInt(adj.quantity);
                    const total = unitPrice * quantity;
                    return (
                      <div
                        key={index}
                        className="border border-red-200 rounded-lg p-4 bg-red-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-[#0B1F33]">{adj.operation_name}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {quantity} unité{quantity > 1 ? 's' : ''} × {unitPrice.toFixed(2)} €
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Montant</p>
                            <p className="text-xl font-bold text-red-700">
                              {total.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Total summary */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Récapitulatif de facturation
            </h3>
            <div className="space-y-3">
              {productUpdates.length > 0 && (
                <>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Nombre de Produits mises à jour</span>
                    <span className="font-medium">{productUpdates.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Total stock vendu</span>
                    <span className="font-medium">{totalStockSold}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Montant ventes</span>
                    <span className="font-medium">{productsAmount.toFixed(2)} €</span>
                  </div>
                </>
              )}
              {pendingAdjustments.length > 0 && (
                <>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Nombre de reprises de stock</span>
                    <span className="font-medium">{pendingAdjustments.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-700">
                    <span>Montant reprises</span>
                    <span className="font-medium">{adjustmentsTotal.toFixed(2)} €</span>
                  </div>
                </>
              )}
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Montant avant remise</span>
                    <span className="font-medium">{totalAmountBeforeDiscount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-700">
                    <span>Remise ({discountValue}%)</span>
                    <span className="font-medium">-{discountAmount.toFixed(2)} €</span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-[#0B1F33]">Montant total à facturer</span>
                <span className={`text-3xl font-bold ${totalAmount < 0 ? 'text-red-700' : 'text-[#0B1F33]'}`}>
                  {totalAmount.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Confirmer et enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

