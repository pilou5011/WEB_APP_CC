'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, EstablishmentType, PaymentMethod } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Building2, MapPin, Phone, FileText, Plus, X, Settings, MessageSquare, Check, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { EstablishmentTypesManager } from '@/components/establishment-types-manager';
import { PaymentMethodsManager } from '@/components/payment-methods-manager';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { OpeningHoursEditor, WeekSchedule, getDefaultWeekSchedule, validateWeekSchedule } from '@/components/opening-hours-editor';
import { MarketDaysEditor, MarketDaysSchedule, getDefaultMarketDaysSchedule, validateMarketDaysSchedule } from '@/components/market-days-editor';
import { VacationPeriodsEditor, VacationPeriod, validateVacationPeriods } from '@/components/vacation-periods-editor';
import { getDepartmentFromPostalCode, formatDepartment } from '@/lib/postal-code-utils';
import { AddressAutocomplete } from '@/components/address-autocomplete';

// Générer les options d'heures (00 à 23) - identiques aux horaires d'ouverture
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// Options de minutes - identiques aux horaires d'ouverture
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

export default function NewClientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [establishmentTypes, setEstablishmentTypes] = useState<EstablishmentType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [addingNewType, setAddingNewType] = useState(false);
  const [manageTypesDialogOpen, setManageTypesDialogOpen] = useState(false);
  const [editingEstablishmentType, setEditingEstablishmentType] = useState<EstablishmentType | null>(null);
  const [editEstablishmentTypeName, setEditEstablishmentTypeName] = useState('');
  const [deletingEstablishmentType, setDeletingEstablishmentType] = useState<EstablishmentType | null>(null);
  const [deleteEstablishmentTypeDialogOpen, setDeleteEstablishmentTypeDialogOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState('');
  const [showNewPaymentMethodInput, setShowNewPaymentMethodInput] = useState(false);
  const [addingNewPaymentMethod, setAddingNewPaymentMethod] = useState(false);
  const [managePaymentMethodsDialogOpen, setManagePaymentMethodsDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [editPaymentMethodName, setEditPaymentMethodName] = useState('');
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deletePaymentMethodDialogOpen, setDeletePaymentMethodDialogOpen] = useState(false);
  const [openingHours, setOpeningHours] = useState<WeekSchedule>(getDefaultWeekSchedule());
  const [marketDaysSchedule, setMarketDaysSchedule] = useState<MarketDaysSchedule>(getDefaultMarketDaysSchedule());
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    street_address: '',
    postal_code: '',
    city: '',
    department: '',
    latitude: null as number | null,
    longitude: null as number | null,
    phone: '',
    phone_1_info: '',
    phone_2: '',
    phone_2_info: '',
    phone_3: '',
    phone_3_info: '',
    siret_number: '',
    tva_number: '',
    client_number: '',
    establishment_type_id: '',
    visit_frequency_number: '',
    visit_frequency_unit: '',
    average_time_hours: '',
    average_time_minutes: '',
    payment_method_id: '',
    email: '',
    comment: ''
  });

  useEffect(() => {
    loadEstablishmentTypes();
    loadPaymentMethods();
  }, []);

  const loadEstablishmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('establishment_types')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setEstablishmentTypes(data || []);
    } catch (error) {
      console.error('Error loading establishment types:', error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handleAddNewPaymentMethod = async () => {
    if (!newPaymentMethodName.trim()) {
      toast.error('Veuillez saisir un nom de méthode de paiement');
      return;
    }

    setAddingNewPaymentMethod(true);
    try {
      // Vérifier si une méthode avec le même nom existe déjà (non supprimée)
      const { data: existing } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('name', newPaymentMethodName.trim())
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        toast.error('Cette méthode de paiement existe déjà');
        setAddingNewPaymentMethod(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{ name: newPaymentMethodName.trim() }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPaymentMethods([...paymentMethods, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, payment_method_id: data.id });
      setNewPaymentMethodName('');
      setShowNewPaymentMethodInput(false);
      toast.success('Méthode de paiement ajoutée');
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Erreur lors de l\'ajout de la méthode');
    } finally {
      setAddingNewPaymentMethod(false);
    }
  };

  const handleEditPaymentMethod = async () => {
    if (!editingPaymentMethod || !editPaymentMethodName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    try {
      // Vérifier si une autre méthode avec le même nom existe déjà (non supprimée)
      if (editPaymentMethodName.trim() !== editingPaymentMethod.name) {
        const { data: existing } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('name', editPaymentMethodName.trim())
          .is('deleted_at', null)
          .neq('id', editingPaymentMethod.id)
          .maybeSingle();

        if (existing) {
          toast.error('Ce nom existe déjà');
          return;
        }
      }

      const { error } = await supabase
        .from('payment_methods')
        .update({ name: editPaymentMethodName.trim() })
        .eq('id', editingPaymentMethod.id);

      if (error) {
        throw error;
      }

      await loadPaymentMethods();
      setEditingPaymentMethod(null);
      setEditPaymentMethodName('');
      toast.success('Méthode de paiement modifiée avec succès');
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeletePaymentMethodClick = (method: PaymentMethod) => {
    setDeletingPaymentMethod(method);
    setDeletePaymentMethodDialogOpen(true);
  };

  const handleDeletePaymentMethod = async () => {
    if (!deletingPaymentMethod) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingPaymentMethod.id);

      if (error) throw error;

      await loadPaymentMethods();
      if (formData.payment_method_id === deletingPaymentMethod.id) {
        setFormData({ ...formData, payment_method_id: '' });
      }
      setDeletePaymentMethodDialogOpen(false);
      setDeletingPaymentMethod(null);
      toast.success('Méthode de paiement supprimée avec succès');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Veuillez saisir un nom de type d\'établissement');
      return;
    }

    setAddingNewType(true);
    try {
      // Vérifier si un type avec le même nom existe déjà (non supprimé)
      const { data: existing } = await supabase
        .from('establishment_types')
        .select('id')
        .eq('name', newTypeName.trim())
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        toast.error('Ce type d\'établissement existe déjà');
        setAddingNewType(false);
        return;
      }

      const { data, error } = await supabase
        .from('establishment_types')
        .insert([{ name: newTypeName.trim() }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      await loadEstablishmentTypes();
      setFormData({ ...formData, establishment_type_id: data.id });
      setNewTypeName('');
      setShowNewTypeInput(false);
      toast.success('Type d\'établissement ajouté');
    } catch (error) {
      console.error('Error adding establishment type:', error);
      toast.error('Erreur lors de l\'ajout du type');
    } finally {
      setAddingNewType(false);
    }
  };

  const handleEditEstablishmentType = async () => {
    if (!editingEstablishmentType || !editEstablishmentTypeName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    try {
      // Vérifier si un autre type avec le même nom existe déjà (non supprimé)
      if (editEstablishmentTypeName.trim() !== editingEstablishmentType.name) {
        const { data: existing } = await supabase
          .from('establishment_types')
          .select('id')
          .eq('name', editEstablishmentTypeName.trim())
          .is('deleted_at', null)
          .neq('id', editingEstablishmentType.id)
          .maybeSingle();

        if (existing) {
          toast.error('Ce nom existe déjà');
          return;
        }
      }

      const { error } = await supabase
        .from('establishment_types')
        .update({ name: editEstablishmentTypeName.trim() })
        .eq('id', editingEstablishmentType.id);

      if (error) {
        throw error;
      }

      await loadEstablishmentTypes();
      setEditingEstablishmentType(null);
      setEditEstablishmentTypeName('');
      toast.success('Type modifié avec succès');
    } catch (error) {
      console.error('Error updating establishment type:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteEstablishmentTypeClick = (type: EstablishmentType) => {
    setDeletingEstablishmentType(type);
    setDeleteEstablishmentTypeDialogOpen(true);
  };

  const handleDeleteEstablishmentType = async () => {
    if (!deletingEstablishmentType) return;

    try {
      const { error } = await supabase
        .from('establishment_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingEstablishmentType.id);

      if (error) throw error;

      await loadEstablishmentTypes();
      if (formData.establishment_type_id === deletingEstablishmentType.id) {
        setFormData({ ...formData, establishment_type_id: '' });
      }
      setDeleteEstablishmentTypeDialogOpen(false);
      setDeletingEstablishmentType(null);
      toast.success('Type supprimé avec succès');
    } catch (error) {
      console.error('Error deleting establishment type:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation du nom commercial (obligatoire)
      if (!formData.name.trim()) {
        toast.error('Le nom commercial est obligatoire');
        setSubmitting(false);
        return;
      }

      // Validation du nom société (obligatoire)
      if (!formData.company_name.trim()) {
        toast.error('Le nom société est obligatoire');
        setSubmitting(false);
        return;
      }

      // Validation du code postal (5 chiffres)
      if (formData.postal_code && !/^\d{5}$/.test(formData.postal_code)) {
        toast.error('Le code postal doit contenir exactement 5 chiffres');
        setSubmitting(false);
        return;
      }

      // Validation du numéro de client (6 chiffres)
      if (formData.client_number && !/^\d{6}$/.test(formData.client_number)) {
        toast.error('Le numéro de client doit contenir exactement 6 chiffres');
        setSubmitting(false);
        return;
      }

      // Validation de la fréquence de passage
      let visitFrequencyNumber: number | null = null;
      if (formData.visit_frequency_number) {
        visitFrequencyNumber = parseInt(formData.visit_frequency_number);
        if (isNaN(visitFrequencyNumber) || visitFrequencyNumber < 1 || visitFrequencyNumber > 52) {
          toast.error('La fréquence de passage doit être entre 1 et 52');
          setSubmitting(false);
          return;
        }
      }

      // Validation des horaires d'ouverture
      const scheduleValidation = validateWeekSchedule(openingHours);
      if (!scheduleValidation.valid) {
        toast.error(scheduleValidation.message || 'Erreur de validation des horaires');
        setSubmitting(false);
        return;
      }

      // Validation des jours de marché avec horaires
      const marketDaysValidation = validateMarketDaysSchedule(marketDaysSchedule);
      if (!marketDaysValidation.valid) {
        toast.error(marketDaysValidation.message || 'Erreur de validation des jours de marché');
        setSubmitting(false);
        return;
      }

      // Validation des périodes de fermeture
      const vacationPeriodsValidation = validateVacationPeriods(vacationPeriods);
      if (!vacationPeriodsValidation.valid) {
        toast.error(vacationPeriodsValidation.message || 'Erreur de validation des périodes de fermeture');
        setSubmitting(false);
        return;
      }

      // Validation du temps moyen
      let averageTimeHours: number | null = null;
      let averageTimeMinutes: number | null = null;
      
      if (formData.average_time_hours) {
        averageTimeHours = parseInt(formData.average_time_hours);
        if (isNaN(averageTimeHours) || averageTimeHours < 0) {
          toast.error('Les heures doivent être un nombre positif ou zéro');
          setSubmitting(false);
          return;
        }
      }
      
      if (formData.average_time_minutes) {
        averageTimeMinutes = parseInt(formData.average_time_minutes);
        if (isNaN(averageTimeMinutes) || averageTimeMinutes < 0 || averageTimeMinutes >= 60) {
          toast.error('Les minutes doivent être entre 0 et 59');
          setSubmitting(false);
          return;
        }
      }

      // Construire l'adresse complète (obligatoire dans la base de données)
      const fullAddress = [formData.street_address, formData.postal_code, formData.city]
        .filter(Boolean)
        .join(', ') || 'Adresse non renseignée';

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: formData.name.trim(),
          company_name: formData.company_name.trim() || null,
          address: fullAddress,
          street_address: formData.street_address || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          department: formData.department || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          phone: formData.phone?.trim() || null,
          phone_1_info: formData.phone_1_info?.trim() || null,
          phone_2: formData.phone_2?.trim() || null,
          phone_2_info: formData.phone_2_info?.trim() || null,
          phone_3: formData.phone_3?.trim() || null,
          phone_3_info: formData.phone_3_info?.trim() || null,
          siret_number: formData.siret_number?.trim() || null,
          tva_number: formData.tva_number?.trim() || null,
          client_number: formData.client_number?.trim() || null,
          establishment_type_id: formData.establishment_type_id || null,
          opening_hours: openingHours,
          visit_frequency_number: visitFrequencyNumber,
          visit_frequency_unit: formData.visit_frequency_unit || null,
          average_time_hours: averageTimeHours,
          average_time_minutes: averageTimeMinutes,
          market_days_schedule: marketDaysSchedule,
          vacation_periods: vacationPeriods.length > 0 ? vacationPeriods : null,
          payment_method_id: formData.payment_method_id || null,
          email: formData.email?.trim() || null,
          comment: formData.comment?.trim() || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur détaillée:', error);
        // Vérifier si c'est une erreur de numéro de client dupliqué
        if (error.code === '23505') {
          if (error.message.includes('unique_client_number')) {
            toast.error('Ce numéro de client existe déjà');
          } else if (error.message.includes('clients_name_key')) {
            toast.error('Un client avec ce nom existe déjà');
          } else {
            toast.error('Une contrainte d\'unicité est violée');
          }
        } else if (error.code === '23502') {
          toast.error('Un champ obligatoire est manquant');
        } else {
          toast.error(`Erreur lors de la création : ${error.message || 'Erreur inconnue'}`);
        }
        setSubmitting(false);
        return;
      }

      toast.success('Client créé avec succès');
      // Rediriger vers la page du client créé
      router.push(`/clients/${data.id}`);
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erreur lors de la création du client');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/clients')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Nouveau client
            </CardTitle>
            <CardDescription>
              Renseignez toutes les informations du nouveau client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Building2 className="h-5 w-5" />
                  <h3>Informations générales</h3>
                </div>
                <Separator />
                
                <div>
                  <Label htmlFor="name">Nom Commercial *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Boutique du Centre"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="company_name">Nom Société *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                    placeholder="Ex: SARL Boutique du Centre"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">Raison sociale utilisée dans les factures</p>
                </div>

                {/* Type d'établissement */}
                <div>
                  <Label htmlFor="establishment_type">Type d'établissement (optionnel)</Label>
                  {!showNewTypeInput && !editingEstablishmentType ? (
                    <div className="flex gap-2 mt-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="flex-1 justify-between"
                          >
                            {formData.establishment_type_id
                              ? establishmentTypes.find(t => t.id === formData.establishment_type_id)?.name
                              : 'Sélectionner un type...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Rechercher un type..." />
                            <CommandList>
                              {establishmentTypes.length === 0 ? (
                                <CommandEmpty>
                                  <div className="py-6 text-center text-sm text-slate-400">
                                    Liste vide, veuillez ajouter un élément
                                  </div>
                                </CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {establishmentTypes.map((type) => (
                                    <div key={type.id} className="flex items-center group">
                                      <CommandItem
                                        value={type.id}
                                        onSelect={() => {
                                          setFormData({ ...formData, establishment_type_id: type.id });
                                        }}
                                        className="flex-1"
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            formData.establishment_type_id === type.id ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {type.name}
                                      </CommandItem>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEstablishmentType(type);
                                          setEditEstablishmentTypeName(type.name);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEstablishmentTypeClick(type);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewTypeInput(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : editingEstablishmentType ? (
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        value={editEstablishmentTypeName}
                        onChange={(e) => setEditEstablishmentTypeName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleEditEstablishmentType();
                          } else if (e.key === 'Escape') {
                            setEditingEstablishmentType(null);
                            setEditEstablishmentTypeName('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleEditEstablishmentType}
                      >
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingEstablishmentType(null);
                          setEditEstablishmentTypeName('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        placeholder="Nouveau type..."
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewType();
                          } else if (e.key === 'Escape') {
                            setShowNewTypeInput(false);
                            setNewTypeName('');
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={handleAddNewType}
                        disabled={addingNewType}
                      >
                        {addingNewType ? '...' : 'Ajouter'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowNewTypeInput(false);
                          setNewTypeName('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="client_number">Numéro de client</Label>
                  <Input
                    id="client_number"
                    value={formData.client_number}
                    onChange={(e) => setFormData({ ...formData, client_number: e.target.value })}
                    placeholder="6 chiffres (ex: 000001)"
                    maxLength={6}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">6 chiffres exactement</p>
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <MapPin className="h-5 w-5" />
                  <h3>Adresse</h3>
                </div>
                <Separator />
                
                <AddressAutocomplete
                  streetValue={formData.street_address}
                  postalCodeValue={formData.postal_code}
                  cityValue={formData.city}
                  onStreetChange={(value) => setFormData(prev => ({ ...prev, street_address: value }))}
                  onPostalCodeChange={(value) => {
                    const department = getDepartmentFromPostalCode(value);
                    setFormData(prev => ({ ...prev, postal_code: value, department: department || '' }));
                  }}
                  onCityChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                  onCoordinatesChange={(lat, lon) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }))}
                  streetLabel="Numéro et libellé de voie"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Département</Label>
                    <Input
                      id="department"
                      value={formData.department ? formatDepartment(formData.department) : ''}
                      readOnly
                      placeholder="Auto-complété depuis le code postal"
                      className="mt-1.5 bg-slate-50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Auto-complété en fonction du code postal</p>
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Phone className="h-5 w-5" />
                  <h3>Coordonnées</h3>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Téléphone 1</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01 23 45 67 89"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_1_info">Info Tél 1 (ex: nom du correspondant)</Label>
                    <Input
                      id="phone_1_info"
                      value={formData.phone_1_info}
                      onChange={(e) => setFormData({ ...formData, phone_1_info: e.target.value })}
                      placeholder="Ex: Responsable"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_2">Téléphone 2</Label>
                    <Input
                      id="phone_2"
                      type="tel"
                      value={formData.phone_2}
                      onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                      placeholder="01 23 45 67 89"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_2_info">Info Tél 2 (ex: nom du correspondant)</Label>
                    <Input
                      id="phone_2_info"
                      value={formData.phone_2_info}
                      onChange={(e) => setFormData({ ...formData, phone_2_info: e.target.value })}
                      placeholder="Ex: Marie Dupont"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_3">Téléphone 3</Label>
                    <Input
                      id="phone_3"
                      type="tel"
                      value={formData.phone_3}
                      onChange={(e) => setFormData({ ...formData, phone_3: e.target.value })}
                      placeholder="01 23 45 67 89"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_3_info">Info Tél 3 (ex: nom du correspondant)</Label>
                    <Input
                      id="phone_3_info"
                      value={formData.phone_3_info}
                      onChange={(e) => setFormData({ ...formData, phone_3_info: e.target.value })}
                      placeholder="Ex: Jean Martin"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@exemple.fr"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Informations légales */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <FileText className="h-5 w-5" />
                  <h3>Informations légales</h3>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siret_number">Numéro SIRET</Label>
                    <Input
                      id="siret_number"
                      value={formData.siret_number}
                      onChange={(e) => setFormData({ ...formData, siret_number: e.target.value })}
                      placeholder="123 456 789 00012"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tva_number">Numéro TVA</Label>
                    <Input
                      id="tva_number"
                      value={formData.tva_number}
                      onChange={(e) => setFormData({ ...formData, tva_number: e.target.value })}
                      placeholder="Ex: FR12 345678901"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Informations complémentaires */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <MessageSquare className="h-5 w-5" />
                  <h3>Informations complémentaires</h3>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium mb-3 block">Horaires d'ouverture</Label>
                    <OpeningHoursEditor
                      value={openingHours}
                      onChange={setOpeningHours}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label>Fréquence de passage</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Select
                          value={formData.visit_frequency_number}
                          onValueChange={(value) => setFormData({ ...formData, visit_frequency_number: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 52 }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.visit_frequency_unit}
                          onValueChange={(value) => setFormData({ ...formData, visit_frequency_unit: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semaines">semaines</SelectItem>
                            <SelectItem value="mois">mois</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Temps moyen</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Select
                          value={formData.average_time_hours || ''}
                          onValueChange={(val) => {
                            setFormData({ 
                              ...formData, 
                              average_time_hours: val,
                              average_time_minutes: '00' // Réinitialiser les minutes à "00" quand une heure est sélectionnée
                            });
                          }}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue placeholder="--" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOUR_OPTIONS.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm">h</span>
                        <Select
                          value={formData.average_time_minutes || ''}
                          onValueChange={(val) => setFormData({ ...formData, average_time_minutes: val })}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue placeholder="--" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTE_OPTIONS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm">min</span>
                      </div>
                    </div>

                    <div>
                      <VacationPeriodsEditor
                        value={vacationPeriods}
                        onChange={setVacationPeriods}
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium mb-3 block">Jour(s) de marché</Label>
                      <MarketDaysEditor
                        value={marketDaysSchedule}
                        onChange={setMarketDaysSchedule}
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="payment_method_id" className="mb-1.5 block">Règlement (optionnel)</Label>
                      {!showNewPaymentMethodInput && !editingPaymentMethod ? (
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="flex-1 justify-between"
                              >
                                {formData.payment_method_id
                                  ? paymentMethods.find(m => m.id === formData.payment_method_id)?.name
                                  : 'Sélectionner une méthode...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Rechercher une méthode..." />
                                <CommandList>
                                  {paymentMethods.length === 0 ? (
                                    <CommandEmpty>
                                      <div className="py-6 text-center text-sm text-slate-400">
                                        Liste vide, veuillez ajouter un élément
                                      </div>
                                    </CommandEmpty>
                                  ) : (
                                    <CommandGroup>
                                      {paymentMethods.map((method) => (
                                        <div key={method.id} className="flex items-center group">
                                          <CommandItem
                                            value={method.id}
                                            onSelect={() => {
                                              setFormData({ ...formData, payment_method_id: method.id });
                                            }}
                                            className="flex-1"
                                          >
                                            <Check
                                              className={cn(
                                                'mr-2 h-4 w-4',
                                                formData.payment_method_id === method.id ? 'opacity-100' : 'opacity-0'
                                              )}
                                            />
                                            {method.name}
                                          </CommandItem>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingPaymentMethod(method);
                                              setEditPaymentMethodName(method.name);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeletePaymentMethodClick(method);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewPaymentMethodInput(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : editingPaymentMethod ? (
                        <div className="flex gap-2">
                          <Input
                            value={editPaymentMethodName}
                            onChange={(e) => setEditPaymentMethodName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEditPaymentMethod();
                              } else if (e.key === 'Escape') {
                                setEditingPaymentMethod(null);
                                setEditPaymentMethodName('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleEditPaymentMethod}
                          >
                            Enregistrer
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingPaymentMethod(null);
                              setEditPaymentMethodName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nouvelle méthode..."
                            value={newPaymentMethodName}
                            onChange={(e) => setNewPaymentMethodName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewPaymentMethod();
                              } else if (e.key === 'Escape') {
                                setShowNewPaymentMethodInput(false);
                                setNewPaymentMethodName('');
                              }
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            type="button"
                            onClick={handleAddNewPaymentMethod}
                            disabled={addingNewPaymentMethod}
                          >
                            {addingNewPaymentMethod ? '...' : 'Ajouter'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowNewPaymentMethodInput(false);
                              setNewPaymentMethodName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="comment">Commentaire</Label>
                      <Textarea
                        id="comment"
                        value={formData.comment}
                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                        placeholder="Informations supplémentaires..."
                        className="mt-1.5 min-h-24"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/clients')}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Création...' : 'Créer le client'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Dialog de gestion des types d'établissement */}
        <EstablishmentTypesManager
          open={manageTypesDialogOpen}
          onOpenChange={setManageTypesDialogOpen}
          types={establishmentTypes}
          onTypesUpdated={loadEstablishmentTypes}
        />

        <PaymentMethodsManager
          open={managePaymentMethodsDialogOpen}
          onOpenChange={setManagePaymentMethodsDialogOpen}
          methods={paymentMethods}
          onMethodsUpdated={loadPaymentMethods}
        />

        {/* Dialog de confirmation de suppression - Type d'établissement */}
        <AlertDialog open={deleteEstablishmentTypeDialogOpen} onOpenChange={setDeleteEstablishmentTypeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce type d'établissement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le type "{deletingEstablishmentType?.name}" ?
                Les clients utilisant ce type ne seront pas supprimés, mais leur type sera réinitialisé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEstablishmentType}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmation de suppression - Méthode de paiement */}
        <AlertDialog open={deletePaymentMethodDialogOpen} onOpenChange={setDeletePaymentMethodDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette méthode de paiement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer la méthode "{deletingPaymentMethod?.name}" ?
                Les clients utilisant cette méthode ne seront pas supprimés, mais leur méthode de paiement sera réinitialisée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePaymentMethod}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

