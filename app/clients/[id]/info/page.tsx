'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Client } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Building2, MapPin, Phone, FileText, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientInfoPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    street_address: '',
    postal_code: '',
    city: '',
    phone: '',
    rcs_number: '',
    naf_code: '',
    client_number: ''
  });

  useEffect(() => {
    loadClient();
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
      setFormData({
        name: data.name || '',
        street_address: data.street_address || '',
        postal_code: data.postal_code || '',
        city: data.city || '',
        phone: data.phone || '',
        rcs_number: data.rcs_number || '',
        naf_code: data.naf_code || '',
        client_number: data.client_number || ''
      });
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Erreur lors du chargement du client');
    } finally {
      setLoading(false);
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
        .update({
          name: formData.name,
          address: `${formData.street_address}, ${formData.postal_code} ${formData.city}`,
          street_address: formData.street_address,
          postal_code: formData.postal_code,
          city: formData.city,
          phone: formData.phone || null,
          rcs_number: formData.rcs_number || null,
          naf_code: formData.naf_code || null,
          client_number: formData.client_number || null,
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
      toast.success('Informations mises à jour avec succès');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour des informations');
    } finally {
      setSubmitting(false);
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
                    Informations du client
                  </CardTitle>
                  <CardDescription>
                    Détails complets de {client.name}
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
                      <Label className="text-slate-500 text-sm">Téléphone</Label>
                      <p className="text-lg font-medium mt-1">
                        {client.phone || <span className="text-slate-400">Non renseigné</span>}
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
              setFormData({
                name: client.name || '',
                street_address: client.street_address || '',
                postal_code: client.postal_code || '',
                city: client.city || '',
                phone: client.phone || '',
                rcs_number: client.rcs_number || '',
                naf_code: client.naf_code || '',
                client_number: client.client_number || ''
              });
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
              Modifier les informations
            </CardTitle>
            <CardDescription>
              Modifiez les informations de {client.name}
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
                
                <div>
                  <Label htmlFor="street_address">Adresse *</Label>
                  <Input
                    id="street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    required
                    placeholder="7 rue du cheval"
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal_code">Code postal *</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      required
                      placeholder="92400"
                      maxLength={5}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Ville *</Label>
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
              </div>

              {/* Coordonnées */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Phone className="h-5 w-5" />
                  <h3>Coordonnées</h3>
                </div>
                <Separator />
                
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

              <Separator />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Restaurer les données du client si on annule l'édition
                    setFormData({
                      name: client.name || '',
                      street_address: client.street_address || '',
                      postal_code: client.postal_code || '',
                      city: client.city || '',
                      phone: client.phone || '',
                      rcs_number: client.rcs_number || '',
                      naf_code: client.naf_code || '',
                      client_number: client.client_number || ''
                    });
                  }}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



