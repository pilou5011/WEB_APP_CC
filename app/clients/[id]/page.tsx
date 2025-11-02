'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, StockUpdate, Collection, ClientCollection, Invoice } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Package, TrendingDown, TrendingUp, Euro, FileText, Trash2, Edit2, Info, Plus, Download, Check, ChevronsUpDown, Calendar, Clock, XCircle, Phone, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceDialog } from '@/components/invoice-dialog';
import { StockUpdateConfirmationDialog } from '@/components/stock-update-confirmation-dialog';
import { GlobalInvoiceDialog } from '@/components/global-invoice-dialog';
import { DepositSlipDialog } from '@/components/deposit-slip-dialog';
import { DraftRecoveryDialog } from '@/components/draft-recovery-dialog';
import { formatWeekSchedule, formatWeekScheduleData } from '@/components/opening-hours-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useStockUpdateDraft } from '@/hooks/use-stock-update-draft';

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
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  
  // Draft recovery
  const [draftRecoveryOpen, setDraftRecoveryOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<string>('');
  const [hasDraft, setHasDraft] = useState(false);
  const draftCheckDoneRef = useRef(false); // Track if we've already checked for draft
  
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
  const [pendingAdjustments, setPendingAdjustments] = useState<{ operation_name: string; unit_price: string; quantity: string }[]>([]);
  const [addAdjustmentOpen, setAddAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<{ operation_name: string; unit_price: string; quantity: string }>({ operation_name: '', unit_price: '', quantity: '' });

  // Association form
  const [associateForm, setAssociateForm] = useState<{ 
    collection_id: string | null; 
    initial_stock: string;
    price_type: 'default' | 'custom';
    custom_price: string;
    recommended_sale_price_type: 'default' | 'custom';
    custom_recommended_sale_price: string;
  }>({
    collection_id: null,
    initial_stock: '',
    price_type: 'default',
    custom_price: '',
    recommended_sale_price_type: 'default',
    custom_recommended_sale_price: ''
  });
  
  // Combobox state for collection selector
  const [collectionComboboxOpen, setCollectionComboboxOpen] = useState(false);

  // Initialize draft management hook
  const draft = useStockUpdateDraft(clientId);

  useEffect(() => {
    // Reset draft check flag when clientId changes (navigating to different client)
    draftCheckDoneRef.current = false;
    
    // Check for draft BEFORE loading client data
    const initPage = async () => {
      // First, check if there's a draft
      const draftInfo = await draft.getDraftInfo();
      let hasDraftData = false;
      
      if (draftInfo) {
        console.log('[Draft] Found draft info before loading client data');
        // Load the draft data to check if it contains meaningful stock update data
        let draftData = draft.loadDraftLocally();
        if (!draftData) {
          draftData = await draft.loadDraftFromServer();
        }
        
        if (draftData && draft.hasMeaningfulDraft(draftData)) {
          hasDraftData = true;
          console.log('[Draft] Has meaningful draft, will skip form initialization');
        }
      }
      
      // Load client data (which will initialize the form if no draft)
      await loadClientData();
      
      // AFTER client data is loaded, show draft recovery dialog if needed
      if (hasDraftData) {
        const draftInfo = await draft.getDraftInfo();
        if (draftInfo) {
          let draftData = draft.loadDraftLocally();
          if (!draftData) {
            draftData = await draft.loadDraftFromServer();
          }
          
          if (draftData && draft.hasMeaningfulDraft(draftData)) {
            setDraftDate(draftInfo.createdAt);
            setHasDraft(true);
            setDraftRecoveryOpen(true);
            // Immediately restore draft data to prevent it from being overwritten
            setPerCollectionForm(draftData.perCollectionForm);
            setPendingAdjustments(draftData.pendingAdjustments);
          }
        }
      }
      
      // Mark draft check as done
      draftCheckDoneRef.current = true;
    };
    
    initPage();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps


  // Auto-save draft whenever form data changes (but not during submission or before draft check)
  useEffect(() => {
    // Don't autosave until we've checked for existing draft
    if (!draftCheckDoneRef.current) {
      console.log('[Draft] AutoSave disabled: waiting for draft check to complete');
      return;
    }
    
    // Don't autosave while the recovery dialog is open (user hasn't made a choice yet)
    if (draftRecoveryOpen) {
      console.log('[Draft] AutoSave disabled: draft recovery dialog is open');
      return;
    }
    
    if (!loading && client && clientCollections.length > 0 && !submitting) {
      draft.autoSave({
        perCollectionForm,
        pendingAdjustments
      });
    }
  }, [perCollectionForm, pendingAdjustments, loading, client, clientCollections.length, submitting, draftRecoveryOpen]); // eslint-disable-line react-hooks/exhaustive-deps



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

      // Load stock updates to get last collection_info for each collection
      const { data: updatesData, error: updatesError } = await supabase
        .from('stock_updates')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setStockUpdates(updatesData || []);

      // Initialize per-collection form defaults with last collection_info
      const initialForm: Record<string, { counted_stock: string; cards_added: string; collection_info: string }> = {};
      ccWithTyped.forEach((cc) => {
        // Find the last stock update for this collection that has collection_info
        const lastUpdateWithInfo = (updatesData || []).find(
          (update: StockUpdate) => 
            update.collection_id === cc.collection_id && 
            update.collection_info && 
            update.collection_info.trim() !== ''
        );
        
        initialForm[cc.id] = { 
          counted_stock: '', 
          cards_added: '', 
          collection_info: lastUpdateWithInfo?.collection_info || '' 
        };
      });
      setPerCollectionForm(initialForm);

      // Load global invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setGlobalInvoices(invoicesData || []);
      
      // Calculate last visit date (date of last invoice)
      if (invoicesData && invoicesData.length > 0) {
        setLastVisitDate(invoicesData[0].created_at);
      } else {
        setLastVisitDate(null);
      }
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
    
    // Vérifier s'il y a des changements de stock OU des reprises de stock
    const hasStockUpdates = updates.length > 0;
    const hasAdjustments = pendingAdjustments.length > 0;
    
    if (!hasStockUpdates && !hasAdjustments) {
      toast.info('Aucun changement détecté');
      return;
    }

    // Open confirmation dialog
    setConfirmationDialogOpen(true);
  };

  const handleResumeDraft = async () => {
    try {
      console.log('[Draft] User confirmed to resume draft (data already loaded)');
      toast.success('Brouillon restauré avec succès');
    } catch (error) {
      console.error('Error resuming draft:', error);
      toast.error('Erreur lors de la restauration du brouillon');
    } finally {
      setDraftRecoveryOpen(false);
      setHasDraft(false);
    }
  };

  const handleDiscardDraft = async () => {
    try {
      console.log('[Draft] Discarding draft for client:', clientId);
      
      // CRITICAL: Mark draft check as not done temporarily to prevent auto-save
      // from recreating the draft while we're deleting it
      draftCheckDoneRef.current = false;
      
      // Delete the draft
      await draft.deleteDraft();
      
      console.log('[Draft] Draft deleted successfully, reinitializing form');
      
      // Reinitialize form with default values (from last invoice)
      const initialForm: Record<string, { counted_stock: string; cards_added: string; collection_info: string }> = {};
      clientCollections.forEach((cc) => {
        // Find the last stock update for this collection that has collection_info
        const lastUpdateWithInfo = stockUpdates.find(
          (update: StockUpdate) => 
            update.collection_id === cc.collection_id && 
            update.collection_info && 
            update.collection_info.trim() !== ''
        );
        
        initialForm[cc.id] = { 
          counted_stock: '', 
          cards_added: '', 
          collection_info: lastUpdateWithInfo?.collection_info || '' 
        };
      });
      
      // Set form data - this will trigger auto-save, but we've disabled it temporarily
      setPerCollectionForm(initialForm);
      setPendingAdjustments([]);
      
      // CRITICAL: Re-enable draft check and auto-save AFTER a delay to ensure
      // the deletion is complete and no new draft is created
      setTimeout(() => {
        draftCheckDoneRef.current = true;
        console.log('[Draft] Auto-save re-enabled after draft deletion');
      }, 1000);
      
      setDraftRecoveryOpen(false);
      setHasDraft(false);
      
      toast.success('Brouillon supprimé avec succès');
    } catch (error) {
      console.error('[Draft] Error discarding draft:', error);
      toast.error('Erreur lors de la suppression du brouillon');
      // Re-enable draft check even on error
      draftCheckDoneRef.current = true;
      setDraftRecoveryOpen(false);
      setHasDraft(false);
    }
  };

  const handleConfirmStockUpdate = async () => {
    if (!client) return;

    setSubmitting(true);

    try {
      const updates = prepareCollectionUpdates();
      
      // Vérifier qu'il y a au moins des mises à jour de stock OU des reprises
      const hasStockUpdates = updates && updates.length > 0;
      const hasAdjustments = pendingAdjustments && pendingAdjustments.length > 0;
      
      if (!hasStockUpdates && !hasAdjustments) {
        setSubmitting(false);
        setConfirmationDialogOpen(false);
        return;
      }

      // Calculate totals
      const totalCardsSold = hasStockUpdates ? updates.reduce((sum, u) => sum + u.cardsSold, 0) : 0;
      const totalAmount = hasStockUpdates ? updates.reduce((sum, u) => sum + u.amount, 0) : 0;
      const adjustmentsTotal = (pendingAdjustments || []).reduce((sum, a) => {
        const unitPrice = parseFloat(a.unit_price);
        const quantity = parseInt(a.quantity);
        if (isNaN(unitPrice) || isNaN(quantity)) return sum;
        return sum + (unitPrice * quantity);
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

      if (hasStockUpdates) {
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
      }

      // Insert stock updates only if there are any
      if (updatesToInsert.length > 0) {
        const { error: updatesInsertError } = await supabase
          .from('stock_updates')
          .insert(updatesToInsert);
        if (updatesInsertError) throw updatesInsertError;
      }

      // Insert invoice adjustments (reprise de stock)
      if ((pendingAdjustments || []).length > 0) {
        const rows = pendingAdjustments
          .map(a => {
            const unitPrice = parseFloat(a.unit_price);
            const quantity = parseInt(a.quantity);
            if (isNaN(unitPrice) || isNaN(quantity)) return null;
            const amount = unitPrice * quantity;
            return {
              client_id: clientId,
              invoice_id: invoiceData.id,
              operation_name: a.operation_name,
              unit_price: unitPrice,
              quantity: quantity,
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

      // Recompute client's total stock as sum of client_collections (only if stock was updated)
      if (hasStockUpdates) {
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
      }

      // ✅ CRITICAL: Supprimer le brouillon EN PREMIER pour éviter qu'il se rouvre
      await draft.deleteDraft();
      setHasDraft(false);
      
      // ✅ Débloquer l'interface IMMÉDIATEMENT
      setConfirmationDialogOpen(false);
      setSubmitting(false);

      // Success message based on what was done
      if (hasStockUpdates && hasAdjustments) {
        toast.success('Facture créée avec reprises de stock et mise à jour du stock');
      } else if (hasStockUpdates) {
        toast.success('Facture créée et stock mis à jour');
      } else {
        toast.success('Facture créée avec reprises de stock');
      }
      
      // ✅ Reset adjustments et reload data
      setPendingAdjustments([]);
      
      // Reload client data pour rafraîchir (sans await pour ne pas bloquer)
      loadClientData().catch(err => {
        console.error('Error reloading client data:', err);
      });
      
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour du stock');
      setSubmitting(false);
      setConfirmationDialogOpen(false);
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
    const unitPriceStr = adjustmentForm.unit_price.trim().replace(',', '.');
    const quantityStr = adjustmentForm.quantity.trim();
    
    if (!name) {
      toast.error("Veuillez renseigner un nom d'opération");
      return;
    }
    
    const unitPrice = parseFloat(unitPriceStr);
    if (isNaN(unitPrice)) {
      toast.error('Le prix unitaire doit être un nombre');
      return;
    }
    if (unitPrice >= 0) {
      toast.error('Le prix unitaire doit être négatif');
      return;
    }
    
    const quantity = parseInt(quantityStr);
    if (isNaN(quantity)) {
      toast.error('La quantité doit être un nombre entier');
      return;
    }
    if (quantity <= 0) {
      toast.error('La quantité doit être positive');
      return;
    }
    
    setPendingAdjustments((list) => [
      ...list,
      { operation_name: name, unit_price: unitPrice.toFixed(2), quantity: quantity.toString() }
    ]);
    setAdjustmentForm({ operation_name: '', unit_price: '', quantity: '' });
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

    // Validate custom recommended sale price if selected
    let customRecommendedSalePrice: number | null = null;
    if (associateForm.recommended_sale_price_type === 'custom') {
      const parsedRecommendedSalePrice = parseFloat(associateForm.custom_recommended_sale_price);
      if (isNaN(parsedRecommendedSalePrice) || parsedRecommendedSalePrice < 0) {
        toast.error('Le prix de vente conseillé personnalisé doit être un nombre positif');
        return;
      }
      customRecommendedSalePrice = parsedRecommendedSalePrice;
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

      // Only set custom_recommended_sale_price if it's a custom price
      if (customRecommendedSalePrice !== null) {
        insertData.custom_recommended_sale_price = customRecommendedSalePrice;
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
      setAssociateForm({ 
        collection_id: null, 
        initial_stock: '', 
        price_type: 'default', 
        custom_price: '',
        recommended_sale_price_type: 'default',
        custom_recommended_sale_price: ''
      });
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
              
              {/* Informations complémentaires */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date de dernier passage */}
                    {lastVisitDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-base">Dernier passage : </span>
                          <span className="text-slate-900 font-semibold text-base">
                            {new Date(lastVisitDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Code client */}
                    {client.client_number && (
                      <div className="flex items-start gap-2">
                        <Hash className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-base">Code client : </span>
                          <span className="text-slate-900 font-bold text-lg font-mono">{client.client_number}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Téléphone 1 */}
                    {client.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-base">Tél : </span>
                          <span className="text-slate-900 font-bold text-base">{client.phone}</span>
                          {client.phone_1_info && (
                            <span className="text-slate-500 ml-1 text-sm">({client.phone_1_info})</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Jour de fermeture */}
                    {client.closing_day && (
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-700 text-sm">Fermeture : </span>
                          <span className="text-slate-600 text-sm">{client.closing_day}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Commentaire */}
                  {client.comment && (
                    <div className="mt-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-900 text-base flex-1">{client.comment}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Horaires d'ouverture */}
                  {client.opening_hours && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-slate-700 text-base">Horaires d'ouverture</span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-medium">
                          {formatWeekScheduleData(client.opening_hours).map((item, index) => (
                            <React.Fragment key={`schedule-${index}`}>
                              <div className="text-slate-600">{item.day}</div>
                              <div className="text-slate-800">{item.hours}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
              <form onSubmit={handleAssociate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Collection</Label>
                    <Popover open={collectionComboboxOpen} onOpenChange={setCollectionComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={collectionComboboxOpen}
                          className="w-full justify-between mt-1.5"
                        >
                          {associateForm.collection_id
                            ? allCollections.find((c) => c.id === associateForm.collection_id)?.name
                            : "Choisir une collection"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher une collection..." />
                          <CommandList>
                            <CommandEmpty>Aucune collection trouvée.</CommandEmpty>
                            <CommandGroup>
                              {allCollections
                                .filter(c => !clientCollections.some(cc => cc.collection_id === c.id))
                                .map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => {
                                      setAssociateForm(a => ({ ...a, collection_id: c.id }));
                                      setCollectionComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        associateForm.collection_id === c.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {c.name} — {c.price.toFixed(2)} €
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                  <Label>Prix de cession (HT)</Label>
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

                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <Label>Prix de vente conseillé (TTC)</Label>
                  <RadioGroup
                    value={associateForm.recommended_sale_price_type}
                    onValueChange={(val: 'default' | 'custom') => setAssociateForm(a => ({ ...a, recommended_sale_price_type: val }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="recommended-price-default" />
                      <Label htmlFor="recommended-price-default" className="font-normal cursor-pointer">
                        Utiliser le prix par défaut
                        {associateForm.collection_id && allCollections.find(c => c.id === associateForm.collection_id) && (
                          <span className="ml-2 text-sm text-slate-600">
                            ({(() => {
                              const collection = allCollections.find(c => c.id === associateForm.collection_id);
                              return collection?.recommended_sale_price 
                                ? `${collection.recommended_sale_price.toFixed(2)} €`
                                : 'Non défini';
                            })()})
                          </span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="recommended-price-custom" />
                      <Label htmlFor="recommended-price-custom" className="font-normal cursor-pointer">
                        Définir un prix spécifique pour ce client
                      </Label>
                    </div>
                  </RadioGroup>

                  {associateForm.recommended_sale_price_type === 'custom' && (
                    <div className="pt-2">
                      <Label htmlFor="custom-recommended-price">Prix personnalisé (€)</Label>
                      <Input
                        id="custom-recommended-price"
                        type="text"
                        inputMode="decimal"
                        value={associateForm.custom_recommended_sale_price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // N'accepter que les nombres et le point décimal
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setAssociateForm(a => ({ ...a, custom_recommended_sale_price: value }));
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ex: 3.00"
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
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[15%] font-semibold">Collection</TableHead>
                        <TableHead className="w-[10%] font-semibold">Ancien dépôt</TableHead>
                        <TableHead className="w-[12%] font-semibold">Stock compté</TableHead>
                        <TableHead className="w-[12%] font-semibold">Nouveau dépôt</TableHead>
                        <TableHead className="w-[20%] font-semibold">Info collection pour facture</TableHead>
                        <TableHead className="w-[10%] text-right font-semibold">Prix de cession (HT)</TableHead>
                        <TableHead className="w-[10%] text-right font-semibold">Prix de vente conseillé (TTC)</TableHead>
                        <TableHead className="w-[11%] text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientCollections.map((cc) => {
                        const effectivePrice = cc.custom_price ?? cc.collection?.price ?? 0;
                        const isCustomPrice = cc.custom_price !== null;
                        const effectiveRecommendedSalePrice = cc.custom_recommended_sale_price ?? cc.collection?.recommended_sale_price ?? null;
                        const isCustomRecommendedSalePrice = cc.custom_recommended_sale_price !== null;
                        
                        return (
                          <TableRow key={cc.id} className="hover:bg-slate-50/50">
                            <TableCell className="align-middle py-3">
                              <p className="font-medium text-slate-900">{cc.collection?.name || 'Collection'}</p>
                            </TableCell>
                            <TableCell className="align-middle py-3 text-center">
                              <p className="text-sm font-medium text-slate-600">{cc.current_stock}</p>
                            </TableCell>
                            <TableCell className="align-top py-3">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={perCollectionForm[cc.id]?.counted_stock || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '', collection_info: '' }), counted_stock: value } }));
                                  }
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="......"
                                className="h-9 placeholder:text-slate-400"
                              />
                            </TableCell>
                            <TableCell className="align-top py-3">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={perCollectionForm[cc.id]?.cards_added || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '', collection_info: '' }), cards_added: value } }));
                                  }
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="......"
                                className="h-9 placeholder:text-slate-400"
                              />
                            </TableCell>
                            <TableCell className="align-top py-3">
                              <Input
                                type="text"
                                value={perCollectionForm[cc.id]?.collection_info || ''}
                                onChange={(e) => {
                                  setPerCollectionForm(p => ({ ...p, [cc.id]: { ...(p[cc.id] || { counted_stock: '', cards_added: '', collection_info: '' }), collection_info: e.target.value } }));
                                }}
                                placeholder="......"
                                className="h-9 placeholder:text-slate-400"
                              />
                            </TableCell>
                            <TableCell className="align-top py-3 text-right">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{effectivePrice.toFixed(2)} €</p>
                                {isCustomPrice && (
                                  <p className="text-xs text-blue-600">Personnalisé</p>
                                )}
                                {!isCustomPrice && cc.collection?.price != null && (
                                  <p className="text-xs text-slate-500">Par défaut</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3 text-right">
                              <div>
                                {effectiveRecommendedSalePrice !== null ? (
                                  <>
                                    <p className="text-sm font-medium text-slate-900">{effectiveRecommendedSalePrice.toFixed(2)} €</p>
                                    {isCustomRecommendedSalePrice && (
                                      <p className="text-xs text-blue-600">Personnalisé</p>
                                    )}
                                    {!isCustomRecommendedSalePrice && (
                                      <p className="text-xs text-slate-500">Par défaut</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-slate-400">Non défini</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-3 text-right">
                              <div className="flex gap-1 justify-end">
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
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Reprise de stock */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle>Reprise de stock</CardTitle>
            <CardDescription>
              Ajoutez une opération de reprise de stock avec le prix unitaire et le nombre de cartes reprises
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
                  {pendingAdjustments.map((a, idx) => {
                    const totalAmount = (parseFloat(a.unit_price) * parseInt(a.quantity)).toFixed(2);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{a.operation_name}</p>
                          <p className="text-xs text-slate-500">
                            {a.quantity} carte(s) × {a.unit_price} € = {totalAmount} €
                          </p>
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
                    );
                  })}
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
                  Saisissez le nom de l'opération, le prix unitaire (négatif) et le nombre de cartes reprises
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
                  <Label htmlFor="adj-unit-price">Prix unitaire par carte (€)</Label>
                  <Input
                    id="adj-unit-price"
                    type="text"
                    inputMode="decimal"
                    value={adjustmentForm.unit_price}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                        setAdjustmentForm(f => ({ ...f, unit_price: value }));
                      }
                    }}
                    placeholder="Ex: -2.00"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">Le prix doit être négatif (reprise)</p>
                </div>
                <div>
                  <Label htmlFor="adj-quantity">Nombre de cartes reprises</Label>
                  <Input
                    id="adj-quantity"
                    type="number"
                    min="1"
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm(f => ({ ...f, quantity: e.target.value }))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Ex: 50"
                    className="mt-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {adjustmentForm.unit_price && adjustmentForm.quantity && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-700">
                      Montant total : {(parseFloat(adjustmentForm.unit_price.replace(',', '.')) * parseInt(adjustmentForm.quantity || '0')).toFixed(2)} €
                    </p>
                  </div>
                )}
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
            pendingAdjustments={pendingAdjustments}
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

        {/* Draft Recovery Dialog */}
        <DraftRecoveryDialog
          open={draftRecoveryOpen}
          onOpenChange={setDraftRecoveryOpen}
          onResume={handleResumeDraft}
          onDiscard={handleDiscardDraft}
          draftDate={draftDate}
        />
      </div>
    </div>
  );
}
