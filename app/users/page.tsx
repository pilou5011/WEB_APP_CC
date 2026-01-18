'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, isCurrentUserAdmin } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Mail, Shield, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType, UserInvitation } from '@/lib/supabase';

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Vérifier d'abord que l'utilisateur est connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté pour accéder à cette page.');
        router.push('/auth');
        return;
      }

      console.log('Checking admin access for user:', session.user.id);
      
      const currentUser = await getCurrentUser();
      console.log('Current user from getCurrentUser:', currentUser);
      
      if (!currentUser) {
        console.error('User not found in users table');
        toast.error('Erreur : votre compte n\'a pas été trouvé. Veuillez vous reconnecter.');
        router.push('/');
        return;
      }

      console.log('User role:', currentUser.role);
      const admin = await isCurrentUserAdmin();
      console.log('Is admin?', admin);
      
      if (!admin) {
        toast.error('Accès refusé. Seuls les administrateurs peuvent accéder à cette page.');
        router.push('/');
        return;
      }
      setIsAdmin(true);
      loadData();
    } catch (error) {
      console.error('Error in checkAccess:', error);
      toast.error('Erreur lors de la vérification des permissions.');
      router.push('/');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // Charger les utilisateurs de l'entreprise
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Charger les invitations en attente
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Veuillez entrer un email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Veuillez entrer un email valide');
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', inviteEmail.trim().toLowerCase())
      .single();

    if (existingUser) {
      toast.error('Cet email est déjà utilisé');
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // Générer un token unique
      const token = crypto.randomUUID();

      // Créer l'invitation (expire dans 7 jours)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: inviteError } = await supabase
        .from('user_invitations')
        .insert([
          {
            email: inviteEmail.trim().toLowerCase(),
            company_id: currentUser.company_id,
            role: inviteRole,
            token,
            invited_by: currentUser.id,
            expires_at: expiresAt.toISOString(),
          },
        ]);

      if (inviteError) throw inviteError;

      // TODO: Envoyer l'email d'invitation avec le lien
      // Pour l'instant, on affiche le lien dans un toast
      const inviteUrl = `${window.location.origin}/auth/accept-invitation?token=${token}`;
      toast.success(
        `Invitation créée. Lien: ${inviteUrl}`,
        { duration: 10000 }
      );

      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      loadData();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Erreur lors de l\'invitation');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('Utilisateur supprimé');
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation annulée');
      loadData();
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button
            onClick={() => setInviteDialogOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Inviter un utilisateur
          </Button>
        </div>

        <div className="space-y-6">
          {/* Liste des utilisateurs */}
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs de l'entreprise</CardTitle>
              <CardDescription>
                {users.length} utilisateur{users.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Shield className="h-4 w-4 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4 text-slate-400" />
                          )}
                          <span className={user.role === 'admin' ? 'font-semibold text-blue-600' : ''}>
                            {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Invitations en attente */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Invitations en attente</CardTitle>
                <CardDescription>
                  {invitations.length} invitation{invitations.length > 1 ? 's' : ''} en attente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Date d'invitation</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>
                          {invitation.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog d'invitation */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un utilisateur</DialogTitle>
              <DialogDescription>
                Envoyez une invitation à un nouvel utilisateur pour rejoindre votre entreprise
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="nouvel.utilisateur@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Rôle</Label>
                <Select value={inviteRole} onValueChange={(value: 'admin' | 'user') => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleInviteUser}>
                Envoyer l'invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

