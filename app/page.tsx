'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, UserCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/profile')}
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Mon Profil
          </Button>
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
