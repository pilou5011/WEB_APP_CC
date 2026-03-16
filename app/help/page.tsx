'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié dans le presse-papiers`);
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
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
                  <button
                    onClick={() => copyToClipboard('chevallierpierrelouis@gmail.com', 'Email')}
                    className="text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                  >
                    chevallierpierrelouis@gmail.com
                  </button>
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
                    Besoin d&apos;aide technique ? Nous sommes à votre disposition pour vous aider.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-700 font-medium">Pierre-Louis : </span>
                      <button
                        onClick={() => copyToClipboard('06 23 93 74 52', 'Numéro de téléphone')}
                        className="text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                      >
                        06 23 93 74 52
                      </button>
                    </div>
                    <div>
                      <span className="text-slate-700 font-medium">Marie : </span>
                      <button
                        onClick={() => copyToClipboard('07 77 81 80 62', 'Numéro de téléphone')}
                        className="text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                      >
                        07 77 81 80 62
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

