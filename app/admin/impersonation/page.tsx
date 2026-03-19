'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, LogIn, Search, Shield, User } from 'lucide-react';
import { supabase, User as UserType } from '@/lib/supabase';
import { isCurrentUserSuperAdmin } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function AdminImpersonationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast.error('Vous devez etre connecte.');
          router.push('/auth');
          return;
        }

        setCurrentUserId(session.user.id);

        const superAdmin = await isCurrentUserSuperAdmin();
        if (!superAdmin) {
          toast.error('Acces reserve aux super administrateurs.');
          router.push('/');
          return;
        }

        setIsSuperAdmin(true);
        await loadUsers();
      } catch (error) {
        console.error('Error loading admin impersonation page:', error);
        toast.error('Erreur lors du chargement.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const loadUsers = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Session invalide');
    }

    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Erreur chargement utilisateurs');
    }

    setUsers((data?.users || []) as UserType[]);
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, search]);

  const handleLoginAsUser = async (targetEmail: string, targetUserId: string) => {
    try {
      setImpersonatingUserId(targetUserId);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Session invalide. Veuillez vous reconnecter.');
        router.push('/auth');
        return;
      }

      const response = await fetch('/api/admin/login-as-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetEmail, targetUserId }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error || 'Impossible de generer le lien de connexion');
        return;
      }

      if (!data?.link) {
        toast.error('Lien de connexion invalide');
        return;
      }

      window.location.assign(data.link);
    } catch (error) {
      console.error('Error in handleLoginAsUser:', error);
      toast.error('Erreur lors de la connexion utilisateur');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connexion à un utilisateur</CardTitle>
            <CardDescription>
              En tant qu&apos;admin, connectez-vous temporairement à un compte utilisateur pour diagnostiquer un probleme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par email"
                className="pl-9"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date de creation</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const canImpersonate = user.id !== currentUserId;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Shield className="h-4 w-4 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4 text-slate-500" />
                          )}
                          <span>
                            {user.role === 'super_admin'
                              ? 'Super administrateur'
                              : user.role === 'admin'
                              ? 'Administrateur'
                              : 'Utilisateur'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canImpersonate || impersonatingUserId === user.id}
                          onClick={() => handleLoginAsUser(user.email, user.id)}
                          title={
                            canImpersonate
                              ? 'Se connecter en tant que cet utilisateur'
                              : 'Vous etes deja connecte avec ce compte'
                          }
                        >
                          {impersonatingUserId === user.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                          )}
                          Se connecter en tant que
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
