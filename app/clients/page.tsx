'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Client, EstablishmentType } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MapPin, Package, Edit, X, Search, Building, Settings, Check, ChevronsUpDown, Filter, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EstablishmentTypesManager } from '@/components/establishment-types-manager';
import { cn } from '@/lib/utils';
import { formatDepartment, getDepartmentFromPostalCode } from '@/lib/postal-code-utils';
import { AddressAutocomplete } from '@/components/address-autocomplete';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [departmentFilterOpen, setDepartmentFilterOpen] = useState(false);
  const [cityFilterOpen, setCityFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [establishmentTypes, setEstablishmentTypes] = useState<EstablishmentType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [addingNewType, setAddingNewType] = useState(false);
  const [manageTypesDialogOpen, setManageTypesDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '', // Ancien champ, conservé pour compatibilité
    street_address: '',
    postal_code: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    phone: '',
    rcs_number: '',
    naf_code: '',
    client_number: '',
    establishment_type_id: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '', // Ancien champ, conservé pour compatibilité
    street_address: '',
    postal_code: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    phone: '',
    rcs_number: '',
    naf_code: '',
    client_number: '',
    establishment_type_id: '',
    initial_stock: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadClients();
    loadEstablishmentTypes();
  }, []);

  // Extraire les départements uniques depuis les clients
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    clients.forEach(client => {
      const dept = client.department || (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);
      if (dept) {
        deptSet.add(dept);
      }
    });
    return Array.from(deptSet).sort((a, b) => {
      // Trier numériquement si possible, sinon alphabétiquement
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  }, [clients]);

  // Extraire les villes uniques depuis les clients
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    clients.forEach(client => {
      if (client.city) {
        citySet.add(client.city);
      }
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  // Nettoyer le body après suppression (retirer overflow: hidden si nécessaire)
  useEffect(() => {
    if (!deleting && !deleteDialogOpen && !editDialogOpen) {
      // S'assurer que le body n'est pas bloqué
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Vérifier et supprimer les overlays Radix UI orphelins
      const overlays = document.querySelectorAll('[data-radix-portal]');
      overlays.forEach(overlay => {
        const element = overlay as HTMLElement;
        const dialogInside = element.querySelector('[role="dialog"], [role="alertdialog"]');
        if (!dialogInside || dialogInside.getAttribute('data-state') === 'closed') {
          // Overlay orphelin, le supprimer
          element.remove();
        }
      });
    }
  }, [deleting, deleteDialogOpen, editDialogOpen]);

  // Filtrer et regrouper les clients par ville
  useEffect(() => {
    console.log('[FILTER] useEffect de filtrage déclenché', { 
      clientsCount: clients.length, 
      searchTerm, 
      selectedDepartments, 
      selectedCities 
    });
    
    // Créer une copie du tableau clients pour éviter de modifier l'original
    let filtered: Client[] = [...clients];
    
    // Filtrage par recherche textuelle
    if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => {
        return (
          client.name.toLowerCase().includes(searchLower) ||
          client.address?.toLowerCase().includes(searchLower) ||
          client.street_address?.toLowerCase().includes(searchLower) ||
          client.postal_code?.toLowerCase().includes(searchLower) ||
          client.city?.toLowerCase().includes(searchLower) ||
          client.phone?.toLowerCase().includes(searchLower) ||
          client.rcs_number?.toLowerCase().includes(searchLower) ||
          client.naf_code?.toLowerCase().includes(searchLower) ||
          client.client_number?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtrage par département
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(client => {
        const dept = client.department || (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);
        return dept && selectedDepartments.includes(dept);
      });
    }

    // Filtrage par ville
    if (selectedCities.length > 0) {
      filtered = filtered.filter(client => {
        return client.city && selectedCities.includes(client.city);
      });
    }

    // Créer une copie pour le tri (ne pas modifier filtered directement)
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const cityA = (a.city || '').toLowerCase();
      const cityB = (b.city || '').toLowerCase();
      if (cityA !== cityB) {
        return cityA.localeCompare(cityB);
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    console.log('[FILTER] Clients filtrés:', sorted.length);
    setFilteredClients(sorted);
  }, [clients, searchTerm, selectedDepartments, selectedCities]);

  // Grouper les clients par ville
  const clientsByCity = useMemo(() => {
    const grouped: Record<string, Client[]> = {};
    
    filteredClients.forEach(client => {
      const city = client.city || 'Sans ville';
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(client);
    });

    // Trier les villes alphabétiquement
    const sortedCities = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    // Créer un objet ordonné avec les villes triées
    const ordered: Record<string, Client[]> = {};
    sortedCities.forEach(city => {
      ordered[city] = grouped[city];
    });

    return ordered;
  }, [filteredClients]);

  // Fonction helper pour formater l'adresse
  const formatAddress = (client: Client) => {
    if (client.street_address && client.postal_code && client.city) {
      return `${client.street_address}, ${client.postal_code} ${client.city}`;
    }
    return client.address || 'Adresse non renseignée';
  };

  const loadClients = async (silent = false) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      if (!silent) {
      toast.error('Erreur lors du chargement des clients');
      }
    } finally {
      if (!silent) {
      setLoading(false);
      }
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

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: formData.name,
          address: `${formData.street_address}, ${formData.postal_code} ${formData.city}`, // Format complet pour compatibilité
          street_address: formData.street_address,
          postal_code: formData.postal_code,
          city: formData.city,
          phone: formData.phone || null,
          rcs_number: formData.rcs_number || null,
          naf_code: formData.naf_code || null,
          client_number: formData.client_number || null,
          establishment_type_id: formData.establishment_type_id || null,
          initial_stock: 0,
          current_stock: 0
        }])
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

      toast.success('Client ajouté avec succès');
      setClients([data, ...clients]);
      setDialogOpen(false);
      setFormData({ name: '', address: '', street_address: '', postal_code: '', city: '', latitude: null, longitude: null, phone: '', rcs_number: '', naf_code: '', client_number: '', establishment_type_id: '' });
      setShowNewTypeInput(false);
      setNewTypeName('');
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erreur lors de la création du client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setEditFormData({
      name: client.name,
      address: client.address || '',
      street_address: client.street_address || '',
      postal_code: client.postal_code || '',
      city: client.city || '',
      latitude: client.latitude || null,
      longitude: client.longitude || null,
      phone: client.phone || '',
      rcs_number: client.rcs_number || '',
      naf_code: client.naf_code || '',
      client_number: client.client_number || '',
      establishment_type_id: client.establishment_type_id || '',
      initial_stock: client.initial_stock.toString()
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    setUpdating(true);

    try {
      const initialStock = parseInt(editFormData.initial_stock);

      if (isNaN(initialStock) || initialStock < 0) {
        toast.error('Le stock initial doit être un nombre positif');
        setUpdating(false);
        return;
      }

      // Validation du code postal (5 chiffres)
      if (editFormData.postal_code && !/^\d{5}$/.test(editFormData.postal_code)) {
        toast.error('Le code postal doit contenir exactement 5 chiffres');
        setUpdating(false);
        return;
      }

      // Validation du numéro de client (6 chiffres)
      if (editFormData.client_number && !/^\d{6}$/.test(editFormData.client_number)) {
        toast.error('Le numéro de client doit contenir exactement 6 chiffres');
        setUpdating(false);
        return;
      }

      // Calculer la différence de stock et ajuster le stock actuel
      const stockDifference = initialStock - editingClient.initial_stock;
      const newCurrentStock = editingClient.current_stock + stockDifference;

      const { data, error } = await supabase
        .from('clients')
        .update({
          name: editFormData.name,
          address: `${editFormData.street_address}, ${editFormData.postal_code} ${editFormData.city}`, // Format complet pour compatibilité
          street_address: editFormData.street_address,
          postal_code: editFormData.postal_code,
          city: editFormData.city,
          phone: editFormData.phone || null,
          rcs_number: editFormData.rcs_number || null,
          naf_code: editFormData.naf_code || null,
          client_number: editFormData.client_number || null,
          establishment_type_id: editFormData.establishment_type_id || null,
          initial_stock: initialStock,
          current_stock: Math.max(0, newCurrentStock) // S'assurer que le stock ne devient pas négatif
        })
        .eq('id', editingClient.id)
        .select()
        .single();

      if (error) {
        // Vérifier si c'est une erreur de numéro de client dupliqué
        if (error.code === '23505' && error.message.includes('unique_client_number')) {
          toast.error('Ce numéro de client existe déjà');
        } else {
          throw error;
        }
        setUpdating(false);
        return;
      }

      // Mettre à jour la liste des clients
      setClients(clients.map(client => 
        client.id === editingClient.id ? data : client
      ));

      toast.success('Client modifié avec succès');
      setEditDialogOpen(false);
      setEditingClient(null);
      setEditFormData({ name: '', address: '', street_address: '', postal_code: '', city: '', latitude: null, longitude: null, phone: '', rcs_number: '', naf_code: '', client_number: '', establishment_type_id: '', initial_stock: '' });
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la modification du client');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    if (!editingClient) {
      console.warn('[DELETE] handleDeleteClick: aucun editingClient');
      return;
    }
    
    console.log('[DELETE] handleDeleteClick: stockage du client à supprimer', { 
      id: editingClient.id, 
      name: editingClient.name 
    });
    
    // Stocker les infos du client AVANT d'ouvrir l'AlertDialog
    setClientToDelete({ id: editingClient.id, name: editingClient.name });
    
    // Fermer le Dialog parent AVANT d'ouvrir l'AlertDialog pour éviter les conflits de focus
    console.log('[DELETE] Fermeture du Dialog parent');
    setEditDialogOpen(false);
    
    // Petite délai pour que le Dialog se ferme proprement avant d'ouvrir l'AlertDialog
    setTimeout(() => {
      console.log('[DELETE] Ouverture de l\'AlertDialog');
      setDeleteDialogOpen(true);
    }, 100);
  };

  const handleDeleteConfirm = async () => {
    console.log('[DELETE] handleDeleteConfirm appelé');
    console.log('[DELETE] clientToDelete:', clientToDelete);
    
    // Utiliser clientToDelete au lieu de editingClient
    if (!clientToDelete) {
      console.warn('[DELETE] Aucun client à supprimer (clientToDelete est null)');
      setDeleteDialogOpen(false);
      return;
    }

    const clientIdToDelete = clientToDelete.id;
    const clientNameToDelete = clientToDelete.name;
    
    console.log('[DELETE] Client à supprimer:', { id: clientIdToDelete, name: clientNameToDelete });
    
    // CRITIQUE: Réinitialiser editingClient IMMÉDIATEMENT pour éviter qu'il soit utilisé
    // pendant la fermeture des dialogues ou dans d'autres effets
    console.log('[DELETE] Réinitialisation IMMÉDIATE de editingClient');
    setEditingClient(null);
    setEditFormData({ 
      name: '', 
      address: '', 
      street_address: '', 
      postal_code: '', 
      city: '', 
      latitude: null, 
      longitude: null, 
      phone: '', 
      rcs_number: '', 
      naf_code: '', 
      client_number: '', 
      establishment_type_id: '', 
      initial_stock: '' 
    });
    
    console.log('[DELETE] Mise à jour de l\'état deleting à true');
    setDeleting(true);

    // Fermer TOUS les dialogues AVANT la suppression pour éviter les conflits
    console.log('[DELETE] Fermeture de tous les dialogues AVANT suppression');
    setDeleteDialogOpen(false);
    setEditDialogOpen(false);
    setDepartmentFilterOpen(false);
    setCityFilterOpen(false);

    try {
      console.log('[DELETE] Appel à Supabase pour supprimer le client');
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientIdToDelete);

      console.log('[DELETE] Réponse Supabase:', { error });

      if (error) {
        console.error('[DELETE] Erreur lors de la suppression:', error);
        let errorMessage = 'Erreur lors de la suppression du client';
        
        if (error.code === '23503') {
          errorMessage = 'Impossible de supprimer ce client : il est référencé dans d\'autres enregistrements';
        } else if (error.message) {
          errorMessage = `Erreur : ${error.message}`;
        }
        
        toast.error(errorMessage);
        console.log('[DELETE] Mise à jour de l\'état deleting à false (erreur)');
        setDeleting(false);
        setClientToDelete(null);
        return;
      }

      console.log('[DELETE] Suppression réussie, mise à jour de la liste locale');
      // Mise à jour locale de la liste IMMÉDIATEMENT
      setClients(prevClients => {
        const filtered = prevClients.filter(client => client.id !== clientIdToDelete);
        console.log('[DELETE] Liste mise à jour, nouveau nombre de clients:', filtered.length);
        return filtered;
      });

      console.log('[DELETE] Affichage du message de succès');
      // Afficher le message de succès IMMÉDIATEMENT
      toast.success(`Client "${clientNameToDelete}" supprimé avec succès`);

      console.log('[DELETE] Réinitialisation finale des états');
      // Réinitialiser clientToDelete
      setClientToDelete(null);
      
    } catch (error: any) {
      console.error('[DELETE] Erreur inattendue:', error);
      toast.error(error?.message || 'Erreur inattendue lors de la suppression du client');
      setClientToDelete(null);
    } finally {
      console.log('[DELETE] Finalement, mise à jour de deleting à false');
      setDeleting(false);
      
      // NETTOYAGE FORCÉ après un court délai pour s'assurer que tout est bien fermé
      setTimeout(() => {
        console.log('[DELETE] Nettoyage forcé des overlays et du body');
        
        // Nettoyer le body en premier
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.style.pointerEvents = '';
        
        // Désactiver tous les overlays qui pourraient bloquer
        const allOverlays = document.querySelectorAll('[data-radix-portal], [data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
        allOverlays.forEach(overlay => {
          const element = overlay as HTMLElement;
          const dialog = element.querySelector('[role="dialog"], [role="alertdialog"]');
          const state = dialog?.getAttribute('data-state');
          
          // Si le dialog est fermé ou n'existe pas, désactiver l'overlay
          if (!dialog || state === 'closed' || state === null) {
            element.style.pointerEvents = 'none';
            element.style.display = 'none';
          }
        });
        
        // Forcer la fermeture de tous les dialogues (encore une fois pour être sûr)
        setDeleteDialogOpen(false);
        setEditDialogOpen(false);
        setDepartmentFilterOpen(false);
        setCityFilterOpen(false);
        
        // Remettre le focus sur le body pour permettre les interactions
        if (document.activeElement && document.activeElement !== document.body) {
          (document.activeElement as HTMLElement).blur();
        }
        document.body.focus();
        
        console.log('[DELETE] Nettoyage terminé');
      }, 150);
      
      console.log('[DELETE] Fin de handleDeleteConfirm');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Gestion des Clients</h1>
            <p className="text-slate-600">Dépôts-ventes de cartes de vœux</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="shadow-lg"
            >
              Retour à l'accueil
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg">
                <Plus className="mr-2 h-5 w-5" />
                Ajouter un client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nouveau client</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau client. Le stock sera géré via l'ajout de collections.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  
                  <AddressAutocomplete
                    streetValue={formData.street_address}
                    postalCodeValue={formData.postal_code}
                    cityValue={formData.city}
                    onStreetChange={(value) => setFormData(prev => ({ ...prev, street_address: value }))}
                    onPostalCodeChange={(value) => setFormData(prev => ({ ...prev, postal_code: value }))}
                    onCityChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    onCoordinatesChange={(lat, lon) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }))}
                    required
                  />
                  <div>
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01 23 45 67 89"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Ajout en cours...' : 'Ajouter'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher par nom, adresse, numéro de client, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Filtres par département et ville */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filtre par département */}
            <Popover open={departmentFilterOpen} onOpenChange={setDepartmentFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={departmentFilterOpen}
                  className="w-[250px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {selectedDepartments.length === 0
                        ? 'Département'
                        : selectedDepartments.length === 1
                        ? formatDepartment(selectedDepartments[0])
                        : `${selectedDepartments.length} départements`}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un département..." />
                  <CommandList>
                    <CommandEmpty>Aucun département trouvé.</CommandEmpty>
                    <CommandGroup>
                      {availableDepartments.map((dept) => {
                        const isSelected = selectedDepartments.includes(dept);
                        return (
                          <CommandItem
                            key={dept}
                            onSelect={() => {
                              if (isSelected) {
                                setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
                              } else {
                                setSelectedDepartments([...selectedDepartments, dept]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {formatDepartment(dept)}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Badges des départements sélectionnés */}
            {selectedDepartments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedDepartments.map((dept) => (
                  <Badge
                    key={dept}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {formatDepartment(dept)}
                    <button
                      onClick={() => {
                        setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
                      }}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Filtre par ville */}
            <Popover open={cityFilterOpen} onOpenChange={setCityFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityFilterOpen}
                  className="w-[250px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {selectedCities.length === 0
                        ? 'Ville'
                        : selectedCities.length === 1
                        ? selectedCities[0]
                        : `${selectedCities.length} villes`}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher une ville..." />
                  <CommandList>
                    <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
                    <CommandGroup>
                      {availableCities.map((city) => {
                        const isSelected = selectedCities.includes(city);
                        return (
                          <CommandItem
                            key={city}
                            onSelect={() => {
                              if (isSelected) {
                                setSelectedCities(selectedCities.filter((c) => c !== city));
                              } else {
                                setSelectedCities([...selectedCities, city]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {city}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Badges des villes sélectionnées */}
            {selectedCities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCities.map((city) => (
                  <Badge
                    key={city}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {city}
                    <button
                      onClick={() => {
                        setSelectedCities(selectedCities.filter((c) => c !== city));
                      }}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Bouton pour réinitialiser les filtres */}
            {(selectedDepartments.length > 0 || selectedCities.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDepartments([]);
                  setSelectedCities([]);
                }}
                className="text-xs"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          {/* Compteur de résultats */}
          {(searchTerm || selectedDepartments.length > 0 || selectedCities.length > 0) && (
            <p className="text-sm text-slate-600">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
              {searchTerm && ` pour "${searchTerm}"`}
            </p>
          )}
        </div>

        {/* Dialog de modification */}
        <Dialog 
          open={editDialogOpen} 
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            // Ne réinitialiser que si on ferme ET qu'on n'est pas en train de supprimer
            // ET qu'on ne va pas ouvrir l'AlertDialog
            if (!open && !clientToDelete && !deleting) {
              setEditingClient(null);
              setEditFormData({ name: '', address: '', street_address: '', postal_code: '', city: '', latitude: null, longitude: null, phone: '', rcs_number: '', naf_code: '', client_number: '', establishment_type_id: '', initial_stock: '' });
            }
          }}
        >
          <DialogContent>
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Modifier le client</DialogTitle>
                <DialogDescription>
                  Modifiez les informations du client
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-name">Nom de la société *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    placeholder="Ex: Boutique du Centre"
                    className="mt-1.5"
                  />
                </div>
                
                {/* Type d'établissement */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label htmlFor="edit-establishment_type">Type d'établissement</Label>
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
                  <Select
                    value={editFormData.establishment_type_id}
                    onValueChange={(value) => setEditFormData({ ...editFormData, establishment_type_id: value })}
                  >
                    <SelectTrigger>
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
                </div>
                
                <AddressAutocomplete
                  streetValue={editFormData.street_address}
                  postalCodeValue={editFormData.postal_code}
                  cityValue={editFormData.city}
                  onStreetChange={(value) => setEditFormData(prev => ({ ...prev, street_address: value }))}
                  onPostalCodeChange={(value) => setEditFormData(prev => ({ ...prev, postal_code: value }))}
                  onCityChange={(value) => setEditFormData(prev => ({ ...prev, city: value }))}
                  onCoordinatesChange={(lat, lon) => setEditFormData(prev => ({ ...prev, latitude: lat, longitude: lon }))}
                  required
                />
                <div>
                  <Label htmlFor="edit-phone">Numéro de téléphone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="01 23 45 67 89"
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-rcs_number">Numéro RCS</Label>
                    <Input
                      id="edit-rcs_number"
                      value={editFormData.rcs_number}
                      onChange={(e) => setEditFormData({ ...editFormData, rcs_number: e.target.value })}
                      placeholder="123 456 789"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-naf_code">Code NAF</Label>
                    <Input
                      id="edit-naf_code"
                      value={editFormData.naf_code}
                      onChange={(e) => setEditFormData({ ...editFormData, naf_code: e.target.value })}
                      placeholder="Ex: 4759A"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-client_number">Numéro de client</Label>
                  <Input
                    id="edit-client_number"
                    value={editFormData.client_number}
                    onChange={(e) => setEditFormData({ ...editFormData, client_number: e.target.value })}
                    placeholder="6 chiffres (ex: 000001)"
                    maxLength={6}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">6 chiffres exactement</p>
                </div>
                <div>
                  <Label htmlFor="edit-initial_stock">Stock initial</Label>
                  <Input
                    id="edit-initial_stock"
                    type="text"
                    inputMode="numeric"
                    value={editFormData.initial_stock}
                    onChange={(e) => {
                      const value = e.target.value;
                      // N'accepter que les nombres
                      if (value === '' || /^\d+$/.test(value)) {
                        setEditFormData({ ...editFormData, initial_stock: value });
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    required
                    placeholder="Ex: 100"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={updating || deleting}
                  className="mr-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? 'Modification en cours...' : 'Modifier'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <AlertDialog 
          open={deleteDialogOpen} 
          onOpenChange={(open) => {
            // Ne permettre la fermeture que si on n'est pas en train de supprimer
            if (!deleting) {
              setDeleteDialogOpen(open);
              // Si on ferme l'AlertDialog sans supprimer, réinitialiser clientToDelete
              if (!open) {
                setClientToDelete(null);
                // Rouvrir le Dialog d'édition si on avait un client en cours d'édition
                if (editingClient) {
                  // Utiliser requestAnimationFrame pour éviter les conflits
                  requestAnimationFrame(() => {
                    setEditDialogOpen(true);
                  });
                }
              }
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce client ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le client "{clientToDelete?.name || editingClient?.name}" et toutes ses données associées seront définitivement supprimés.
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

        {/* Dialog de gestion des types d'établissement */}
        <EstablishmentTypesManager
          open={manageTypesDialogOpen}
          onOpenChange={setManageTypesDialogOpen}
          types={establishmentTypes}
          onTypesUpdated={loadEstablishmentTypes}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2">
                {searchTerm ? 'Aucun client trouvé' : 'Aucun client'}
              </p>
              <p className="text-slate-500 text-sm">
                {searchTerm 
                  ? `Aucun résultat pour "${searchTerm}". Essayez un autre terme de recherche.`
                  : 'Commencez par ajouter votre premier client'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(clientsByCity).map(([city, cityClients]) => (
              <div key={city} className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-600" />
                  {city}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {cityClients.map((client) => (
                <Card
                  key={client.id}
                      className="hover:shadow-md transition-all duration-200 border-slate-200 cursor-pointer"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold leading-tight mb-1.5">
                              {client.name}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                              {formatAddress(client)}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(client);
                        }}
                            className="h-6 w-6 p-0 hover:bg-slate-100 flex-shrink-0"
                      >
                            <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                    </Card>
                  ))}
                      </div>
                    </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}