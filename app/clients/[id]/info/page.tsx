'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client, EstablishmentType } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Building2, MapPin, Phone, FileText, Edit, Plus, X, Settings, Clock, Mail, MessageSquare, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EstablishmentTypesManager } from '@/components/establishment-types-manager';
import { OpeningHoursEditor, WeekSchedule, getDefaultWeekSchedule, formatWeekSchedule, formatWeekScheduleData, validateWeekSchedule } from '@/components/opening-hours-editor';
import { MarketDaysEditor, MarketDaysSchedule, getDefaultMarketDaysSchedule, formatMarketDaysScheduleData, validateMarketDaysSchedule } from '@/components/market-days-editor';
import { VacationPeriodsEditor, VacationPeriod, validateVacationPeriods, formatVacationPeriods } from '@/components/vacation-periods-editor';
import { getDepartmentFromPostalCode, formatDepartment } from '@/lib/postal-code-utils';
import { AddressAutocomplete } from '@/components/address-autocomplete';

export default function ClientInfoPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [establishmentTypes, setEstablishmentTypes] = useState<EstablishmentType[]>([]);
  const [establishmentTypeName, setEstablishmentTypeName] = useState<string>('');
  const [newTypeName, setNewTypeName] = useState('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [addingNewType, setAddingNewType] = useState(false);
  const [manageTypesDialogOpen, setManageTypesDialogOpen] = useState(false);
  const [openingHours, setOpeningHours] = useState<WeekSchedule>(getDefaultWeekSchedule());
  const [marketDaysSchedule, setMarketDaysSchedule] = useState<MarketDaysSchedule>(getDefaultMarketDaysSchedule());
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [formData, setFormData] = useState({
    name: '',
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
    rcs_number: '',
    naf_code: '',
    client_number: '',
    establishment_type_id: '',
    visit_frequency_number: '',
    visit_frequency_unit: '',
    average_time_hours: '',
    average_time_minutes: '',
    vacation_start_date: '',
    vacation_end_date: '',
    closing_day: '',
    payment_method: '',
    email: '',
    comment: ''
  });

  useEffect(() => {
    loadClient();
    loadEstablishmentTypes();
  }, [clientId]);

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Client non trouvé');
        router.push('/clients');
        return;
      }

      setClient(data);
      
      // Charger le nom du type d'établissement si présent
      if (data.establishment_type_id) {
        const { data: typeData } = await supabase
          .from('establishment_types')
          .select('name')
          .eq('id', data.establishment_type_id)
          .single();
        
        if (typeData) {
          setEstablishmentTypeName(typeData.name);
        }
      }

      // Charger les horaires d'ouverture et fusionner avec le schedule par défaut
      const defaultSchedule = getDefaultWeekSchedule();
      if (data.opening_hours) {
        // Fusionner les données existantes avec les valeurs par défaut pour garantir que tous les jours existent
        const loadedSchedule = data.opening_hours as any;
        const mergedSchedule = { ...defaultSchedule };
        
        Object.keys(defaultSchedule).forEach((day) => {
          if (loadedSchedule[day]) {
            mergedSchedule[day as keyof WeekSchedule] = loadedSchedule[day];
          }
        });
        
        setOpeningHours(mergedSchedule);
      } else {
        setOpeningHours(defaultSchedule);
      }

      // Charger les jours de marché avec horaires
      const defaultMarketSchedule = getDefaultMarketDaysSchedule();
      if (data.market_days_schedule) {
        const loadedMarketSchedule = data.market_days_schedule as any;
        const mergedMarketSchedule = { ...defaultMarketSchedule };
        
        Object.keys(defaultMarketSchedule).forEach((day) => {
          if (loadedMarketSchedule[day]) {
            mergedMarketSchedule[day as keyof MarketDaysSchedule] = loadedMarketSchedule[day];
          }
        });
        
        setMarketDaysSchedule(mergedMarketSchedule);
      } else {
        setMarketDaysSchedule(defaultMarketSchedule);
      }

      // Charger les périodes de vacances avec migration des anciennes données
      if (data.vacation_periods && Array.isArray(data.vacation_periods) && data.vacation_periods.length > 0) {
        const migratedPeriods = data.vacation_periods.map((period: any) => {
          // Migration : si inputType n'existe pas, c'est une ancienne donnée
          if (!period.inputType) {
            let year: number | undefined = undefined;
            
            if (!period.isRecurring && period.startDate) {
              const dateYear = new Date(period.startDate).getFullYear();
              // Si l'année n'est pas 2000, c'est une vraie année
              // Si c'est 2000, on cherche dans period.year s'il existe
              if (dateYear !== 2000) {
                year = dateYear;
              } else if (period.year) {
                year = period.year;
              }
            }
            
            return {
              ...period,
              inputType: 'dates' as const,
              year
            };
          }
          return period;
        });
        setVacationPeriods(migratedPeriods as VacationPeriod[]);
      } else {
        setVacationPeriods([]);
      }
      
      // Auto-compléter le département si non présent mais code postal disponible
      const department = data.department || (data.postal_code ? getDepartmentFromPostalCode(data.postal_code) : null);
      
      setFormData({
        name: data.name || '',
        street_address: data.street_address || '',
        postal_code: data.postal_code || '',
        city: data.city || '',
        department: department || '',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        phone: data.phone || '',
        phone_1_info: data.phone_1_info || '',
        phone_2: data.phone_2 || '',
        phone_2_info: data.phone_2_info || '',
        phone_3: data.phone_3 || '',
        phone_3_info: data.phone_3_info || '',
        rcs_number: data.rcs_number || '',
        naf_code: data.naf_code || '',
        client_number: data.client_number || '',
        establishment_type_id: data.establishment_type_id || '',
        visit_frequency_number: data.visit_frequency_number?.toString() || '',
        visit_frequency_unit: data.visit_frequency_unit || '',
        average_time_hours: data.average_time_hours?.toString() || '',
        average_time_minutes: data.average_time_minutes?.toString() || '',
        vacation_start_date: data.vacation_start_date || '',
        vacation_end_date: data.vacation_end_date || '',
        closing_day: data.closing_day || '',
        payment_method: data.payment_method || '',
        email: data.email || '',
        comment: data.comment || ''
      });
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Erreur lors du chargement du client');
    } finally {
      setLoading(false);
    }
  };

  const loadEstablishmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('establishment_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setEstablishmentTypes(data || []);
    } catch (error) {
      console.error('Error loading establishment types:', error);
    }
  };

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Veuillez saisir un nom de type d\'établissement');
      return;
    }

    setAddingNewType(true);
    try {
      const { data, error } = await supabase
        .from('establishment_types')
        .insert([{ name: newTypeName.trim() }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce type d\'établissement existe déjà');
        } else {
          throw error;
        }
        setAddingNewType(false);
        return;
      }

      setEstablishmentTypes([...establishmentTypes, data].sort((a, b) => a.name.localeCompare(b.name)));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
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

      // Validation des périodes de vacances
      const vacationPeriodsValidation = validateVacationPeriods(vacationPeriods);
      if (!vacationPeriodsValidation.valid) {
        toast.error(vacationPeriodsValidation.message || 'Erreur de validation des périodes de vacances');
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


      const { data, error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          address: `${formData.street_address}, ${formData.postal_code} ${formData.city}`,
          street_address: formData.street_address,
          postal_code: formData.postal_code,
          city: formData.city,
          department: formData.department || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          phone: formData.phone || null,
          phone_1_info: formData.phone_1_info || null,
          phone_2: formData.phone_2 || null,
          phone_2_info: formData.phone_2_info || null,
          phone_3: formData.phone_3 || null,
          phone_3_info: formData.phone_3_info || null,
          rcs_number: formData.rcs_number || null,
          naf_code: formData.naf_code || null,
          client_number: formData.client_number || null,
          establishment_type_id: formData.establishment_type_id || null,
          opening_hours: openingHours,
          visit_frequency_number: visitFrequencyNumber,
          visit_frequency_unit: formData.visit_frequency_unit || null,
          average_time_hours: averageTimeHours,
          average_time_minutes: averageTimeMinutes,
          market_days_schedule: marketDaysSchedule,
          vacation_periods: vacationPeriods.length > 0 ? vacationPeriods : null,
          payment_method: formData.payment_method || null,
          email: formData.email || null,
          comment: formData.comment || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        // Vérifier si c'est une erreur de numéro de client dupliqué
        if (error.code === '23505' && error.message.includes('unique_client_number')) {
          toast.error('Ce numéro de client existe déjà');
        } else {
          throw error;
        }
        setSubmitting(false);
        return;
      }

      setClient(data);
      
      // Recharger le nom du type d'établissement
      if (data.establishment_type_id) {
        const { data: typeData } = await supabase
          .from('establishment_types')
          .select('name')
          .eq('id', data.establishment_type_id)
          .single();
        
        if (typeData) {
          setEstablishmentTypeName(typeData.name);
        }
      } else {
        setEstablishmentTypeName('');
      }

      // Mettre à jour les horaires d'ouverture affichés
      const defaultSchedule = getDefaultWeekSchedule();
      if (data.opening_hours) {
        const loadedSchedule = data.opening_hours as any;
        const mergedSchedule = { ...defaultSchedule };
        
        Object.keys(defaultSchedule).forEach((day) => {
          if (loadedSchedule[day]) {
            mergedSchedule[day as keyof WeekSchedule] = loadedSchedule[day];
          }
        });
        
        setOpeningHours(mergedSchedule);
      } else {
        setOpeningHours(defaultSchedule);
      }

      // Mettre à jour les jours de marché avec horaires
      const defaultMarketSchedule = getDefaultMarketDaysSchedule();
      if (data.market_days_schedule) {
        const loadedMarketSchedule = data.market_days_schedule as any;
        const mergedMarketSchedule = { ...defaultMarketSchedule };
        
        Object.keys(defaultMarketSchedule).forEach((day) => {
          if (loadedMarketSchedule[day]) {
            mergedMarketSchedule[day as keyof MarketDaysSchedule] = loadedMarketSchedule[day];
          }
        });
        
        setMarketDaysSchedule(mergedMarketSchedule);
      } else {
        setMarketDaysSchedule(defaultMarketSchedule);
      }

      // Mettre à jour les périodes de vacances
      if (data.vacation_periods && Array.isArray(data.vacation_periods) && data.vacation_periods.length > 0) {
        setVacationPeriods(data.vacation_periods as VacationPeriod[]);
      } else {
        setVacationPeriods([]);
      }
      
      toast.success('Informations mises à jour avec succès');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour des informations');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!client) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        let errorMessage = 'Erreur lors de la suppression du client';
        
        if (error.code === '23503') {
          errorMessage = 'Impossible de supprimer ce client : il est référencé dans d\'autres enregistrements (collections, factures, etc.)';
        } else if (error.message) {
          errorMessage = `Erreur : ${error.message}`;
        }
        
        toast.error(errorMessage);
        setDeleting(false);
        return;
      }

      toast.success(`Client "${client.name}" supprimé avec succès`);
      router.push('/clients');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error?.message || 'Erreur inattendue lors de la suppression du client');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  // Vue d'affichage
  if (!isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="flex gap-3 mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push(`/clients/${clientId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au client
            </Button>
          </div>

          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Building2 className="h-8 w-8" />
                    {client.name}
                  </CardTitle>
                  <CardDescription>
                    Détails complets du client
                  </CardDescription>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier infos client
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Informations générales */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Building2 className="h-5 w-5" />
                    <h3>Informations générales</h3>
                  </div>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-500 text-sm">Nom de la société</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.name || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Type d'établissement</Label>
                      <p className="text-lg font-medium mt-1">
                        {establishmentTypeName || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Numéro de client</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.client_number || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <MapPin className="h-5 w-5" />
                    <h3>Adresse</h3>
                  </div>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label className="text-slate-500 text-sm">Adresse</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.street_address || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Code postal</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.postal_code || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Ville</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.city || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Département</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.department ? formatDepartment(client.department) : (
                          client.postal_code ? (
                            formatDepartment(getDepartmentFromPostalCode(client.postal_code)) || <span className="text-slate-400">Non renseigné</span>
                          ) : (
                            <span className="text-slate-400">Non renseigné</span>
                          )
                        )}
                      </p>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-500 text-sm">Téléphone 1</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Info Tél 1</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone_1_info || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Téléphone 2</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone_2 || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Info Tél 2</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone_2_info || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Téléphone 3</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone_3 || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Info Tél 3</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone_3_info || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Email</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.email || <span className="text-slate-400">Non renseigné</span>}
                      </p>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-500 text-sm">Numéro RCS</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.rcs_number || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Code NAF</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.naf_code || <span className="text-slate-400">Non renseigné</span>}
                      </p>
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
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <Label className="text-slate-500 text-sm">Horaires d'ouverture</Label>
                      <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                        {client.opening_hours ? (
                          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-medium">
                            {formatWeekScheduleData(client.opening_hours).map((item, index) => (
                              <React.Fragment key={`schedule-${index}`}>
                                <div className="text-slate-600">{item.day}</div>
                                <div className="text-slate-800">{item.hours}</div>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Fréquence de passage</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.visit_frequency_number && client.visit_frequency_unit 
                          ? `${client.visit_frequency_number} ${client.visit_frequency_unit}`
                          : <span className="text-slate-400">Non renseigné</span>
                        }
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Temps moyen</Label>
                      <p className="text-lg font-medium mt-1">
                        {(client.average_time_hours !== null && client.average_time_hours !== undefined) || 
                         (client.average_time_minutes !== null && client.average_time_minutes !== undefined)
                          ? `${client.average_time_hours || 0}h${(client.average_time_minutes || 0).toString().padStart(2, '0')}`
                          : <span className="text-slate-400">Non renseigné</span>
                        }
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Jour(s) de marché</Label>
                      <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                        {client.market_days_schedule ? (
                          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-medium">
                            {formatMarketDaysScheduleData(client.market_days_schedule as any).map((item, index) => (
                              <React.Fragment key={`market-${index}`}>
                                <div className="text-slate-600">{item.day}</div>
                                <div className="text-slate-800">{item.hours}</div>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Période(s) de vacances</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.vacation_periods && Array.isArray(client.vacation_periods) && client.vacation_periods.length > 0
                          ? formatVacationPeriods(client.vacation_periods as VacationPeriod[])
                          : <span className="text-slate-400">Non renseigné</span>
                        }
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Règlement</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.payment_method || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-500 text-sm">Commentaire</Label>
                      <p className="text-base font-medium mt-1 whitespace-pre-wrap">
                        {client.comment || <span className="text-slate-400">Non renseigné</span>}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Vue d'édition
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              // Restaurer les données du client si on annule l'édition
              const department = client.department || (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);
              setFormData({
                name: client.name || '',
                street_address: client.street_address || '',
                postal_code: client.postal_code || '',
                city: client.city || '',
                department: department || '',
                latitude: client.latitude || null,
                longitude: client.longitude || null,
                phone: client.phone || '',
                phone_1_info: client.phone_1_info || '',
                phone_2: client.phone_2 || '',
                phone_2_info: client.phone_2_info || '',
                phone_3: client.phone_3 || '',
                phone_3_info: client.phone_3_info || '',
                rcs_number: client.rcs_number || '',
                naf_code: client.naf_code || '',
                client_number: client.client_number || '',
                establishment_type_id: client.establishment_type_id || '',
                visit_frequency_number: client.visit_frequency_number?.toString() || '',
                visit_frequency_unit: client.visit_frequency_unit || '',
                average_time_hours: client.average_time_hours?.toString() || '',
                average_time_minutes: client.average_time_minutes?.toString() || '',
                vacation_start_date: client.vacation_start_date || '',
                vacation_end_date: client.vacation_end_date || '',
                closing_day: client.closing_day || '',
                payment_method: client.payment_method || '',
                email: client.email || '',
                comment: client.comment || ''
              });
              const defaultSchedule = getDefaultWeekSchedule();
              if (client.opening_hours) {
                const loadedSchedule = client.opening_hours as any;
                const mergedSchedule = { ...defaultSchedule };
                
                Object.keys(defaultSchedule).forEach((day) => {
                  if (loadedSchedule[day]) {
                    mergedSchedule[day as keyof WeekSchedule] = loadedSchedule[day];
                  }
                });
                
                setOpeningHours(mergedSchedule);
              } else {
                setOpeningHours(defaultSchedule);
              }
              const defaultMarketSchedule = getDefaultMarketDaysSchedule();
              if (client.market_days_schedule) {
                const loadedMarketSchedule = client.market_days_schedule as any;
                const mergedMarketSchedule = { ...defaultMarketSchedule };
                
                Object.keys(defaultMarketSchedule).forEach((day) => {
                  if (loadedMarketSchedule[day]) {
                    mergedMarketSchedule[day as keyof MarketDaysSchedule] = loadedMarketSchedule[day];
                  }
                });
                
                setMarketDaysSchedule(mergedMarketSchedule);
              } else {
                setMarketDaysSchedule(defaultMarketSchedule);
              }
              if (client.vacation_periods && Array.isArray(client.vacation_periods) && client.vacation_periods.length > 0) {
                setVacationPeriods(client.vacation_periods as VacationPeriod[]);
              } else {
                setVacationPeriods([]);
              }
              setShowNewTypeInput(false);
              setNewTypeName('');
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              {client.name}
            </CardTitle>
            <CardDescription>
              Modifiez les informations du client
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
                  <Label htmlFor="name">Nom de la société *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Boutique du Centre"
                    className="mt-1.5"
                  />
                </div>

                {/* Type d'établissement */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label htmlFor="establishment_type">Type d'établissement</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setManageTypesDialogOpen(true)}
                      className="h-7 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Gérer les types
                    </Button>
                  </div>
                  {!showNewTypeInput ? (
                    <div className="flex gap-2">
                      <Select
                        value={formData.establishment_type_id}
                        onValueChange={(value) => setFormData({ ...formData, establishment_type_id: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Sélectionner un type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {establishmentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewTypeInput(true)}
                      >
                        <Plus className="h-4 w-4" />
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
                          }
                        }}
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
                    <Label htmlFor="rcs_number">Numéro RCS</Label>
                    <Input
                      id="rcs_number"
                      value={formData.rcs_number}
                      onChange={(e) => setFormData({ ...formData, rcs_number: e.target.value })}
                      placeholder="123 456 789"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="naf_code">Code NAF</Label>
                    <Input
                      id="naf_code"
                      value={formData.naf_code}
                      onChange={(e) => setFormData({ ...formData, naf_code: e.target.value })}
                      placeholder="Ex: 4759A"
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
                        <Input
                          type="number"
                          min="0"
                          value={formData.average_time_hours}
                          onChange={(e) => setFormData({ ...formData, average_time_hours: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0"
                          className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-sm">h</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={formData.average_time_minutes}
                          onChange={(e) => setFormData({ ...formData, average_time_minutes: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="00"
                          className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
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
                      <Label htmlFor="payment_method">Règlement</Label>
                      <p className="text-xs text-slate-500 mt-1">Ex: Virement, Chèque, Espèces, Carte bancaire...</p>
                      <Input
                        id="payment_method"
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        placeholder="Ex: Virement"
                        className="mt-1.5"
                      />
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

              <div className="flex justify-between items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={submitting || deleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer ce client
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                    setIsEditing(false);
                    // Restaurer les données du client si on annule l'édition
                    const department = client.department || (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);
                    setFormData({
                      name: client.name || '',
                      street_address: client.street_address || '',
                      postal_code: client.postal_code || '',
                      city: client.city || '',
                      department: department || '',
                      latitude: client.latitude || null,
                      longitude: client.longitude || null,
                      phone: client.phone || '',
                      phone_1_info: client.phone_1_info || '',
                      phone_2: client.phone_2 || '',
                      phone_2_info: client.phone_2_info || '',
                      phone_3: client.phone_3 || '',
                      phone_3_info: client.phone_3_info || '',
                      rcs_number: client.rcs_number || '',
                      naf_code: client.naf_code || '',
                      client_number: client.client_number || '',
                      establishment_type_id: client.establishment_type_id || '',
                      visit_frequency_number: client.visit_frequency_number?.toString() || '',
                      visit_frequency_unit: client.visit_frequency_unit || '',
                      average_time_hours: client.average_time_hours?.toString() || '',
                      average_time_minutes: client.average_time_minutes?.toString() || '',
                      vacation_start_date: client.vacation_start_date || '',
                      vacation_end_date: client.vacation_end_date || '',
                      closing_day: client.closing_day || '',
                      payment_method: client.payment_method || '',
                      email: client.email || '',
                      comment: client.comment || ''
                    });
                    const defaultSchedule = getDefaultWeekSchedule();
                    if (client.opening_hours) {
                      const loadedSchedule = client.opening_hours as any;
                      const mergedSchedule = { ...defaultSchedule };
                      
                      Object.keys(defaultSchedule).forEach((day) => {
                        if (loadedSchedule[day]) {
                          mergedSchedule[day as keyof WeekSchedule] = loadedSchedule[day];
                        }
                      });
                      
                      setOpeningHours(mergedSchedule);
                    } else {
                      setOpeningHours(defaultSchedule);
                    }
                    const defaultMarketSchedule = getDefaultMarketDaysSchedule();
                    if (client.market_days_schedule) {
                      const loadedMarketSchedule = client.market_days_schedule as any;
                      const mergedMarketSchedule = { ...defaultMarketSchedule };
                      
                      Object.keys(defaultMarketSchedule).forEach((day) => {
                        if (loadedMarketSchedule[day]) {
                          mergedMarketSchedule[day as keyof MarketDaysSchedule] = loadedMarketSchedule[day];
                        }
                      });
                      
                      setMarketDaysSchedule(mergedMarketSchedule);
                    } else {
                      setMarketDaysSchedule(defaultMarketSchedule);
                    }
                    if (client.vacation_periods && Array.isArray(client.vacation_periods) && client.vacation_periods.length > 0) {
                      setVacationPeriods(client.vacation_periods as VacationPeriod[]);
                    } else {
                      setVacationPeriods([]);
                    }
                    setShowNewTypeInput(false);
                    setNewTypeName('');
                  }}
                  disabled={submitting}
                >
                  Annuler
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Dialog de gestion des types d'établissement */}
        <EstablishmentTypesManager
          open={manageTypesDialogOpen}
          onOpenChange={setManageTypesDialogOpen}
          types={establishmentTypes}
          onTypesUpdated={() => {
            loadEstablishmentTypes();
            loadClient();
          }}
        />

        {/* Dialog de confirmation de suppression */}
        <AlertDialog 
          open={deleteDialogOpen} 
          onOpenChange={(open) => {
            if (!deleting) {
              setDeleteDialogOpen(open);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce client ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le client "{client?.name}" et toutes ses données associées seront définitivement supprimés :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Toutes les collections associées à ce client</li>
                  <li>Tous les historiques de stock</li>
                  <li>Toutes les factures et ajustements</li>
                  <li>Toutes les informations personnalisées (horaires, jours de marché, etc.)</li>
                </ul>
                <p className="mt-3 font-semibold text-red-600">
                  Cette action ne peut pas être annulée.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteConfirm();
                }}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression en cours...' : 'Supprimer définitivement'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}



