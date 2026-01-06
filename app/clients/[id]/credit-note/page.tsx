'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, Invoice, CreditNote } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Info, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditNoteDialog } from '@/components/credit-note-dialog';
import { DraftRecoveryDialog } from '@/components/draft-recovery-dialog';
import { useCreditNoteDraft } from '@/hooks/use-credit-note-draft';

export default function CreditNotePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [globalInvoices, setGlobalInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Credit note form
  const [creditNoteForm, setCreditNoteForm] = useState<{
    invoice_id: string;
    operation_name: string;
    quantity: string;
    unit_price: string;
  }>({
    invoice_id: '',
    operation_name: '',
    quantity: '',
    unit_price: ''
  });
  const [creditNoteConfirmDialogOpen, setCreditNoteConfirmDialogOpen] = useState(false);
  const [creatingCreditNote, setCreatingCreditNote] = useState(false);
  const [invoicePopoverOpen, setInvoicePopoverOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [creditNotePreviewDialogOpen, setCreditNotePreviewDialogOpen] = useState(false);

  // Draft recovery
  const draft = useCreditNoteDraft(clientId);
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
        console.log('[Draft Credit Note] Found draft info before loading client data');
        // Load the draft data to check if it contains meaningful credit note data
        let draftData = draft.loadDraftLocally();
        if (!draftData) {
          draftData = await draft.loadDraftFromServer();
        }
        
        if (draftData && draft.hasMeaningfulDraft(draftData)) {
          hasDraftData = true;
          console.log('[Draft Credit Note] Has meaningful draft, will skip form initialization');
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
            setCreditNoteForm(draftData);
          }
        }
      }
      
      // Mark draft check as done
      draftCheckDoneRef.current = true;
    };
    
    initPage();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Récupérer companyId
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

      // Load global invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      setGlobalInvoices(invoicesData || []);

      // Load credit notes
      const { data: creditNotesData, error: creditNotesError } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (creditNotesError) throw creditNotesError;
      setCreditNotes(creditNotesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteForm.invoice_id || !creditNoteForm.operation_name || !creditNoteForm.quantity || !creditNoteForm.unit_price) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const quantity = parseInt(creditNoteForm.quantity);
    const unitPrice = parseFloat(creditNoteForm.unit_price.replace(',', '.'));

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('La quantité doit être un nombre entier positif');
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast.error('Le prix unitaire doit être un nombre positif');
      return;
    }

    setCreditNoteConfirmDialogOpen(true);
  };

  const handleCreateCreditNote = async () => {
    if (!creditNoteForm.invoice_id || !creditNoteForm.operation_name || !creditNoteForm.quantity || !creditNoteForm.unit_price) {
      return;
    }

    setCreatingCreditNote(true);
    try {
      const quantity = parseInt(creditNoteForm.quantity);
      const unitPrice = parseFloat(creditNoteForm.unit_price.replace(',', '.'));
      const totalAmount = quantity * unitPrice;

      // Récupérer companyId
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Create credit note
      const { data: creditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .insert({
          invoice_id: creditNoteForm.invoice_id,
          client_id: clientId,
          company_id: companyId,
          unit_price: unitPrice,
          quantity: quantity,
          total_amount: totalAmount,
          operation_name: creditNoteForm.operation_name
        })
        .select()
        .single();

      if (creditNoteError) throw creditNoteError;

      if (!creditNote) {
        throw new Error('Erreur lors de la création de l\'avoir');
      }

      // Generate PDF
      const { generateAndSaveCreditNotePDF } = await import('@/lib/pdf-generators');
      
      const invoice = globalInvoices.find(inv => inv.id === creditNoteForm.invoice_id);
      if (!invoice) {
        throw new Error('Facture non trouvée');
      }

      if (!client) {
        throw new Error('Client non trouvé');
      }

      // Load user profile
      const { data: userProfileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', companyId)
        .limit(1)
        .maybeSingle();

      await generateAndSaveCreditNotePDF({
        creditNote: creditNote as CreditNote,
        invoice,
        client,
        userProfile: userProfileData
      });

      // Reload credit notes
      const { data: creditNotesData, error: creditNotesError } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (creditNotesError) throw creditNotesError;
      setCreditNotes(creditNotesData || []);

      // Delete draft after successful credit note creation
      try {
        await draft.deleteDraft();
        console.log('[Draft Credit Note] Draft deleted after successful credit note creation');
      } catch (error) {
        console.error('[Draft Credit Note] Error deleting draft after credit note creation:', error);
        // Don't show error to user, credit note was created successfully
      }

      toast.success('Avoir créé avec succès');
      setCreditNoteConfirmDialogOpen(false);
      setCreditNoteForm({
        invoice_id: '',
        operation_name: '',
        quantity: '',
        unit_price: ''
      });
      setInvoicePopoverOpen(false);
    } catch (error) {
      console.error('Error creating credit note:', error);
      toast.error('Erreur lors de la création de l\'avoir');
    } finally {
      setCreatingCreditNote(false);
    }
  };

  // Draft recovery handlers
  const handleResumeDraft = async () => {
    try {
      console.log('[Draft Credit Note] User confirmed to resume draft (data already loaded)');
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
      console.log('[Draft Credit Note] Discarding draft for client:', clientId);
      
      // CRITICAL: Mark draft check as not done temporarily to prevent auto-save
      // from recreating the draft while we're deleting it
      draftCheckDoneRef.current = false;
      
      // Delete the draft
      await draft.deleteDraft();
      
      console.log('[Draft Credit Note] Draft deleted successfully, reinitializing form');
      
      // Reinitialize form with default values
      setCreditNoteForm({
        invoice_id: '',
        operation_name: '',
        quantity: '',
        unit_price: ''
      });
      
      // Re-enable auto-save after a short delay
      setTimeout(() => {
        draftCheckDoneRef.current = true;
        console.log('[Draft Credit Note] Auto-save re-enabled after draft deletion');
      }, 1000);
      
      setDraftRecoveryOpen(false);
      setHasDraft(false);
      
      toast.success('Brouillon supprimé avec succès');
    } catch (error) {
      console.error('[Draft Credit Note] Error discarding draft:', error);
      toast.error('Erreur lors de la suppression du brouillon');
      // Re-enable draft check even on error
      draftCheckDoneRef.current = true;
      setDraftRecoveryOpen(false);
      setHasDraft(false);
    }
  };

  // Auto-save draft when creditNoteForm changes
  useEffect(() => {
    // Don't autosave while loading or if draft check hasn't completed
    if (loading || !draftCheckDoneRef.current) {
      console.log('[Draft Credit Note] AutoSave disabled: loading or draft check not done');
      return;
    }
    
    // Don't autosave while the recovery dialog is open (user hasn't made a choice yet)
    if (draftRecoveryOpen) {
      console.log('[Draft Credit Note] AutoSave disabled: draft recovery dialog is open');
      return;
    }
    
    if (!loading && client && !creatingCreditNote) {
      draft.autoSave(creditNoteForm);
    }
  }, [creditNoteForm, loading, client, creatingCreditNote, draftRecoveryOpen, draft]); // eslint-disable-line react-hooks/exhaustive-deps

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

        <div className="space-y-6">
          {/* Créer un avoir */}
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Créer un avoir</CardTitle>
              <CardDescription>
                Renseignez les informations pour générer un avoir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreditNoteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="credit-note-invoice">Facture d'origine</Label>
                  <Popover open={invoicePopoverOpen} onOpenChange={setInvoicePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full mt-1.5 justify-between"
                        type="button"
                      >
                        {creditNoteForm.invoice_id
                          ? globalInvoices.find(inv => inv.id === creditNoteForm.invoice_id)?.invoice_number || 'Facture sélectionnée'
                          : 'Sélectionner une facture...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[400px] p-0" 
                      align="start" 
                      style={{ zIndex: 9999 }}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command>
                        <CommandInput placeholder="Rechercher une facture..." autoFocus />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>Aucune facture trouvée</CommandEmpty>
                          <CommandGroup>
                            {globalInvoices.map((invoice) => (
                              <CommandItem
                                key={invoice.id}
                                value={`${invoice.invoice_number || 'Facture'} - ${new Date(invoice.created_at).toLocaleDateString('fr-FR')} - ${invoice.total_amount.toFixed(2)} €`}
                                onSelect={() => {
                                  setCreditNoteForm(f => ({ ...f, invoice_id: invoice.id }));
                                  setInvoicePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    creditNoteForm.invoice_id === invoice.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {invoice.invoice_number || 'Facture'} - {new Date(invoice.created_at).toLocaleDateString('fr-FR')} - {invoice.total_amount.toFixed(2)} €
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="credit-note-operation">Produits et prestations</Label>
                  <Textarea
                    id="credit-note-operation"
                    value={creditNoteForm.operation_name}
                    onChange={(e) => setCreditNoteForm(f => ({ ...f, operation_name: e.target.value }))}
                    placeholder="Ex: Retour de marchandise"
                    className="mt-1.5 min-h-[120px]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="credit-note-quantity">Quantité</Label>
                  <Input
                    id="credit-note-quantity"
                    type="number"
                    min="1"
                    value={creditNoteForm.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setCreditNoteForm(f => ({ ...f, quantity: value }));
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Ex: 10"
                    className="mt-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="credit-note-unit-price">Prix à l'unité (€)</Label>
                  <Input
                    id="credit-note-unit-price"
                    type="text"
                    inputMode="decimal"
                    value={creditNoteForm.unit_price}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setCreditNoteForm(f => ({ ...f, unit_price: value }));
                      }
                    }}
                    placeholder="Ex: 2.00"
                    className="mt-1.5"
                    required
                  />
                </div>
                {creditNoteForm.unit_price && creditNoteForm.quantity && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-700">
                      Montant total HT : {(parseFloat(creditNoteForm.unit_price.replace(',', '.')) * parseInt(creditNoteForm.quantity || '0')).toFixed(2)} €
                    </p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.push(`/clients/${clientId}`)}>
                  Annuler
                </Button>
                  <Button type="submit" disabled={creatingCreditNote}>
                    {creatingCreditNote ? 'Création en cours...' : 'Créer un avoir'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Credit Note Confirmation Dialog */}
        <Dialog open={creditNoteConfirmDialogOpen} onOpenChange={setCreditNoteConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Récapitulatif de l'avoir</DialogTitle>
              <DialogDescription>
                <div className="space-y-2 mt-2">
                  <p><strong>Facture d'origine :</strong> {globalInvoices.find(inv => inv.id === creditNoteForm.invoice_id)?.invoice_number || 'N/A'}</p>
                  <p><strong>Produits et prestations :</strong> {creditNoteForm.operation_name}</p>
                  <p><strong>Quantité :</strong> {creditNoteForm.quantity}</p>
                  <p><strong>Prix unitaire :</strong> {creditNoteForm.unit_price} €</p>
                  <p><strong>Montant total HT :</strong> {(parseFloat(creditNoteForm.unit_price.replace(',', '.')) * parseInt(creditNoteForm.quantity || '0')).toFixed(2)} €</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreditNoteConfirmDialogOpen(false);
                }}
                disabled={creatingCreditNote}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleCreateCreditNote}
                disabled={creatingCreditNote}
              >
                {creatingCreditNote ? 'Création en cours...' : 'Créer l\'avoir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {client && selectedCreditNote && (() => {
          const relatedInvoice = globalInvoices.find(inv => inv.id === selectedCreditNote.invoice_id);
          if (!relatedInvoice) return null;
          return (
            <CreditNoteDialog
              open={creditNotePreviewDialogOpen}
              onOpenChange={setCreditNotePreviewDialogOpen}
              client={client}
              creditNote={selectedCreditNote}
              invoice={relatedInvoice}
            />
          );
        })()}

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

