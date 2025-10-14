'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, StockUpdate, Collection, ClientCollection, Invoice } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Package, TrendingDown, TrendingUp, Euro, FileText, Trash2, Edit2, Info, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceDialog } from '@/components/invoice-dialog';
import { StockUpdateConfirmationDialog } from '@/components/stock-update-confirmation-dialog';
import { GlobalInvoiceDialog } from '@/components/global-invoice-dialog';
import { DepositSlipDialog } from '@/components/deposit-slip-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [globalInvoices, setGlobalInvoices] = useState<Invoice[]>([]);
  const [selectedGlobalInvoice, setSelectedGlobalInvoice] = useState<Invoice | null>(null);
  const [globalInvoiceDialogOpen, setGlobalInvoiceDialogOpen] = useState(false);
  const [depositSlipDialogOpen, setDepositSlipDialogOpen] = useState(false);
  
  // Delete collection dialog
  const [deleteCollectionDialogOpen, setDeleteCollectionDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<ClientCollection & { collection?: Collection } | null>(null);
  const [deletingCollection, setDeletingCollection] = useState(false);
  
  // Edit price dialog
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<ClientCollection & { collection?: Collection } | null>(null);
  const [editPriceForm, setEditPriceForm] = useState<{
    price_type: 'default' | 'custom';
    custom_price: string;
  }>({
    price_type: 'default',
    custom_price: ''
  });
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Form per collection: { [clientCollectionId]: { counted_stock, cards_added } }
  const [perCollectionForm, setPerCollectionForm] = useState<Record<string, { counted_stock: string; cards_added: string; collection_info: string }>>({});

  // Reprise de stock (ajustements de facture)
  const [pendingAdjustments, setPendingAdjustments] = useState<{ operation_name: string; amount: string }[]>([]);
  const [addAdjustmentOpen, setAddAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<{ operation_name: string; amount: string }>({ operation_name: '', amount: '' });

  // Association form
  const [associateForm, setAssociateForm] = useState<{ 
    collection_id: string | null; 
    initial_stock: string;
    price_type: 'default' | 'custom';
    custom_price: string;
  }>({
    collection_id: null,
    initial_stock: '',
    price_type: 'default',
    custom_price: ''
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
      const initialForm: Record<string, { counted_stock: string; cards_added: string; collection_info: string }> = {};
      ccWithTyped.forEach((cc) => {
        initialForm[cc.id] = { counted_stock: '', cards_added: '', collection_info: '' };
      });
      setPerCollectionForm(initialForm);

      const { data: updatesData, error: updatesError } = await supabase
        .from('stock_updates')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setStockUpdates(updatesData || []);

      // Load global invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setGlobalInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const prepareCollectionUpdates = (validate: boolean = false) => {
    const updates: {
      collection: Collection;
      previousStock: number;
      countedStock: number;
      cardsSold: number;
      cardsAdded: number;
      newStock: number;
      amount: number;
      effectivePrice: number;
      isCustomPrice: boolean;
      collectionInfo: string;
    }[] = [];

    for (const cc of clientCollections) {
      const form = perCollectionForm[cc.id];
      if (!form) continue;
      
      const hasCountedStock = form.counted_stock && form.counted_stock.trim() !== '';
      const hasNewDeposit = form.cards_added && form.cards_added.trim() !== '';
      
      // Si aucun des deux champs n'est rempli, on passe cette collection
      if (!hasCountedStock && !hasNewDeposit) continue;

      // Validation seulement si demandé (au moment de la soumission)
      if (validate) {
        // Vérifier que les deux champs sont remplis
        if (hasCountedStock && !hasNewDeposit) {
          toast.error(`Veuillez renseigner le "Nouveau dépôt" pour « ${cc.collection?.name || 'Collection'} »`);
          return null;
        }
        if (!hasCountedStock && hasNewDeposit) {
          toast.error(`Veuillez renseigner le "Nouveau stock compté" pour « ${cc.collection?.name || 'Collection'} »`);
          return null;
        }
      }

      // Si on n'a pas les deux champs et qu'on ne valide pas, on passe
      if (!hasCountedStock || !hasNewDeposit) continue;

      const countedStock = parseInt(form.counted_stock);
      const newDeposit = parseInt(form.cards_added); // Nouveau dépôt = nouveau stock actuel

      // Validation des valeurs numériques
      if (validate) {
        if (isNaN(countedStock) || countedStock < 0) {
          toast.error(`Le stock compté doit être un nombre positif pour « ${cc.collection?.name || 'Collection'} »`);
          return null;
        }
        if (isNaN(newDeposit) || newDeposit < 0) {
          toast.error(`Le nouveau dépôt doit être un nombre positif pour « ${cc.collection?.name || 'Collection'} »`);
          return null;
        }
      }

      const previousStock = cc.current_stock;
      const cardsSold = Math.max(0, previousStock - countedStock);
      const newStock = newDeposit; // Le nouveau stock est directement le nouveau dépôt
      const cardsAdded = Math.max(0, newStock - countedStock); // Calculer les cartes ajoutées pour l'historique
      const collectionInfo = form.collection_info || ''; // Info optionnelle pour la facture
      
      // Use custom_price if set, otherwise use the default collection price
      const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
      const isCustomPrice = cc.custom_price !== null;
      const amount = cardsSold * effectivePrice;

      if (cc.collection) {
        updates.push({
          collection: cc.collection,
          previousStock,
          countedStock,
          cardsSold,
          cardsAdded,
          newStock,
          amount,
          effectivePrice,
          isCustomPrice,
          collectionInfo
        });
      }
    }

    return updates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const updates = prepareCollectionUpdates(true); // Valider au moment de la soumission
    if (!updates) return;
    
    if (updates.length === 0) {
      toast.info('Aucun changement détecté');
      return;
    }

    // Open confirmation dialog
    setConfirmationDialogOpen(true);
  };

  const handleConfirmStockUpdate = async () => {
    if (!client) return;

    setSubmitting(true);

    try {
      const updates = prepareCollectionUpdates();
      if (!updates || updates.length === 0) {
        setSubmitting(false);
        setConfirmationDialogOpen(false);
        return;
      }

      // Calculate totals
      const totalCardsSold = updates.reduce((sum, u) => sum + u.cardsSold, 0);
      const totalAmount = updates.reduce((sum, u) => sum + u.amount, 0);
      const adjustmentsTotal = (pendingAdjustments || []).reduce((sum, a) => {
        const val = parseFloat(a.amount);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      // Create global invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_id: clientId,
          total_cards_sold: totalCardsSold,
          total_amount: totalAmount + adjustmentsTotal
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Prepare stock updates with invoice_id
      const updatesToInsert: any[] = [];
      const ccUpdates: { id: string; new_stock: number }[] = [];

      for (const cc of clientCollections) {
        const form = perCollectionForm[cc.id];
        if (!form) continue;
        const hasAny = (form.counted_stock && form.counted_stock.trim() !== '') || (form.cards_added && form.cards_added.trim() !== '');
        if (!hasAny) continue;

        const countedStock = parseInt(form.counted_stock);
        const newDeposit = parseInt(form.cards_added); // Le champ "cards_added" contient le nouveau dépôt
        const previousStock = cc.current_stock;
        const cardsSold = Math.max(0, previousStock - countedStock);
        const newStock = newDeposit; // Le nouveau stock est directement le nouveau dépôt saisi
        const cardsAdded = Math.max(0, newStock - countedStock); // Cartes ajoutées pour l'historique
        const collectionInfo = form.collection_info || ''; // Info optionnelle pour la facture

        updatesToInsert.push({
          client_id: clientId,
          collection_id: cc.collection_id,
          invoice_id: invoiceData.id,
          previous_stock: previousStock,
          counted_stock: countedStock,
          cards_sold: cardsSold,
          cards_added: cardsAdded,
          new_stock: newStock,
          collection_info: collectionInfo
        });
        ccUpdates.push({ id: cc.id, new_stock: newStock });
      }

      const { error: updatesInsertError } = await supabase
        .from('stock_updates')
        .insert(updatesToInsert);
      if (updatesInsertError) throw updatesInsertError;

      // Insert invoice adjustments (reprise de stock)
      if ((pendingAdjustments || []).length > 0) {
        const rows = pendingAdjustments
          .map(a => {
            const amount = parseFloat(a.amount);
            if (isNaN(amount)) return null;
            return {
              client_id: clientId,
              invoice_id: invoiceData.id,
              operation_name: a.operation_name,
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

      toast.success('Facture créée et stock mis à jour');
      setConfirmationDialogOpen(false);
      
      // Reset form & adjustments
      const resetForm: Record<string, { counted_stock: string; cards_added: string; collection_info: string }> = {};
      clientCollections.forEach((cc) => {
        resetForm[cc.id] = { counted_stock: '', cards_added: '', collection_info: '' };
      });
      setPerCollectionForm(resetForm);
      setPendingAdjustments([]);
      
      await loadClientData();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour du stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCollectionClick = (cc: ClientCollection & { collection?: Collection }) => {
    setCollectionToDelete(cc);
    setDeleteCollectionDialogOpen(true);
  };

  const handleDeleteCollectionConfirm = async () => {
    if (!collectionToDelete) return;
    
    setDeletingCollection(true);
    try {
      const { error } = await supabase
        .from('client_collections')
        .delete()
        .eq('id', collectionToDelete.id);
      
      if (error) throw error;

      // Update client's total stock
      const newTotal = client!.current_stock - collectionToDelete.current_stock;
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({ current_stock: Math.max(0, newTotal), updated_at: new Date().toISOString() })
        .eq('id', clientId);
      if (clientUpdateError) throw clientUpdateError;

      toast.success('Collection dissociée avec succès');
      setDeleteCollectionDialogOpen(false);
      setCollectionToDelete(null);
      await loadClientData();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Erreur lors de la suppression de la collection');
    } finally {
      setDeletingCollection(false);
    }
  };

  const handleEditPriceClick = (cc: ClientCollection & { collection?: Collection }) => {
    setCollectionToEdit(cc);
    if (cc.custom_price !== null) {
      setEditPriceForm({
        price_type: 'custom',
        custom_price: cc.custom_price.toString()
      });
    } else {
      setEditPriceForm({
        price_type: 'default',
        custom_price: ''
      });
    }
    setEditPriceDialogOpen(true);
  };

  const handleEditPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionToEdit) return;

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

      const { error } = await supabase
        .from('client_collections')
        .update({
          custom_price: customPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionToEdit.id);

      if (error) throw error;

      toast.success('Prix modifié avec succès');
      setEditPriceDialogOpen(false);
      setCollectionToEdit(null);
      setEditPriceForm({ price_type: 'default', custom_price: '' });
      await loadClientData();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Erreur lors de la modification du prix');
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleAddAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = adjustmentForm.operation_name.trim();
    const amountStr = adjustmentForm.amount.trim().replace(',', '.');
    if (!name) {
      toast.error("Veuillez renseigner un nom d'opération");
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      toast.error('Le montant doit être un nombre');
      return;
    }
    if (amount >= 0) {
      toast.error('Le montant doit être négatif');
      return;
    }
    setPendingAdjustments((list) => [
      ...list,
      { operation_name: name, amount: amount.toFixed(2) }
    ]);
    setAdjustmentForm({ operation_name: '', amount: '' });
    setAddAdjustmentOpen(false);
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

    try {
      const insertData: any = {
        client_id: clientId,
        collection_id: associateForm.collection_id,
        initial_stock: initialStock,
        current_stock: initialStock
      };

      // Only set custom_price if it's a custom price
      if (customPrice !== null) {
        insertData.custom_price = customPrice;
      }

      const { data, error } = await supabase
        .from('client_collections')
        .insert([insertData])
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
      setAssociateForm({ collection_id: null, initial_stock: '', price_type: 'default', custom_price: '' });
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
        {/* Reprise de stock */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle>Reprise de stock</CardTitle>
            <CardDescription>
              Ajoutez une opération de reprise de stock (montant négatif) qui apparaîtra sur la prochaine facture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setAddAdjustmentOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une reprise de stock
                </Button>
              </div>
              {pendingAdjustments.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y bg-white">
                  {pendingAdjustments.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{a.operation_name}</p>
                        <p className="text-xs text-slate-500">Montant: {a.amount} €</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50"
                        title="Supprimer"
                        onClick={() => setPendingAdjustments(list => list.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Adjustment Dialog */}
        <Dialog open={addAdjustmentOpen} onOpenChange={setAddAdjustmentOpen}>
          <DialogContent>
            <form onSubmit={handleAddAdjustmentSubmit}>
              <DialogHeader>
                <DialogTitle>Ajouter une reprise de stock</DialogTitle>
                <DialogDescription>
                  Saisissez un nom d'opération et un montant négatif (ex: -150)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="adj-name">Nom de l'opération</Label>
                  <Input
                    id="adj-name"
                    type="text"
                    value={adjustmentForm.operation_name}
                    onChange={(e) => setAdjustmentForm(f => ({ ...f, operation_name: e.target.value }))}
                    placeholder="Ex: Rachat stock concurrent"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="adj-amount">Montant (€)</Label>
                  <Input
                    id="adj-amount"
                    type="text"
                    inputMode="decimal"
                    value={adjustmentForm.amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                        setAdjustmentForm(f => ({ ...f, amount: value }));
                      }
                    }}
                    placeholder="Ex: -150"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddAdjustmentOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Ajouter</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Collections liées</CardTitle>
              <CardDescription>
                Associez des collections au client et gérez leur stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssociate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Input 
                      id="assoc-initial" 
                      type="text" 
                      inputMode="numeric"
                      value={associateForm.initial_stock}
                      onChange={(e) => {
                        const value = e.target.value;
                        // N'accepter que les nombres
                        if (value === '' || /^\d+$/.test(value)) {
                          setAssociateForm(a => ({ ...a, initial_stock: value }));
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Ex: 100" 
                      className="mt-1.5" 
                    />
                  </div>
                </div>

                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <Label>Prix de la collection</Label>
                  <RadioGroup
                    value={associateForm.price_type}
                    onValueChange={(val: 'default' | 'custom') => setAssociateForm(a => ({ ...a, price_type: val }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="price-default" />
                      <Label htmlFor="price-default" className="font-normal cursor-pointer">
                        Utiliser le prix par défaut
                        {associateForm.collection_id && allCollections.find(c => c.id === associateForm.collection_id) && (
                          <span className="ml-2 text-sm text-slate-600">
                            ({allCollections.find(c => c.id === associateForm.collection_id)?.price.toFixed(2)} €)
                          </span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="price-custom" />
                      <Label htmlFor="price-custom" className="font-normal cursor-pointer">
                        Définir un prix spécifique pour ce client
                      </Label>
                    </div>
                  </RadioGroup>

                  {associateForm.price_type === 'custom' && (
                    <div className="pt-2">
                      <Label htmlFor="custom-price">Prix personnalisé (€)</Label>
                      <Input
                        id="custom-price"
                        type="text"
                        inputMode="decimal"
                        value={associateForm.custom_price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // N'accepter que les nombres et le point décimal
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setAssociateForm(a => ({ ...a, custom_price: value }));
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ex: 2.50"
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Button type="submit" className="w-full md:w-auto">Associer la collection</Button>
                </div>
              </form>

              <Separator className="my-6" />

              {clientCollections.length === 0 ? (
                <p className="text-sm text-slate-600">Aucune collection associée.</p>
              ) : (
                <div className="space-y-4">
                  {clientCollections.map((cc) => {
                    const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
                    const isCustomPrice = cc.custom_price !== null;
                    
                    return (
                    <div key={cc.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold">{cc.collection?.name || 'Collection'}</p>
                          <p className="text-sm text-slate-500">Stock actuel: {cc.current_stock}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="text-right mr-2">
                            <span className="text-sm font-medium text-slate-700">
                              Prix: {effectivePrice.toFixed(2)} €
                            </span>
                            {isCustomPrice && (
                              <p className="text-xs text-blue-600">Prix personnalisé</p>
                            )}
                            {!isCustomPrice && cc.collection?.price != null && (
                              <p className="text-xs text-slate-500">Prix par défaut</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPriceClick(cc)}
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              title="Modifier le prix"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCollectionClick(cc)}
                              className="h-8 w-8 p-0 hover:bg-red-50"
                              title="Supprimer la collection"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Nouveau stock compté</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={perCollectionForm[cc.id]?.counted_stock || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // N'accepter que les nombres
                                if (value === '' || /^\d+$/.test(value)) {
                                  setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '', collection_info: '' }), counted_stock: value } }));
                                }
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Ex: 80"
                              className="mt-1.5"
                            />
                            <p className="text-xs text-slate-500 mt-1">Stock constaté à l'arrivée</p>
                          </div>
                          <div>
                            <Label>Nouveau dépôt</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={perCollectionForm[cc.id]?.cards_added || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // N'accepter que les nombres
                                if (value === '' || /^\d+$/.test(value)) {
                                  setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '', collection_info: '' }), cards_added: value } }));
                                }
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Ex: 100"
                              className="mt-1.5"
                            />
                            <p className="text-xs text-slate-500 mt-1">Stock total après mise à jour</p>
                          </div>
                        </div>
                        <div>
                          <Label>Info collection pour facture</Label>
                          <Input
                            type="text"
                            value={perCollectionForm[cc.id]?.collection_info || ''}
                            onChange={(e) => {
                              setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '', collection_info: '' }), collection_info: e.target.value } }));
                            }}
                            placeholder="Ex: Livraison partielle, Retour prévu..."
                            className="mt-1.5"
                          />
                          <p className="text-xs text-slate-500 mt-1">Information optionnelle affichée dans la colonne "Infos" de la facture</p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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

          {/* Bon de dépôt */}
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Bon de dépôt</CardTitle>
              <CardDescription>
                Générez un bon de dépôt pour ce client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => setDepositSlipDialogOpen(true)}
                disabled={clientCollections.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Générer un bon de dépôt
              </Button>
              {clientCollections.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Veuillez d'abord associer des collections au client
                </p>
              )}
            </CardContent>
          </Card>

          {globalInvoices.length > 0 && (
            <Card className="border-slate-200 shadow-md">
              <CardHeader>
                <CardTitle>Historique des factures</CardTitle>
                <CardDescription>
                  {globalInvoices.length} facture{globalInvoices.length > 1 ? 's' : ''} enregistrée{globalInvoices.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {globalInvoices.map((invoice) => {
                    const invoiceUpdates = stockUpdates.filter(u => u.invoice_id === invoice.id);
                    return (
                      <div
                        key={invoice.id}
                        className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-sm text-slate-500">
                              {new Date(invoice.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <p className="text-xs text-slate-600 mt-1">
                              {invoiceUpdates.length} collection{invoiceUpdates.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGlobalInvoice(invoice);
                              setGlobalInvoiceDialogOpen(true);
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Voir facture
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                            <div className="flex items-center gap-2 text-orange-600 mb-1">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-xs font-medium">Total cartes vendues</span>
                            </div>
                            <p className="text-2xl font-bold text-orange-900">{invoice.total_cards_sold}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                              <Euro className="h-4 w-4" />
                              <span className="text-xs font-medium">Montant total</span>
                            </div>
                            <p className="text-2xl font-bold text-green-900">{invoice.total_amount.toFixed(2)} €</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

        {client && (
          <StockUpdateConfirmationDialog
            open={confirmationDialogOpen}
            onOpenChange={setConfirmationDialogOpen}
            onConfirm={handleConfirmStockUpdate}
            collectionUpdates={prepareCollectionUpdates() || []}
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
            collections={allCollections}
            clientCollections={clientCollections}
          />
        )}

        {/* Delete Collection Dialog */}
        <AlertDialog open={deleteCollectionDialogOpen} onOpenChange={setDeleteCollectionDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la collection ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir dissocier la collection "{collectionToDelete?.collection?.name}" de ce client ?
                Cette action est irréversible.
                {collectionToDelete && collectionToDelete.current_stock > 0 && (
                  <span className="block mt-2 text-orange-600 font-medium">
                    ⚠️ Attention : Cette collection a encore {collectionToDelete.current_stock} cartes en stock.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingCollection}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCollectionConfirm}
                disabled={deletingCollection}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingCollection ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Price Dialog */}
        <Dialog open={editPriceDialogOpen} onOpenChange={setEditPriceDialogOpen}>
          <DialogContent>
            <form onSubmit={handleEditPriceSubmit}>
              <DialogHeader>
                <DialogTitle>Modifier le prix</DialogTitle>
                <DialogDescription>
                  Modifiez le prix de "{collectionToEdit?.collection?.name}" pour ce client
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {collectionToEdit?.collection && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm text-slate-600">
                      Prix par défaut de la collection : 
                      <span className="font-semibold text-slate-900 ml-2">
                        {collectionToEdit.collection.price.toFixed(2)} €
                      </span>
                    </p>
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
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditPriceDialogOpen(false)}
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

        {/* Deposit Slip Dialog */}
        {client && (
          <DepositSlipDialog
            open={depositSlipDialogOpen}
            onOpenChange={setDepositSlipDialogOpen}
            client={client}
            clientCollections={clientCollections}
          />
        )}
      </div>
    </div>
  );
}
