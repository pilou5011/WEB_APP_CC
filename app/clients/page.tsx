'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Client } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    initial_stock: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

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
          address: formData.address,
          initial_stock: initialStock,
          current_stock: initialStock
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Client ajouté avec succès');
      setClients([data, ...clients]);
      setDialogOpen(false);
      setFormData({ name: '', address: '', initial_stock: '' });
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erreur lors de la création du client');
    } finally {
      setSubmitting(false);
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
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      placeholder="12 rue de la Paix, 75001 Paris"
                      className="mt-1.5 resize-none"
                      rows={3}
                    />
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
        ) : clients.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2">Aucun client</p>
              <p className="text-slate-500 text-sm">
                Commencez par ajouter votre premier client
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => {
              const cardsSold = client.initial_stock - client.current_stock;
              const amountDue = cardsSold * 2;

              return (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-xl">{client.name}</CardTitle>
                    <CardDescription className="flex items-start gap-1.5 mt-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{client.address}</span>
                    </CardDescription>
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