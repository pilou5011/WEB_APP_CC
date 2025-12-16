'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, UserProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Building2, User, MapPin, FileText, Mail, Phone, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { AddressAutocomplete } from '@/components/address-autocomplete';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_name_short: '',
    first_name: '',
    last_name: '',
    street_address: '',
    postal_code: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    siret: '',
    ape_code: '',
    tva_number: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          company_name: data.company_name || '',
          company_name_short: data.company_name_short || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          street_address: data.street_address || '',
          postal_code: data.postal_code || '',
          city: data.city || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          siret: data.siret || '',
          ape_code: data.ape_code || '',
          tva_number: data.tva_number || '',
          email: data.email || '',
          phone: data.phone || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation du SIRET (14 chiffres)
      if (formData.siret && !/^\d{14}$/.test(formData.siret)) {
        toast.error('Le numéro SIRET doit contenir exactement 14 chiffres');
        setSubmitting(false);
        return;
      }

      // Validation du code postal (5 chiffres)
      if (formData.postal_code && !/^\d{5}$/.test(formData.postal_code)) {
        toast.error('Le code postal doit contenir exactement 5 chiffres');
        setSubmitting(false);
        return;
      }

      // Validation de l'email
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error('L\'adresse email n\'est pas valide');
        setSubmitting(false);
        return;
      }

      const profileData = {
        company_name: formData.company_name || null,
        company_name_short: formData.company_name_short || null,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        street_address: formData.street_address || null,
        postal_code: formData.postal_code || null,
        city: formData.city || null,
        siret: formData.siret || null,
        ape_code: formData.ape_code || null,
        tva_number: formData.tva_number || null,
        email: formData.email || null,
        phone: formData.phone || null,
        updated_at: new Date().toISOString()
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profile')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
        toast.success('Profil mis à jour avec succès');
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('user_profile')
          .insert([profileData])
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
        toast.success('Profil créé avec succès');
      }

      await loadProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de l\'enregistrement du profil');
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

  // Vue d'affichage du profil
  if (!isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="flex gap-3 mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </div>

          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <User className="h-8 w-8" />
                    Mon Profil
                  </CardTitle>
                  <CardDescription>
                    Informations de votre entreprise
                  </CardDescription>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier mon profil
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!profile ? (
                <div className="text-center py-12">
                  <User className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">Aucun profil configuré</p>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Créer mon profil
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Informations de l'entreprise */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <Building2 className="h-5 w-5" />
                      <h3>Informations de l'entreprise</h3>
                    </div>
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-slate-500 text-sm">Nom de la société</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.company_name || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Numéro SIRET</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.siret || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Code APE</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.ape_code || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Numéro TVA</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.tva_number || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Responsable */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <User className="h-5 w-5" />
                      <h3>Responsable</h3>
                    </div>
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-slate-500 text-sm">Prénom</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.first_name || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Nom</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.last_name || <span className="text-slate-400">Non renseigné</span>}
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
                          {profile.street_address || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Code postal</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.postal_code || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Ville</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.city || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Coordonnées */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <Mail className="h-5 w-5" />
                      <h3>Coordonnées</h3>
                    </div>
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-slate-500 text-sm">Email</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.email || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>

                      <div>
                        <Label className="text-slate-500 text-sm">Téléphone</Label>
                        <p className="text-lg font-medium mt-1">
                          {profile.phone || <span className="text-slate-400">Non renseigné</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Vue d'édition du profil
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              // Restaurer les données du profil si on annule l'édition
              if (profile) {
                setFormData({
                  company_name: profile.company_name || '',
                  first_name: profile.first_name || '',
                  last_name: profile.last_name || '',
                  street_address: profile.street_address || '',
                  postal_code: profile.postal_code || '',
                  city: profile.city || '',
                  latitude: profile.latitude || null,
                  longitude: profile.longitude || null,
                  siret: profile.siret || '',
                  ape_code: profile.ape_code || '',
                  tva_number: profile.tva_number || '',
                  email: profile.email || '',
                  phone: profile.phone || ''
                });
              }
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <User className="h-8 w-8" />
              {profile ? 'Modifier le profil' : 'Créer le profil'}
            </CardTitle>
            <CardDescription>
              Renseignez les informations de votre entreprise pour les factures et documents officiels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations de l'entreprise */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Building2 className="h-5 w-5" />
                  <h3>Informations de l'entreprise</h3>
                </div>
                <Separator />
                
                <div>
                  <Label htmlFor="company_name">Nom de la société *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Ex: Ma Société SARL"
                    className="mt-1.5"
                  />
                <div>
                  <Label htmlFor="company_name_short">Nom commercial (pour les emails) *</Label>
                  <Input
                    id="company_name_short"
                    value={formData.company_name_short}
                    onChange={(e) => setFormData({ ...formData, company_name_short: e.target.value })}
                    placeholder="Ex: Ma Société (version courte)"
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Ce nom sera utilisé dans l'envoi des factures par email</p>
                </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="siret">Numéro SIRET</Label>
                    <Input
                      id="siret"
                      value={formData.siret}
                      onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                      placeholder="12345678901234"
                      maxLength={14}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">14 chiffres</p>
                  </div>

                  <div>
                    <Label htmlFor="ape_code">Code APE</Label>
                    <Input
                      id="ape_code"
                      value={formData.ape_code}
                      onChange={(e) => setFormData({ ...formData, ape_code: e.target.value })}
                      placeholder="Ex: 4759A"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tva_number">Numéro TVA</Label>
                    <Input
                      id="tva_number"
                      value={formData.tva_number}
                      onChange={(e) => setFormData({ ...formData, tva_number: e.target.value })}
                      placeholder="Ex: FR12345678901"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Identité du responsable */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <User className="h-5 w-5" />
                  <h3>Responsable</h3>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Ex: Jean"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Ex: Dupont"
                      className="mt-1.5"
                    />
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
                
                <AddressAutocomplete
                  streetValue={formData.street_address}
                  postalCodeValue={formData.postal_code}
                  cityValue={formData.city}
                  onStreetChange={(value) => setFormData(prev => ({ ...prev, street_address: value }))}
                  onPostalCodeChange={(value) => setFormData(prev => ({ ...prev, postal_code: value }))}
                  onCityChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                  onCoordinatesChange={(lat, lon) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }))}
                />
              </div>

              {/* Coordonnées */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Mail className="h-5 w-5" />
                  <h3>Coordonnées</h3>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
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
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Restaurer les données du profil si on annule l'édition
                    if (profile) {
                      setFormData({
                        company_name: profile.company_name || '',
                        first_name: profile.first_name || '',
                        last_name: profile.last_name || '',
                        street_address: profile.street_address || '',
                        postal_code: profile.postal_code || '',
                        city: profile.city || '',
                        latitude: profile.latitude || null,
                        longitude: profile.longitude || null,
                        siret: profile.siret || '',
                        ape_code: profile.ape_code || '',
                        tva_number: profile.tva_number || '',
                        email: profile.email || '',
                        phone: profile.phone || ''
                      });
                    }
                  }}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer le profil'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



