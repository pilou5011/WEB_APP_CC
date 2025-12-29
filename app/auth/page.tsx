'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LogIn, UserPlus, Mail, Lock, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Vérifier que l'utilisateur existe dans la table users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          await supabase.auth.signOut();
          toast.error('Compte non trouvé. Veuillez contacter votre administrateur.');
          return;
        }

        toast.success('Connexion réussie');
        router.push('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Valider l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error('Veuillez entrer un email valide');
        return;
      }

      // Valider le mot de passe (minimum 6 caractères)
      if (password.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      // Valider le nom de l'entreprise
      if (!companyName.trim()) {
        toast.error('Veuillez entrer un nom d\'entreprise');
        return;
      }

      // Créer l'utilisateur dans auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // Créer l'entreprise
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName.trim() }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Créer l'utilisateur dans la table users (en tant qu'admin)
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            company_id: companyData.id,
            role: 'admin',
          },
        ]);

      if (userError) throw userError;

      toast.success('Compte créé avec succès ! Vous êtes maintenant connecté.');
      router.push('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Gestion Dépôts-Ventes
          </h1>
          <p className="text-slate-500">
            Gérez vos clients et collections facilement
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <div className="flex gap-2 mb-4">
              <Button
                variant={isLogin ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setIsLogin(true);
                  setEmail('');
                  setPassword('');
                  setCompanyName('');
                }}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Se connecter
              </Button>
              <Button
                variant={!isLogin ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setIsLogin(false);
                  setEmail('');
                  setPassword('');
                  setCompanyName('');
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Créer un compte
              </Button>
            </div>
            <CardTitle>
              {isLogin ? 'Connexion' : 'Création de compte'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Connectez-vous à votre compte'
                : 'Créez un nouveau compte pour votre entreprise'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l'entreprise</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Nom de votre entreprise"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                {!isLogin && (
                  <p className="text-xs text-slate-500">
                    Le mot de passe doit contenir au moins 6 caractères
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? 'Chargement...'
                  : isLogin
                  ? 'Se connecter'
                  : 'Créer mon compte'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          {isLogin
            ? "Vous n'avez pas de compte ? "
            : 'Vous avez déjà un compte ? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setEmail('');
              setPassword('');
              setCompanyName('');
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            {isLogin ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
}

