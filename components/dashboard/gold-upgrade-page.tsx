'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardGoldUpgradePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/app')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l&apos;accueil
        </Button>

        <Card className="border-amber-200 shadow-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Lock className="h-7 w-7 text-amber-700" />
            </div>
            <CardTitle className="text-2xl">Tableau de bord</CardTitle>
            <CardDescription>
              Cette fonctionnalité est réservée à la formule Gold.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm text-slate-600">
              Visualisez vos chiffres clés, analysez la performance commerciale et suivez
              l&apos;évolution de votre activité grâce à des statistiques dédiées.
            </p>
            <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700">
              <Link href="/subscription">
                <Sparkles className="mr-2 h-4 w-4" />
                Découvrir la formule Gold
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
