'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Client } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MapPin, Package, Edit, X, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '', // Ancien champ, conservé pour compatibilité
    street_address: '',
    postal_code: '',
    city: '',
    initial_stock: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '', // Ancien champ, conservé pour compatibilité
    street_address: '',
    postal_code: '',
    city: '',
    initial_stock: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  // Filtrer les clients en fonction du terme de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return (
          client.name.toLowerCase().includes(searchLower) ||
          client.address?.toLowerCase().includes(searchLower) ||
          client.street_address?.toLowerCase().includes(searchLower) ||
          client.postal_code?.toLowerCase().includes(searchLower) ||
          client.city?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredClients(filtered);
    }
  }, [clients, searchTerm]);

  // Fonction helper pour formater l'adresse
  const formatAddress = (client: Client) => {
    if (client.street_address && client.postal_code && client.city) {
      return `${client.street_address}, ${client.postal_code} ${client.city}`;
    }
    return client.address || 'Adresse non renseignée';
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const initialStock = parseInt(formData.initial_stock);

      if (isNaN(initialStock) || initialStock < 0) {
        toast.error('Le stock initial doit être un nombre positif');
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
          initial_stock: initialStock,
          current_stock: initialStock
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Client ajouté avec succès');
      setClients([data, ...clients]);
      setDialogOpen(false);
      setFormData({ name: '', address: '', street_address: '', postal_code: '', city: '', initial_stock: '' });
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
          initial_stock: initialStock,
          current_stock: Math.max(0, newCurrentStock) // S'assurer que le stock ne devient pas négatif
        })
        .eq('id', editingClient.id)
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour la liste des clients
      setClients(clients.map(client => 
        client.id === editingClient.id ? data : client
      ));

      toast.success('Client modifié avec succès');
      setEditDialogOpen(false);
      setEditingClient(null);
      setEditFormData({ name: '', address: '', street_address: '', postal_code: '', city: '', initial_stock: '' });
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la modification du client');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editingClient) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', editingClient.id);

      if (error) throw error;

      // Supprimer le client de la liste
      setClients(clients.filter(client => client.id !== editingClient.id));

      toast.success('Client supprimé avec succès');
      setDeleteDialogOpen(false);
      setEditDialogOpen(false);
      setEditingClient(null);
      setEditFormData({ name: '', address: '', street_address: '', postal_code: '', city: '', initial_stock: '' });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression du client');
    } finally {
      setDeleting(false);
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
                    Ajoutez un nouveau client et définissez son stock initial
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Nom du client</Label>
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
                    <Label htmlFor="street_address">Adresse</Label>
                    <Input
                      id="street_address"
                      value={formData.street_address}
                      onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                      required
                      placeholder="7 rue du cheval"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postal_code">Code postal</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        required
                        placeholder="92400"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        placeholder="Courbevoie"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="initial_stock">Stock initial</Label>
                    <Input
                      id="initial_stock"
                      type="number"
                      min="0"
                      value={formData.initial_stock}
                      onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                      required
                      placeholder="Ex: 100"
                      className="mt-1.5"
                    />
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

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher par nom, adresse, code postal ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-slate-600 mt-2">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
              {searchTerm && ` pour "${searchTerm}"`}
            </p>
          )}
        </div>

        {/* Dialog de modification */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
                  <Label htmlFor="edit-name">Nom du client</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    placeholder="Ex: Boutique du Centre"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-street_address">Adresse</Label>
                  <Input
                    id="edit-street_address"
                    value={editFormData.street_address}
                    onChange={(e) => setEditFormData({ ...editFormData, street_address: e.target.value })}
                    required
                    placeholder="7 rue du cheval"
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-postal_code">Code postal</Label>
                    <Input
                      id="edit-postal_code"
                      value={editFormData.postal_code}
                      onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                      required
                      placeholder="92400"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Ville</Label>
                    <Input
                      id="edit-city"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      required
                      placeholder="Courbevoie"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-initial_stock">Stock initial</Label>
                  <Input
                    id="edit-initial_stock"
                    type="number"
                    min="0"
                    value={editFormData.initial_stock}
                    onChange={(e) => setEditFormData({ ...editFormData, initial_stock: e.target.value })}
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
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce client ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le client "{editingClient?.name}" et toutes ses données associées seront définitivement supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Suppression en cours...' : 'Supprimer définitivement'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => {
              const cardsSold = client.initial_stock - client.current_stock;
              const amountDue = cardsSold * 2;

              return (
                <Card
                  key={client.id}
                  className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
                        <CardTitle className="text-xl">{client.name}</CardTitle>
                        <CardDescription className="flex items-start gap-1.5 mt-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{formatAddress(client)}</span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(client);
                        }}
                        className="h-8 w-8 p-0 hover:bg-slate-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center py-2 border-t">
                        <span className="text-slate-600">Stock actuel</span>
                        <span className="font-semibold text-lg">{client.current_stock}</span>
                      </div>
{/*                       <div className="flex justify-between items-center">
                        <span className="text-slate-600">Cartes vendues</span>
                        <span className="font-semibold text-green-600">{cardsSold}</span>
                      </div> */}
{/*                       <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-slate-600">Montant dû</span>
                        <span className="font-bold text-lg text-slate-900">{amountDue.toFixed(2)} €</span>
                      </div> */}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}