'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, StockUpdate } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Package, TrendingDown, TrendingUp, Euro, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceDialog } from '@/components/invoice-dialog';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<StockUpdate | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    counted_stock: '',
    cards_added: ''
  });

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!clientData) {
        toast.error('Client non trouvé');
        router.push('/clients');
        return;
      }

      setClient(clientData);

      const { data: updatesData, error: updatesError } = await supabase
        .from('stock_updates')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setStockUpdates(updatesData || []);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setSubmitting(true);

    try {
      const countedStock = parseInt(formData.counted_stock);
      const cardsAdded = parseInt(formData.cards_added) || 0;

      if (isNaN(countedStock) || countedStock < 0) {
        toast.error('Le stock compté doit être un nombre positif');
        return;
      }

      if (isNaN(cardsAdded) || cardsAdded < 0) {
        toast.error('Les cartes ajoutées doivent être un nombre positif');
        return;
      }

      const previousStock = client.current_stock;
      const cardsSold = Math.max(0, previousStock - countedStock);
      const newStock = countedStock + cardsAdded;

      const { error: updateError } = await supabase
        .from('stock_updates')
        .insert([{
          client_id: clientId,
          previous_stock: previousStock,
          counted_stock: countedStock,
          cards_sold: cardsSold,
          cards_added: cardsAdded,
          new_stock: newStock
        }]);

      if (updateError) throw updateError;

      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (clientUpdateError) throw clientUpdateError;

      toast.success('Stock mis à jour avec succès');
      setFormData({ counted_stock: '', cards_added: '' });
      await loadClientData();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour du stock');
    } finally {
      setSubmitting(false);
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

  const cardsSold = client.initial_stock - client.current_stock;
  const amountDue = cardsSold * 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/clients')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux clients
        </Button>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-3xl">{client.name}</CardTitle>
              <CardDescription className="flex items-start gap-1.5 mt-2 text-base">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>{client.address}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/*                 <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Package className="h-5 w-5" />
                    <span className="text-sm font-medium">Stock initial</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{client.initial_stock}</p>
                </div> */}

                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Stock actuel</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{client.current_stock}</p>
                </div>

{/*                 <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <TrendingDown className="h-5 w-5" />
                    <span className="text-sm font-medium">Cartes vendues</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-900">{cardsSold}</p>
                </div> */}
              </div>

              <Separator className="my-6" />

{/* {              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Résumé de facturation
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Cartes vendues</span>
                    <span className="font-semibold text-slate-900">{cardsSold}</span>
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
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Mise à jour du stock</CardTitle>
              <CardDescription>
                Comptez le stock restant et ajoutez les nouvelles cartes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="counted_stock">Nouveau stock compté</Label>
                    <Input
                      id="counted_stock"
                      type="number"
                      min="0"
                      value={formData.counted_stock}
                      onChange={(e) => setFormData({ ...formData, counted_stock: e.target.value })}
                      required
                      placeholder="Ex: 80"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Nombre de cartes actuellement en stock
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cards_added">Nouvelles cartes ajoutées</Label>
                    <Input
                      id="cards_added"
                      type="number"
                      min="0"
                      value={formData.cards_added}
                      onChange={(e) => setFormData({ ...formData, cards_added: e.target.value })}
                      placeholder="Ex: 50"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Nouvelles cartes déposées (optionnel)
                    </p>
                  </div>

                          {/* Nouveau champ pour la date */}
{/*                   <div>
                    <Label htmlFor="update_date">Date de mise à jour</Label>
                    <Input
                      id="update_date"
                      type="date"
                      value={formData.update_date}
                      onChange={(e) => setFormData({ ...formData, update_date: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Par défaut : aujourd'hui
                    </p>
                  </div>*/}

                  
                </div> 

                <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                  {submitting ? 'Mise à jour...' : 'Mettre à jour le stock'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {stockUpdates.length > 0 && (
            <Card className="border-slate-200 shadow-md">
              <CardHeader>
                <CardTitle>Historique des mises à jour</CardTitle>
                <CardDescription>
                  {stockUpdates.length} mise{stockUpdates.length > 1 ? 's' : ''} à jour enregistrée{stockUpdates.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stockUpdates.map((update) => (
                    <div
                      key={update.id}
                      className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm text-slate-500">
                          {new Date(update.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(update);
                            setInvoiceDialogOpen(true);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Voir facture
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 block mb-1">Stock précédent</span>
                          <span className="font-semibold">{update.previous_stock}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Stock compté</span>
                          <span className="font-semibold">{update.counted_stock}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Cartes vendues</span>
                          <span className="font-semibold text-orange-600">{update.cards_sold}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Cartes ajoutées</span>
                          <span className="font-semibold text-green-600">+{update.cards_added}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Nouveau stock</span>
                          <span className="font-semibold text-blue-600">{update.new_stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {client && selectedInvoice && (
          <InvoiceDialog
            open={invoiceDialogOpen}
            onOpenChange={setInvoiceDialogOpen}
            client={client}
            stockUpdate={selectedInvoice}
          />
        )}
      </div>
    </div>
  );
}