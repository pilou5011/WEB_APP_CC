'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, Product, Invoice, StockDirectSold, UserProfile } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Info, Plus, Trash2, Check, ChevronsUpDown, Calculator, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { GlobalInvoiceDialog } from '@/components/global-invoice-dialog';
import { DraftRecoveryDialog } from '@/components/draft-recovery-dialog';
import { useInvoiceDraft } from '@/hooks/use-invoice-draft';

interface InvoiceRow {
  id: string;
  product_id: string | null;
  product_name: string;
  barcode: string;
  quantity: string;
  unit_price_ht: number;
  total_ht: number;
  custom_price: number | null;
}

export default function InvoicePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([
    { id: '1', product_id: null, product_name: '', barcode: '', quantity: '', unit_price_ht: 0, total_ht: 0, custom_price: null }
  ]);
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceDialogRowId, setPriceDialogRowId] = useState<string | null>(null);
  const [priceType, setPriceType] = useState<'default' | 'custom'>('default');
  const [customPriceInput, setCustomPriceInput] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedGlobalInvoice, setSelectedGlobalInvoice] = useState<Invoice | null>(null);
  const [globalInvoiceDialogOpen, setGlobalInvoiceDialogOpen] = useState(false);

  // Draft recovery
  const draft = useInvoiceDraft(clientId);
  const [draftRecoveryOpen, setDraftRecoveryOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<string>('');
  const [hasDraft, setHasDraft] = useState(false);
  const draftCheckDoneRef = useRef(false); // Track if we've already checked for draft

  useEffect(() => {
    // Reset draft check flag when clientId changes (navigating to different client)
    draftCheckDoneRef.current = false;
    
    // Check for draft BEFORE loading client data
    const initPage = async () => {
      // First, check if there's a draft
      const draftInfo = await draft.getDraftInfo();
      let hasDraftData = false;
      
      if (draftInfo) {
        console.log('[Draft Invoice] Found draft info before loading client data');
        // Load the draft data to check if it contains meaningful invoice data
        let draftData = draft.loadDraftLocally();
        if (!draftData) {
          draftData = await draft.loadDraftFromServer();
        }
        
        if (draftData && draft.hasMeaningfulDraft(draftData)) {
          hasDraftData = true;
          console.log('[Draft Invoice] Has meaningful draft, will skip form initialization');
        }
      }
      
      // Load client data (which will initialize the form if no draft)
      await loadData();
      
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
            setRows(draftData.rows);
            setDiscountPercentage(draftData.discountPercentage);
          }
        }
      }
      
      // Mark draft check as done
      draftCheckDoneRef.current = true;
    };
    
    initPage();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Load client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        toast.error('Client non trouvé');
        router.push('/clients');
        return;
      }
      setClient(clientData);

      // Load all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');

      if (productsError) throw productsError;
      setAllProducts(productsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHT = (quantity: string, unitPrice: number): number => {
    const qty = parseInt(quantity) || 0;
    return qty * unitPrice;
  };

  const updateRowTotal = (rowId: string) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === rowId) {
        const total = calculateTotalHT(row.quantity, row.unit_price_ht);
        return { ...row, total_ht: total };
      }
      return row;
    }));
  };

  const handleQuantityChange = (rowId: string, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setRows(prevRows => prevRows.map(row => {
        if (row.id === rowId) {
          const newRow = { ...row, quantity: value };
          newRow.total_ht = calculateTotalHT(newRow.quantity, newRow.unit_price_ht);
          return newRow;
        }
        return row;
      }));
    }
  };

  const handleAddRow = () => {
    const newId = Date.now().toString();
    setRows(prevRows => [...prevRows, {
      id: newId,
      product_id: null,
      product_name: '',
      barcode: '',
      quantity: '',
      unit_price_ht: 0,
      total_ht: 0,
      custom_price: null
    }]);
  };

  const handleDeleteRow = (rowId: string) => {
    if (rows.length === 1) {
      toast.error('Au moins une ligne est requise');
      return;
    }
    setRows(prevRows => prevRows.filter(row => row.id !== rowId));
  };

  const handleSelectProduct = (rowId: string, productId: string) => {
    const product = allProducts.find(c => c.id === productId);
    if (!product) return;

    // Vérifier si le produit a déjà un prix personnalisé pour ce client
    // Pour l'instant, on utilise toujours le prix par défaut
    // L'utilisateur pourra modifier le prix via un dialog si nécessaire
    const selectedPrice = product.price;

    setRows(prevRows => prevRows.map(row => {
      if (row.id === rowId) {
        const newRow = {
          ...row,
          product_id: productId,
          product_name: product.name,
          barcode: product.barcode || '',
          unit_price_ht: selectedPrice,
          custom_price: null
        };
        newRow.total_ht = calculateTotalHT(newRow.quantity, newRow.unit_price_ht);
        return newRow;
      }
      return row;
    }));

    // Fermer le popover
    setOpenPopovers(prev => ({ ...prev, [rowId]: false }));
  };

  const handleOpenPriceDialog = (rowId: string) => {
    setPriceDialogRowId(rowId);
    const row = rows.find(r => r.id === rowId);
    if (row?.product_id) {
      setPriceType(row.custom_price !== null ? 'custom' : 'default');
      setCustomPriceInput(row.custom_price?.toString() || '');
    } else {
      setPriceType('default');
      setCustomPriceInput('');
    }
    setPriceDialogOpen(true);
  };

  const handleSavePrice = () => {
    if (!priceDialogRowId) return;

    const row = rows.find(r => r.id === priceDialogRowId);
    if (!row?.product_id) return;

    const product = allProducts.find(c => c.id === row.product_id);
    if (!product) return;

    const selectedPrice = priceType === 'custom' && customPriceInput
      ? parseFloat(customPriceInput.replace(',', '.'))
      : product.price;

    if (isNaN(selectedPrice) || selectedPrice < 0) {
      toast.error('Prix invalide');
      return;
    }

    setRows(prevRows => prevRows.map(r => {
      if (r.id === priceDialogRowId) {
        const newRow = {
          ...r,
          unit_price_ht: selectedPrice,
          custom_price: priceType === 'custom' ? selectedPrice : null
        };
        newRow.total_ht = calculateTotalHT(newRow.quantity, newRow.unit_price_ht);
        return newRow;
      }
      return r;
    }));

    setPriceDialogOpen(false);
    setPriceDialogRowId(null);
    setPriceType('default');
    setCustomPriceInput('');
  };

  const getTotalHT = (): number => {
    return rows.reduce((sum, row) => sum + row.total_ht, 0);
  };

  const getDiscountAmount = (): number => {
    if (!discountPercentage || discountPercentage <= 0) return 0;
    return (getTotalHT() * discountPercentage) / 100;
  };

  const getTotalHTAfterDiscount = (): number => {
    return getTotalHT() - getDiscountAmount();
  };

  const handleAddDiscount = () => {
    setDiscountInput('');
    setDiscountDialogOpen(true);
  };

  const handleSaveDiscount = () => {
    const discount = parseFloat(discountInput.replace(',', '.'));
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast.error('Le pourcentage de remise doit être entre 0 et 100');
      return;
    }
    setDiscountPercentage(discount);
    setDiscountDialogOpen(false);
    setDiscountInput('');
  };

  const handleRemoveDiscount = () => {
    setDiscountPercentage(null);
  };

  const handleGenerateInvoice = async () => {
    // Validate rows
    const validRows = rows.filter(row => row.product_id && row.quantity && parseInt(row.quantity) > 0);
    if (validRows.length === 0) {
      toast.error('Veuillez ajouter au moins une ligne avec un produit et une quantité');
      return;
    }

    // Calculate totals
    const totalHT = getTotalHT();
    const discountAmount = getDiscountAmount();
    const totalHTAfterDiscount = getTotalHTAfterDiscount();

    if (totalHTAfterDiscount < 0) {
      toast.error('Le montant total ne peut pas être négatif');
      return;
    }

    const totalQuantity = validRows.reduce((sum, row) => sum + (parseInt(row.quantity) || 0), 0);

    // Create invoice preview
    const previewInvoiceData: Invoice = {
      id: '',
      client_id: clientId,
      total_stock_sold: totalQuantity,
      total_amount: totalHTAfterDiscount,
      invoice_number: null, // Will be generated by trigger
      discount_percentage: discountPercentage && discountPercentage > 0 ? discountPercentage : null,
      invoice_pdf_path: null,
      stock_report_pdf_path: null,
      deposit_slip_pdf_path: null,
      invoice_email_sent_at: null,
      deposit_slip_email_sent_at: null,
      created_at: new Date().toISOString()
    };

    setPreviewInvoice(previewInvoiceData);
    setPreviewDialogOpen(true);
  };

  const handleConfirmGenerate = async () => {
    if (!client) return;

    setGeneratingInvoice(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Validate rows
      const validRows = rows.filter(row => row.product_id && row.quantity && parseInt(row.quantity) > 0);
      if (validRows.length === 0) {
        toast.error('Veuillez ajouter au moins une ligne avec un produit et une quantité');
        return;
      }

      // Calculate totals
      const totalHT = getTotalHT();
      const discountAmount = getDiscountAmount();
      const totalHTAfterDiscount = getTotalHTAfterDiscount();

      const totalQuantity = validRows.reduce((sum, row) => sum + (parseInt(row.quantity) || 0), 0);

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_id: clientId,
          company_id: companyId,
          total_stock_sold: totalQuantity,
          total_amount: totalHTAfterDiscount,
          discount_percentage: discountPercentage && discountPercentage > 0 ? discountPercentage : null
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) {
        throw new Error('Erreur lors de la création de la facture');
      }

      // Create stock_direct_sold entries
      const stockDirectSoldRows = validRows.map(row => ({
        client_id: clientId,
        invoice_id: invoiceData.id,
        company_id: companyId,
        product_id: row.product_id,
        sub_product_id: null,
        stock_sold: parseInt(row.quantity) || 0,
        unit_price_ht: row.unit_price_ht,
        total_amount_ht: row.total_ht
      }));

      const { error: stockError } = await supabase
        .from('stock_direct_sold')
        .insert(stockDirectSoldRows);

      if (stockError) throw stockError;

      // Generate invoice PDF (direct invoice)
      const { generateAndSaveDirectInvoicePDF } = await import('@/lib/pdf-generators-direct-invoice');

      // Load user profile
      const { data: userProfile } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', companyId)
        .limit(1)
        .maybeSingle();

      // Load stock_direct_sold entries for PDF generation
      const { data: stockDirectSoldData, error: stockDirectSoldError } = await supabase
        .from('stock_direct_sold')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      if (stockDirectSoldError) throw stockDirectSoldError;

      await generateAndSaveDirectInvoicePDF({
        invoice: invoiceData,
        client,
        products: allProducts,
        stockDirectSold: stockDirectSoldData || [],
        userProfile: userProfile || null
      });

      // Delete draft after successful invoice generation
      try {
        await draft.deleteDraft();
        console.log('[Draft Invoice] Draft deleted after successful invoice generation');
      } catch (error) {
        console.error('[Draft Invoice] Error deleting draft after invoice generation:', error);
        // Don't show error to user, invoice was created successfully
      }

      toast.success('Facture générée avec succès');
      setConfirmDialogOpen(false);
      setPreviewDialogOpen(false);

      // Recharger la facture avec les données à jour (notamment invoice_pdf_path)
      const { data: updatedInvoice, error: reloadError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceData.id)
        .eq('company_id', companyId)
        .single();
      
      if (!reloadError && updatedInvoice) {
        // Ouvrir automatiquement la prévisualisation de la facture générée
        setSelectedGlobalInvoice(updatedInvoice as Invoice);
        setGlobalInvoiceDialogOpen(true);
      }

      // Reset form
      setRows([{
        id: '1',
        product_id: null,
        product_name: '',
        barcode: '',
        quantity: '',
        unit_price_ht: 0,
        total_ht: 0,
        custom_price: null
      }]);
      setDiscountPercentage(null);

    } catch (error: any) {
      console.error('Error generating invoice:', error);
      
      // Afficher un message d'erreur plus spécifique
      if (error.message) {
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          toast.error('Erreur de sécurité. Veuillez contacter le support.');
        } else if (error.message.includes('company_id')) {
          toast.error('Erreur : identifiant entreprise manquant. Veuillez vous reconnecter.');
        } else if (error.code === '23503') {
          toast.error('Erreur : référence invalide. Vérifiez que le client existe.');
        } else if (error.code === '23505') {
          toast.error('Erreur : cette facture existe déjà.');
        } else {
          toast.error(`Erreur lors de la génération de la facture: ${error.message}`);
        }
      } else {
        toast.error('Erreur lors de la génération de la facture');
      }
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Draft recovery handlers
  const handleResumeDraft = async () => {
    try {
      console.log('[Draft Invoice] User confirmed to resume draft (data already loaded)');
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
      console.log('[Draft Invoice] Discarding draft for client:', clientId);
      
      // CRITICAL: Mark draft check as not done temporarily to prevent auto-save
      // from recreating the draft while we're deleting it
      draftCheckDoneRef.current = false;
      
      // Delete the draft
      await draft.deleteDraft();
      
      console.log('[Draft Invoice] Draft deleted successfully, reinitializing form');
      
      // Reinitialize form with default values
      setRows([{
        id: '1',
        product_id: null,
        product_name: '',
        barcode: '',
        quantity: '',
        unit_price_ht: 0,
        total_ht: 0,
        custom_price: null
      }]);
      setDiscountPercentage(null);
      
      // Re-enable auto-save after a short delay
      setTimeout(() => {
        draftCheckDoneRef.current = true;
        console.log('[Draft Invoice] Auto-save re-enabled after draft deletion');
      }, 1000);
      
      setDraftRecoveryOpen(false);
      setHasDraft(false);
      
      toast.success('Brouillon supprimé avec succès');
    } catch (error) {
      console.error('[Draft Invoice] Error discarding draft:', error);
      toast.error('Erreur lors de la suppression du brouillon');
      // Re-enable draft check even on error
      draftCheckDoneRef.current = true;
      setDraftRecoveryOpen(false);
      setHasDraft(false);
    }
  };

  // Auto-save draft when rows or discountPercentage changes
  useEffect(() => {
    // Don't autosave while loading or if draft check hasn't completed
    if (loading || !draftCheckDoneRef.current) {
      console.log('[Draft Invoice] AutoSave disabled: loading or draft check not done');
      return;
    }
    
    // Don't autosave while the recovery dialog is open (user hasn't made a choice yet)
    if (draftRecoveryOpen) {
      console.log('[Draft Invoice] AutoSave disabled: draft recovery dialog is open');
      return;
    }
    
    if (!loading && client && allProducts.length > 0 && !generatingInvoice) {
      draft.autoSave({
        rows,
        discountPercentage
      });
    }
  }, [rows, discountPercentage, loading, client, allProducts.length, generatingInvoice, draftRecoveryOpen, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push(`/clients/${clientId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la page client
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

        {/* Client name header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">{client.name}</h1>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle>Facturer</CardTitle>
            <CardDescription>
              Générez une facture directe sans bon de dépôt ni relevé de stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Tableau de facturation */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Produit</TableHead>
                      <TableHead className="w-[15%]">Code barre</TableHead>
                      <TableHead className="w-[15%]">Quantité</TableHead>
                      <TableHead className="w-[15%]">PU HT</TableHead>
                      <TableHead className="w-[15%]">Total HT</TableHead>
                      <TableHead className="w-[15%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Popover 
                            open={openPopovers[row.id] || false} 
                            onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, [row.id]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                type="button"
                              >
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
                                    {allProducts.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.name}
                                        onSelect={() => handleSelectProduct(row.id, product.id)}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            row.product_id === product.id ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {product.name} — {product.price.toFixed(2)} €
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{row.barcode || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={row.quantity}
                            onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0"
                            className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{row.unit_price_ht.toFixed(2)} €</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold">{row.total_ht.toFixed(2)} €</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {row.product_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenPriceDialog(row.id)}
                                className="h-8 w-8 p-0"
                                title="Modifier le prix"
                              >
                                <Pencil className="h-4 w-4 text-slate-600 hover:text-[#0B1F33]" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Supprimer la ligne"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Ligne Total */}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddRow}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter une ligne
                        </Button>
                      </TableCell>
                      <TableCell colSpan={3} className="text-right">
                        Total HT
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-bold">{getTotalHT().toFixed(2)} €</span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {/* Ligne Remise si applicable */}
                    {discountPercentage !== null && discountPercentage > 0 && (
                      <>
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={4} className="text-right">
                            Remise commerciale ({discountPercentage.toFixed(2)}%)
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-red-600">
                              -{getDiscountAmount().toFixed(2)} €
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveDiscount}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100 font-bold">
                          <TableCell colSpan={4} className="text-right">
                            Total HT après remise
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-bold">{getTotalHTAfterDiscount().toFixed(2)} €</span>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleAddDiscount}
                  disabled={getTotalHT() === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une remise commerciale
                </Button>
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={rows.filter(r => r.product_id && r.quantity && parseInt(r.quantity) > 0).length === 0}
                  className="bg-black text-white hover:bg-black/90"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Générer une facture
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de modification de prix */}
        <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le prix</DialogTitle>
              <DialogDescription>
                Choisissez le prix de cession pour ce produit
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {priceDialogRowId && (() => {
                const row = rows.find(r => r.id === priceDialogRowId);
                const product = row?.product_id ? allProducts.find(c => c.id === row.product_id) : null;
                return product ? (
                  <div>
                    <Label>Prix de cession (HT)</Label>
                    <RadioGroup
                      value={priceType}
                      onValueChange={(val: 'default' | 'custom') => {
                        setPriceType(val);
                        if (val === 'default') {
                          setCustomPriceInput('');
                        }
                      }}
                      className="mt-1.5"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="default" id="price-default" />
                        <Label htmlFor="price-default" className="font-normal cursor-pointer">
                          Utiliser le prix par défaut
                          <span className="ml-2 text-sm text-slate-600">
                            ({product.price.toFixed(2)} €)
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="price-custom" />
                        <Label htmlFor="price-custom" className="font-normal cursor-pointer">
                          Prix spécifique
                        </Label>
                      </div>
                    </RadioGroup>
                    {priceType === 'custom' && (
                      <div className="mt-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={customPriceInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(',', '.');
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setCustomPriceInput(value);
                            }
                          }}
                          placeholder="Ex: 2.50"
                          className="mt-1.5"
                        />
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPriceDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSavePrice}
                disabled={priceType === 'custom' && (!customPriceInput || isNaN(parseFloat(customPriceInput.replace(',', '.'))))}
              >
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de remise commerciale */}
        <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une remise commerciale</DialogTitle>
              <DialogDescription>
                Saisissez le pourcentage de remise (0-100)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Pourcentage de remise</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={discountInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setDiscountInput(value);
                    }
                  }}
                  placeholder="Ex: 10"
                  className="mt-1.5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDiscountDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSaveDiscount}
                disabled={!discountInput || isNaN(parseFloat(discountInput.replace(',', '.')))}
              >
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de prévisualisation */}
        <AlertDialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Récapitulatif de la facture</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Client</p>
                      <p className="text-sm text-[#0B1F33]">{client.company_name || client.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Nombre d'articles</p>
                      <p className="text-sm text-[#0B1F33]">
                        {rows.filter(r => r.product_id && r.quantity && parseInt(r.quantity) > 0).length}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Détail des lignes</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {rows.filter(r => r.product_id && r.quantity && parseInt(r.quantity) > 0).map((row) => (
                        <div key={row.id} className="flex justify-between text-sm">
                          <span>{row.product_name} × {row.quantity}</span>
                          <span className="font-medium">{row.total_ht.toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total HT</span>
                      <span className="text-sm font-bold">{getTotalHT().toFixed(2)} €</span>
                    </div>
                    {discountPercentage !== null && discountPercentage > 0 && (
                      <>
                        <div className="flex justify-between text-red-600">
                          <span className="text-sm">Remise ({discountPercentage.toFixed(2)}%)</span>
                          <span className="text-sm font-medium">-{getDiscountAmount().toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Total HT après remise</span>
                          <span className="text-sm font-bold">{getTotalHTAfterDiscount().toFixed(2)} €</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">TVA 20%</span>
                      <span className="text-sm font-bold">{(getTotalHTAfterDiscount() * 0.20).toFixed(2)} €</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-base font-bold">Total TTC</span>
                      <span className="text-base font-bold">{(getTotalHTAfterDiscount() * 1.20).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPreviewDialogOpen(false)}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setPreviewDialogOpen(false);
                setConfirmDialogOpen(true);
              }}>
                Valider et générer la facture
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmation finale */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la génération</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir générer cette facture ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialogOpen(false)}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmGenerate} disabled={generatingInvoice}>
                {generatingInvoice ? 'Génération en cours...' : 'Générer la facture'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de prévisualisation PDF */}
        {client && selectedGlobalInvoice && (
          <GlobalInvoiceDialog
            open={globalInvoiceDialogOpen}
            onOpenChange={setGlobalInvoiceDialogOpen}
            client={client}
            invoice={selectedGlobalInvoice}
            stockUpdates={[]}
            products={allProducts}
            clientProducts={[]}
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

