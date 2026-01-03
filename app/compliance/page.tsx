'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function CompliancePage() {
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
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Conformité / CGU / CGV / RGPD</CardTitle>
                <CardDescription>
                  Informations légales et conformité
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <section>
                <h2 className="text-xl font-semibold mb-4">Conditions Générales d&apos;Utilisation (CGU)</h2>
                <p className="text-slate-600 mb-4">
                  Les présentes Conditions Générales d&apos;Utilisation régissent l&apos;utilisation de l&apos;application
                  Gaston. En utilisant cette application, vous acceptez ces conditions.
                </p>
                <p className="text-slate-600">
                  Pour consulter les CGU complètes, veuillez contacter le support.
                </p>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Conditions Générales de Vente (CGV)</h2>
                <p className="text-slate-600 mb-4">
                  Les Conditions Générales de Vente s&apos;appliquent à tous les services proposés par Gaston.
                </p>
                <p className="text-slate-600">
                  Pour consulter les CGV complètes, veuillez contacter le support.
                </p>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Règlement Général sur la Protection des Données (RGPD)</h2>
                <p className="text-slate-600 mb-4">
                  Gaston s&apos;engage à respecter la réglementation RGPD et à protéger vos données personnelles.
                </p>
                <div className="space-y-2 text-slate-600">
                  <p>Vos données sont traitées conformément au RGPD :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Collecte et traitement limités aux finalités nécessaires</li>
                    <li>Conservation des données limitée dans le temps</li>
                    <li>Droit d&apos;accès, de rectification et de suppression</li>
                    <li>Sécurité des données garantie</li>
                  </ul>
                </div>
                <p className="text-slate-600 mt-4">
                  Pour toute question concernant vos données personnelles, veuillez contacter le support.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

