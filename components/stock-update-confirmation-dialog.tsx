'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Euro, Package, TrendingDown } from 'lucide-react';
import { Collection } from '@/lib/supabase';

interface CollectionUpdate {
  collection: Collection;
  previousStock: number;
  countedStock: number;
  cardsSold: number;
  cardsAdded: number;
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
  onConfirm: () => void;
  collectionUpdates: CollectionUpdate[];
  pendingAdjustments?: PendingAdjustment[];
  loading?: boolean;
}

export function StockUpdateConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  collectionUpdates,
  pendingAdjustments = [],
  loading = false
}: StockUpdateConfirmationDialogProps) {
  const totalCardsSold = collectionUpdates.reduce((sum, item) => sum + item.cardsSold, 0);
  const collectionsAmount = collectionUpdates.reduce((sum, item) => sum + item.amount, 0);
  
  // Calcul du total des ajustements (reprises de stock)
  const adjustmentsTotal = pendingAdjustments.reduce((sum, adj) => {
    const unitPrice = parseFloat(adj.unit_price);
    const quantity = parseInt(adj.quantity);
    if (isNaN(unitPrice) || isNaN(quantity)) return sum;
    return sum + (unitPrice * quantity);
  }, 0);
  
  const totalAmount = collectionsAmount + adjustmentsTotal;

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
                <span className="text-sm font-medium">Total cartes vendues</span>
              </div>
              <p className="text-3xl font-bold text-orange-900">{totalCardsSold}</p>
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

          {/* Collection details */}
          {collectionUpdates.length > 0 && (
            <>
              <div>
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Détail par collection
                </h3>
                <div className="space-y-3">
                  {collectionUpdates.map((update, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-lg p-4 bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{update.collection.name}</p>
                          <p className="text-sm text-slate-500">
                            Prix unitaire : {update.effectivePrice.toFixed(2)} €
                            {update.isCustomPrice && <span className="ml-1 text-blue-600">(personnalisé)</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Montant</p>
                          <p className="text-xl font-bold text-slate-900">
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
                          <span className="text-slate-500 block mb-1">Cartes vendues</span>
                          <span className="font-semibold text-orange-600">{update.cardsSold}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Nouveau dépôt</span>
                          <span className="font-semibold text-blue-600">{update.newStock}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Cartes ajoutées</span>
                          <span className="font-semibold text-green-600">+{update.cardsAdded}</span>
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
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
                            <p className="font-semibold text-slate-900">{adj.operation_name}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {quantity} carte{quantity > 1 ? 's' : ''} × {unitPrice.toFixed(2)} €
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
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Récapitulatif de facturation
            </h3>
            <div className="space-y-3">
              {collectionUpdates.length > 0 && (
                <>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Nombre de collections mises à jour</span>
                    <span className="font-medium">{collectionUpdates.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Total cartes vendues</span>
                    <span className="font-medium">{totalCardsSold}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Montant ventes</span>
                    <span className="font-medium">{collectionsAmount.toFixed(2)} €</span>
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
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-slate-900">Montant total à facturer</span>
                <span className={`text-3xl font-bold ${totalAmount < 0 ? 'text-red-700' : 'text-slate-900'}`}>
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
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Confirmer et enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

