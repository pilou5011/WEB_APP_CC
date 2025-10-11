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

interface StockUpdateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  collectionUpdates: CollectionUpdate[];
  loading?: boolean;
}

export function StockUpdateConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  collectionUpdates,
  loading = false
}: StockUpdateConfirmationDialogProps) {
  const totalCardsSold = collectionUpdates.reduce((sum, item) => sum + item.cardsSold, 0);
  const totalAmount = collectionUpdates.reduce((sum, item) => sum + item.amount, 0);

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

            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Euro className="h-5 w-5" />
                <span className="text-sm font-medium">Montant total</span>
              </div>
              <p className="text-3xl font-bold text-green-900">{totalAmount.toFixed(2)} €</p>
            </div>
          </div>

          <Separator />

          {/* Collection details */}
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
                      <span className="text-slate-500 block mb-1">Cartes ajoutées</span>
                      <span className="font-semibold text-green-600">+{update.cardsAdded}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Nouveau stock</span>
                      <span className="font-semibold text-blue-600">{update.newStock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total summary */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Récapitulatif de facturation
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-700">
                <span>Nombre de collections mises à jour</span>
                <span className="font-medium">{collectionUpdates.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Total cartes vendues</span>
                <span className="font-medium">{totalCardsSold}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-slate-900">Montant total à facturer</span>
                <span className="text-3xl font-bold text-slate-900">{totalAmount.toFixed(2)} €</span>
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

