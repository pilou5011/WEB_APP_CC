'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);

    try {
      // Validation de l'email
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        toast.error('Veuillez entrer un email');
        setLoading(false);
        return;
      }

      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(trimmedEmail)) {
        toast.error('Veuillez entrer un email valide');
        setLoading(false);
        return;
      }

      // Envoyer l'email de réinitialisation
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/reset-password`
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gastonstock.com/auth/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectTo,
      });

      if (error) {
        // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
        // Mais afficher un message générique
        if (
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('16 seconds') ||
          error.message?.toLowerCase().includes('security purposes')
        ) {
          toast.error('Trop de tentatives. Veuillez patienter quelques secondes avant de réessayer.');
        } else {
          // Même si l'email n'existe pas, on affiche un message de succès pour la sécurité
          // (pour éviter l'énumération d'emails)
          console.error('Error sending reset email:', error);
        }
      }

      // Toujours afficher le message de succès pour des raisons de sécurité
      // (même si l'email n'existe pas, on ne veut pas révéler cette information)
      setEmailSent(true);
      toast.success('Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle>Email envoyé</CardTitle>
              <CardDescription>
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation de mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Vérifiez votre boîte de réception (et vos spams) et cliquez sur le lien pour réinitialiser votre mot de passe.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Renvoyer l'email
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => router.push('/auth')}
                >
                  Retour à la connexion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle>Mot de passe oublié</CardTitle>
            <CardDescription>
              Entrez votre email pour recevoir un lien de réinitialisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </Button>
            </form>

            <div className="mt-4">
              <Link
                href="/auth"
                className="text-sm text-blue-600 hover:underline flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


