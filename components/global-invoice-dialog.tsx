'use client';

import { Client, Invoice, StockUpdate, Collection } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Package, Euro, Printer } from 'lucide-react';

interface GlobalInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  invoice: Invoice;
  stockUpdates: StockUpdate[];
  collections: Collection[];
}

export function GlobalInvoiceDialog({
  open,
  onOpenChange,
  client,
  invoice,
  stockUpdates,
  collections
}: GlobalInvoiceDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Facture globale</DialogTitle>
        </DialogHeader>

        <div className="bg-white p-8 print:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">FACTURE GLOBALE</h1>
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
                    {new Date(invoice.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Heure : </span>
                  <span className="font-medium">
                    {new Date(invoice.created_at).toLocaleTimeString('fr-FR', {
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
            <h3 className="font-semibold text-slate-900 mb-4">Détail par collection</h3>
            <div className="space-y-4">
              {stockUpdates.map((update) => {
                const collection = collections.find(c => c.id === update.collection_id);
                const amount = update.cards_sold * (collection?.price || 0);
                
                return (
                  <div key={update.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {collection?.name || 'Collection inconnue'}
                        </p>
                        <p className="text-sm text-slate-500">
                          Prix unitaire : {(collection?.price || 0).toFixed(2)} €
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Montant</p>
                        <p className="text-lg font-bold text-slate-900">
                          {amount.toFixed(2)} €
                        </p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="p-2 text-slate-600">Stock précédent</td>
                            <td className="p-2 text-right font-medium">{update.previous_stock}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-600">Stock compté</td>
                            <td className="p-2 text-right font-medium">{update.counted_stock}</td>
                          </tr>
                          <tr className="bg-orange-50">
                            <td className="p-2 font-medium text-orange-900">Cartes vendues</td>
                            <td className="p-2 text-right font-bold text-orange-900">{update.cards_sold}</td>
                          </tr>
                          {update.cards_added > 0 && (
                            <>
                              <tr>
                                <td className="p-2 text-slate-600">Nouvelles cartes ajoutées</td>
                                <td className="p-2 text-right font-medium text-green-600">+{update.cards_added}</td>
                              </tr>
                              <tr className="bg-blue-50">
                                <td className="p-2 font-medium text-blue-900">Nouveau stock total</td>
                                <td className="p-2 text-right font-bold text-blue-900">{update.new_stock}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Récapitulatif de facturation
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-700">
                <span>Nombre de collections</span>
                <span className="font-medium">{stockUpdates.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Total cartes vendues</span>
                <span className="font-medium">{invoice.total_cards_sold}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-slate-900">Montant total dû</span>
                <span className="text-3xl font-bold text-slate-900">{invoice.total_amount.toFixed(2)} €</span>
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

