'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, StockUpdate, Collection, ClientCollection } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Package, TrendingDown, TrendingUp, Euro, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceDialog } from '@/components/invoice-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [clientCollections, setClientCollections] = useState<(ClientCollection & { collection?: Collection })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<StockUpdate | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Form per collection: { [clientCollectionId]: { counted_stock, cards_added } }
  const [perCollectionForm, setPerCollectionForm] = useState<Record<string, { counted_stock: string; cards_added: string }>>({});

  // Association form
  const [associateForm, setAssociateForm] = useState<{ collection_id: string | null; initial_stock: string }>({
    collection_id: null,
    initial_stock: ''
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

      // Load all collections (for association selector)
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .order('name');

      if (collectionsError) throw collectionsError;
      setAllCollections(collectionsData || []);

      // Load client collections with related collection
      const { data: ccData, error: ccError } = await supabase
        .from('client_collections')
        .select('*, collection:collections(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (ccError) throw ccError;
      const ccWithTyped = (ccData || []).map((row: any) => ({ ...row, collection: row.collection as Collection }));
      setClientCollections(ccWithTyped);

      // Initialize per-collection form defaults
      const initialForm: Record<string, { counted_stock: string; cards_added: string }> = {};
      ccWithTyped.forEach((cc) => {
        initialForm[cc.id] = { counted_stock: '', cards_added: '' };
      });
      setPerCollectionForm(initialForm);

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
      // For each associated collection, if user provided values, compute and persist
      const updatesToInsert: any[] = [];
      const ccUpdates: { id: string; new_stock: number }[] = [];

      for (const cc of clientCollections) {
        const form = perCollectionForm[cc.id];
        if (!form) continue;
        const hasAny = (form.counted_stock && form.counted_stock.trim() !== '') || (form.cards_added && form.cards_added.trim() !== '');
        if (!hasAny) continue;

        const countedStock = parseInt(form.counted_stock);
        const cardsAdded = parseInt(form.cards_added) || 0;

        if (isNaN(countedStock) || countedStock < 0) {
          toast.error(`Le stock compté doit être un nombre positif pour « ${cc.collection?.name || 'Collection'} »`);
          setSubmitting(false);
          return;
        }
        if (isNaN(cardsAdded) || cardsAdded < 0) {
          toast.error(`Les cartes ajoutées doivent être un nombre positif pour « ${cc.collection?.name || 'Collection'} »`);
          setSubmitting(false);
          return;
        }

        const previousStock = cc.current_stock;
        const cardsSold = Math.max(0, previousStock - countedStock);
        const newStock = countedStock + cardsAdded;

        updatesToInsert.push({
          client_id: clientId,
          collection_id: cc.collection_id,
          previous_stock: previousStock,
          counted_stock: countedStock,
          cards_sold: cardsSold,
          cards_added: cardsAdded,
          new_stock: newStock
        });
        ccUpdates.push({ id: cc.id, new_stock: newStock });
      }

      if (updatesToInsert.length === 0) {
        toast.info('Aucun changement détecté');
        setSubmitting(false);
        return;
      }

      const { error: updatesInsertError } = await supabase
        .from('stock_updates')
        .insert(updatesToInsert);
      if (updatesInsertError) throw updatesInsertError;

      // Apply per-collection stock
      for (const upd of ccUpdates) {
        const { error: ccUpdateError } = await supabase
          .from('client_collections')
          .update({ current_stock: upd.new_stock, updated_at: new Date().toISOString() })
          .eq('id', upd.id);
        if (ccUpdateError) throw ccUpdateError;
      }

      // Recompute client's total stock as sum of client_collections
      const { data: sumRows, error: sumError } = await supabase
        .from('client_collections')
        .select('current_stock')
        .eq('client_id', clientId);
      if (sumError) throw sumError;
      const total = (sumRows || []).reduce((acc: number, row: any) => acc + (row.current_stock || 0), 0);

      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({ current_stock: total, updated_at: new Date().toISOString() })
        .eq('id', clientId);
      if (clientUpdateError) throw clientUpdateError;

      toast.success('Mises à jour des collections enregistrées');
      await loadClientData();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour du stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssociate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associateForm.collection_id) {
      toast.error('Sélectionnez une collection');
      return;
    }
    const initialStock = parseInt(associateForm.initial_stock || '0');
    if (isNaN(initialStock) || initialStock < 0) {
      toast.error('Le stock initial doit être un nombre positif');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('client_collections')
        .insert([{ client_id: clientId, collection_id: associateForm.collection_id, initial_stock: initialStock, current_stock: initialStock }])
        .select('*, collection:collections(*)')
        .single();
      if (error) throw error;

      // Update client's total stock
      const total = (clientCollections || []).reduce((acc, cc) => acc + (cc.current_stock || 0), 0) + initialStock;
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({ current_stock: total, updated_at: new Date().toISOString() })
        .eq('id', clientId);
      if (clientUpdateError) throw clientUpdateError;

      toast.success('Collection associée au client');
      setAssociateForm({ collection_id: null, initial_stock: '' });
      await loadClientData();
    } catch (err) {
      console.error('Error associating collection:', err);
      toast.error('Erreur lors de l\'association de la collection');
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
        <div className="flex gap-3 mb-6">
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
              <CardTitle>Collections liées</CardTitle>
              <CardDescription>
                Associez des collections au client et gérez leur stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssociate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Collection</Label>
                  <Select value={associateForm.collection_id || ''} onValueChange={(val) => setAssociateForm(a => ({ ...a, collection_id: val }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choisir une collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCollections
                        .filter(c => !clientCollections.some(cc => cc.collection_id === c.id))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} — {c.price.toFixed(2)} €</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assoc-initial">Stock initial</Label>
                  <Input id="assoc-initial" type="number" min="0" value={associateForm.initial_stock}
                    onChange={(e) => setAssociateForm(a => ({ ...a, initial_stock: e.target.value }))}
                    placeholder="Ex: 100" className="mt-1.5" />
                </div>
                <div>
                  <Button type="submit" className="w-full md:w-auto">Associer</Button>
                </div>
              </form>

              <Separator className="my-6" />

              {clientCollections.length === 0 ? (
                <p className="text-sm text-slate-600">Aucune collection associée.</p>
              ) : (
                <div className="space-y-4">
                  {clientCollections.map((cc) => (
                    <div key={cc.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="font-semibold">{cc.collection?.name || 'Collection'}</p>
                          <p className="text-sm text-slate-500">Stock actuel: {cc.current_stock}</p>
                        </div>
                        {cc.collection?.price != null && (
                          <span className="text-sm text-slate-500">Prix: {cc.collection.price.toFixed(2)} €</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nouveau stock compté</Label>
                          <Input
                            type="number"
                            min="0"
                            value={perCollectionForm[cc.id]?.counted_stock || ''}
                            onChange={(e) => setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '' }), counted_stock: e.target.value } }))}
                            placeholder="Ex: 80"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label>Nouvelles cartes ajoutées</Label>
                          <Input
                            type="number"
                            min="0"
                            value={perCollectionForm[cc.id]?.cards_added || ''}
                            onChange={(e) => setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '' }), cards_added: e.target.value } }))}
                            placeholder="Ex: 50"
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Mise à jour du stock</CardTitle>
              <CardDescription>
                Comptez le stock restant et ajoutez les nouvelles cartes pour chaque collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      {update.collection_id && (
                        <div className="text-xs text-slate-600 mb-3">
                          Collection: {allCollections.find(c => c.id === update.collection_id)?.name || update.collection_id}
                        </div>
                      )}
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
