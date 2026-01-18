'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }
    setHasSession(true);
    setLoading(false);
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
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Mon abonnement</CardTitle>
                <CardDescription>
                  Gérez votre abonnement et vos informations de facturation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 border border-slate-200 rounded-lg bg-white">
              <h3 className="text-lg font-semibold mb-4">Plan actuel</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Plan de base - Fonctionnalités complètes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Accès illimité à toutes les fonctionnalités</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Pour plus d&apos;informations sur les options d&apos;abonnement ou pour modifier votre plan,
                veuillez contacter le support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

