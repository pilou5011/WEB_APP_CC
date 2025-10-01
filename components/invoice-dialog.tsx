'use client';

import { Client, StockUpdate } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Package, Euro, Printer } from 'lucide-react';

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  stockUpdate: StockUpdate;
}

const CARD_PRICE = 2;

export function InvoiceDialog({ open, onOpenChange, client, stockUpdate }: InvoiceDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalAmount = stockUpdate.cards_sold * CARD_PRICE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Bon de facturation</DialogTitle>
        </DialogHeader>

        <div className="bg-white p-8 print:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">BON DE FACTURATION</h1>
            <p className="text-slate-600">Dépôt-vente de cartes de vœux</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informations client
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Nom : </span>
                  <span className="font-medium">{client.name}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{client.address}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Détails de l'opération
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Date : </span>
                  <span className="font-medium">
                    {new Date(stockUpdate.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Heure : </span>
                  <span className="font-medium">
                    {new Date(stockUpdate.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Détail du stock</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-700">Description</th>
                    <th className="text-right p-3 font-medium text-slate-700">Quantité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 text-slate-600">Stock précédent</td>
                    <td className="p-3 text-right font-medium">{stockUpdate.previous_stock}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-600">Stock compté lors de l'inventaire</td>
                    <td className="p-3 text-right font-medium">{stockUpdate.counted_stock}</td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="p-3 font-medium text-orange-900">Cartes vendues</td>
                    <td className="p-3 text-right font-bold text-orange-900">{stockUpdate.cards_sold}</td>
                  </tr>
                  {stockUpdate.cards_added > 0 && (
                    <>
                      <tr>
                        <td className="p-3 text-slate-600">Nouvelles cartes ajoutées</td>
                        <td className="p-3 text-right font-medium text-green-600">+{stockUpdate.cards_added}</td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td className="p-3 font-medium text-blue-900">Nouveau stock total</td>
                        <td className="p-3 text-right font-bold text-blue-900">{stockUpdate.new_stock}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Calcul de facturation
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-700">
                <span>Cartes vendues</span>
                <span className="font-medium">{stockUpdate.cards_sold}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Prix unitaire</span>
                <span className="font-medium">{CARD_PRICE.toFixed(2)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-slate-900">Montant total dû</span>
                <span className="text-3xl font-bold text-slate-900">{totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            <p>Document généré automatiquement le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}