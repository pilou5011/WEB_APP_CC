'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UserInvitation } from '@/lib/supabase';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token d\'invitation manquant');
      router.push('/auth');
      return;
    }
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) return;

    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Invitation non trouvée');
        router.push('/auth');
        return;
      }

      // Vérifier si l'invitation a expiré
      if (new Date(data.expires_at) < new Date()) {
        toast.error('Cette invitation a expiré');
        router.push('/auth');
        return;
      }

      // Vérifier si l'invitation a déjà été acceptée
      if (data.accepted_at) {
        toast.error('Cette invitation a déjà été acceptée');
        router.push('/auth');
        return;
      }

      setInvitation(data);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      toast.error('Erreur lors du chargement de l\'invitation');
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation || !token) return;

    // Valider le mot de passe
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);

    try {
      // Créer le compte utilisateur dans auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // Créer l'utilisateur dans la table users
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: invitation.email,
            company_id: invitation.company_id,
            role: invitation.role,
          },
        ]);

      if (userError) {
        // Si l'utilisateur existe déjà dans users, essayer de mettre à jour
        if (userError.code === '23505') {
          // Email déjà utilisé, peut-être que l'utilisateur existe déjà
          const { error: updateError } = await supabase
            .from('users')
            .update({
              company_id: invitation.company_id,
              role: invitation.role,
            })
            .eq('email', invitation.email);

          if (updateError) throw updateError;
        } else {
          throw userError;
        }
      }

      // Marquer l'invitation comme acceptée
      const { error: inviteError } = await supabase
        .from('user_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (inviteError) {
        console.warn('Error updating invitation:', inviteError);
        // Ne pas bloquer si l'update de l'invitation échoue
      }

      toast.success('Compte créé avec succès ! Vous êtes maintenant connecté.');
      router.push('/');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-[#0B1F33] mb-2">
            Accepter l'invitation
          </h1>
          <p className="text-slate-500">
            Créez votre mot de passe pour rejoindre l'entreprise
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
            <CardDescription>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{invitation.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>Rôle: {invitation.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAcceptInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Le mot de passe doit contenir au moins 6 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  En créant votre compte, vous acceptez de rejoindre l'entreprise et de respecter les règles de sécurité.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? 'Création du compte...' : 'Créer mon compte'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

