'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, UserCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/auth');
      return;
    }

    // Récupérer les informations de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', session.user.id)
      .single();

    setUser(userData);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    toast.success('Déconnexion réussie');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            {user?.company && (
              <p className="text-sm text-slate-600">
                Entreprise: <span className="font-semibold">{user.company.name}</span>
              </p>
            )}
            {user && (
              <p className="text-xs text-slate-500 mt-1">
                {user.email} • {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                onClick={() => router.push('/users')}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <Users className="mr-2 h-4 w-4" />
                Gérer les utilisateurs
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/profile')}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Mon Profil
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Gestion Dépôts-Ventes
          </h1>
          <p className="text-slate-500">
            Gérez vos clients et collections facilement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Gestion des Clients</CardTitle>
              <CardDescription className="text-base">
                Gérez vos clients, leurs stocks et l'historique des ventes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => router.push('/clients')}
              >
                Accéder aux Clients
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200">
            <CardHeader className="text-center">
              <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Gestion des Collections</CardTitle>
              <CardDescription className="text-base">
                Gérez vos collections de cartes et leurs prix
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => router.push('/collections')}
              >
                Accéder aux Collections
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200 md:col-span-2">
            <CardHeader className="text-center">
              <UserCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Profil de l'entreprise</CardTitle>
              <CardDescription className="text-base">
                Renseignez les informations de votre entreprise (SIRET, TVA, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                className="w-full max-w-md mx-auto"
                variant="outline"
                onClick={() => router.push('/profile')}
              >
                Accéder au Profil
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
