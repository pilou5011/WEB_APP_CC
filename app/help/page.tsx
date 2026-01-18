'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, Mail, MessageSquare } from 'lucide-react';

export default function HelpPage() {
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
              <HelpCircle className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Aide et Assistance</CardTitle>
                <CardDescription>
                  Besoin d&apos;aide ? Nous sommes là pour vous
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact par email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Pour toute question ou demande d&apos;assistance, contactez-nous par email.
                  </p>
                  <Button variant="outline" className="w-full">
                    Envoyer un email
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Support technique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Besoin d&apos;aide technique ? Notre équipe est disponible pour vous aider.
                  </p>
                  <Button variant="outline" className="w-full">
                    Contacter le support
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2">Questions fréquentes</h3>
              <p className="text-sm text-blue-800 mb-4">
                Consultez notre documentation pour trouver des réponses aux questions les plus courantes.
              </p>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Comment créer un client ?</strong></p>
                <p className="ml-4">Accédez à la section Clients et cliquez sur &quot;Nouveau client&quot;.</p>
                
                <p className="mt-4"><strong>Comment mettre à jour le stock ?</strong></p>
                <p className="ml-4">Dans la page d&apos;un client, utilisez l&apos;onglet &quot;Mettre à jour le stock&quot;.</p>
                
                <p className="mt-4"><strong>Comment générer une facture ?</strong></p>
                <p className="ml-4">Dans la page d&apos;un client, utilisez l&apos;onglet &quot;Facturer&quot;.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

