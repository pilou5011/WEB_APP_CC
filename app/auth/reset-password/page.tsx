'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    // Vérifier si on a un hash de réinitialisation dans l'URL
    const checkResetHash = async () => {
      try {
        // Vérifier d'abord si l'utilisateur a déjà une session de réinitialisation
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // L'utilisateur a déjà une session valide (token déjà échangé)
          setValidating(false);
          return;
        }

        // Si pas de session, vérifier le hash de l'URL
        const hash = window.location.hash;
        if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
          // Le hash contient le token de réinitialisation
          // Supabase va automatiquement échanger le token lors du prochain appel à getSession()
          // On attend un peu pour que Supabase traite le hash
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Vérifier à nouveau la session après traitement du hash
          const { data: { session: newSession }, error } = await supabase.auth.getSession();
          
          if (error || !newSession) {
            console.error('Error validating reset token:', error);
            toast.error('Le lien de réinitialisation est invalide ou a expiré.');
            router.push('/auth/forgot-password');
            return;
          }
        } else {
          // Pas de hash et pas de session, rediriger vers forgot-password
          toast.error('Aucun lien de réinitialisation valide trouvé.');
          router.push('/auth/forgot-password');
          return;
        }
      } catch (error) {
        console.error('Error checking reset hash:', error);
        toast.error('Erreur lors de la validation du lien.');
        router.push('/auth/forgot-password');
      } finally {
        setValidating(false);
      }
    };

    checkResetHash();
  }, [router]);

  const validatePassword = (pwd: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (pwd.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }

    if (pwd.length > 128) {
      errors.push('Le mot de passe est trop long (maximum 128 caractères)');
    }

    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    if (!hasUpperCase) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    if (!hasLowerCase) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    if (!hasNumbers) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);

    try {
      // Validation du mot de passe
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        toast.error('Veuillez entrer un mot de passe');
        setLoading(false);
        return;
      }

      const passwordValidation = validatePassword(trimmedPassword);
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.errors[0]);
        setLoading(false);
        return;
      }

      // Vérifier que les mots de passe correspondent
      if (trimmedPassword !== confirmPassword.trim()) {
        toast.error('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      // Mettre à jour le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('16 seconds') ||
          error.message?.toLowerCase().includes('security purposes')
        ) {
          toast.error('Trop de tentatives. Veuillez patienter quelques secondes avant de réessayer.');
        } else if (error.message?.toLowerCase().includes('session')) {
          toast.error('Le lien de réinitialisation a expiré. Veuillez en demander un nouveau.');
          router.push('/auth/forgot-password');
        } else {
          toast.error(error.message || 'Erreur lors de la réinitialisation du mot de passe');
        }
        setLoading(false);
        return;
      }

      // Succès
      setPasswordReset(true);
      toast.success('Mot de passe réinitialisé avec succès !');
      
      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Erreur lors de la réinitialisation du mot de passe. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="border-slate-200 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Validation du lien...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-center">Mot de passe réinitialisé</CardTitle>
              <CardDescription className="text-center">
                Votre mot de passe a été réinitialisé avec succès.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 text-center mb-4">
                Vous allez être redirigé vers la page de connexion...
              </p>
              <Button
                className="w-full"
                onClick={() => router.push('/auth')}
              >
                Aller à la page de connexion
              </Button>
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
            <CardTitle>Réinitialiser le mot de passe</CardTitle>
            <CardDescription>
              Entrez votre nouveau mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </Button>
            </form>

            <div className="mt-4">
              <Link
                href="/auth"
                className="text-sm text-blue-600 hover:underline"
              >
                Retour à la connexion
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

