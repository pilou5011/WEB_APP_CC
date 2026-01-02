'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LogIn, UserPlus, Mail, Lock, Building2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  // Fonction helper pour créer l'entreprise et l'utilisateur après confirmation d'email
  const createCompanyAndUserForConfirmedAccount = async (userId: string, userEmail: string) => {
    try {
      // Demander le nom de l'entreprise (pour les comptes créés avant cette correction)
      // Pour l'instant, utiliser un nom par défaut basé sur l'email
      const defaultCompanyName = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Mon Entreprise';
      
      // Créer l'entreprise
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: defaultCompanyName }])
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw companyError;
      }

      // Créer l'utilisateur dans la table users
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: userEmail,
            company_id: companyData.id,
            role: 'admin',
          },
        ]);

      if (userError) {
        console.error('Error creating user:', userError);
        throw userError;
      }

      return { success: true };
    } catch (error) {
      console.error('Error in createCompanyAndUserForConfirmedAccount:', error);
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Empêcher les doubles clics
    if (loading) return;
    
    setLoading(true);

    try {
      // ============================================
      // VALIDATIONS DE SÉCURITÉ
      // ============================================

      // 1. Validation et sanitization de l'email
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

      // 2. Validation du mot de passe
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        toast.error('Veuillez entrer un mot de passe');
        setLoading(false);
        return;
      }

      if (trimmedPassword.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }

      // ============================================
      // CONNEXION
      // ============================================

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        // Gérer spécifiquement les erreurs de sécurité
        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          toast.error('Email ou mot de passe incorrect');
        } else if (error.message?.toLowerCase().includes('email not confirmed')) {
          toast.error('Veuillez confirmer votre email avant de vous connecter');
        } else if (
          error.message?.toLowerCase().includes('rate limit') ||
          error.message?.toLowerCase().includes('16 seconds') ||
          error.message?.toLowerCase().includes('security purposes')
        ) {
          toast.error('Trop de tentatives. Veuillez patienter quelques secondes avant de réessayer.');
        } else {
          toast.error(error.message || 'Erreur lors de la connexion');
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast.error('Erreur lors de la connexion');
        setLoading(false);
        return;
      }

      // ============================================
      // VÉRIFICATION DE L'UTILISATEUR
      // ============================================

      // Vérifier que l'utilisateur existe dans la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        // L'utilisateur n'existe pas encore dans la table users
        // Cela peut arriver si l'utilisateur a créé son compte mais n'a pas encore confirmé son email
        // ou si la création de l'entreprise/utilisateur a échoué lors de l'inscription
        
        // Vérifier si l'utilisateur a confirmé son email
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          toast.error('Veuillez d\'abord confirmer votre email en cliquant sur le lien reçu par email.');
          setLoading(false);
          return;
        }
        
        // L'email est confirmé mais l'utilisateur n'existe pas dans users
        // Créer l'entreprise et l'utilisateur maintenant
        const pendingCompanyName = data.user.user_metadata?.pending_company_name || 
                                   trimmedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 
                                   'Mon Entreprise';
        
        try {
          // Créer l'entreprise
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert([{ name: pendingCompanyName }])
            .select()
            .single();

          if (companyError) {
            console.error('Error creating company:', companyError);
            await supabase.auth.signOut();
            toast.error(`Erreur lors de la création de l'entreprise: ${companyError.message || 'Erreur inconnue'}`);
            setLoading(false);
            return;
          }

          // Créer l'utilisateur dans la table users
          const { error: createUserError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email: trimmedEmail,
                company_id: companyData.id,
                role: 'admin',
              },
            ]);

          if (createUserError) {
            console.error('Error creating user:', createUserError);
            // Si l'erreur est due à une violation de contrainte unique (utilisateur existe déjà)
            if (createUserError.code === '23505') {
              // L'utilisateur existe déjà, essayer de se reconnecter
              toast.info('Votre compte est déjà créé. Reconnexion...');
              // Recharger la page pour réessayer la connexion
              window.location.reload();
              return;
            }
            await supabase.auth.signOut();
            toast.error(`Erreur lors de la création du compte: ${createUserError.message || 'Erreur inconnue'}`);
            setLoading(false);
            return;
          }

          // Nettoyer les metadata
          await supabase.auth.updateUser({
            data: {
              pending_company_name: null
            }
          });

          toast.success('Compte activé et connexion réussie !');
          router.push('/');
          router.refresh();
          setLoading(false);
          return;
        } catch (error: any) {
          await supabase.auth.signOut();
          toast.error('Erreur lors de la finalisation du compte. Veuillez contacter le support.');
          setLoading(false);
          return;
        }
      }

      // Vérifier que l'email correspond
      if (userData.email.toLowerCase() !== trimmedEmail) {
        await supabase.auth.signOut();
        toast.error('Erreur de sécurité : email non correspondant');
        setLoading(false);
        return;
      }

      toast.success('Connexion réussie');
      router.push('/');
      router.refresh(); // Forcer le rafraîchissement pour charger les nouvelles données
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Empêcher les doubles clics
    if (loading) return;
    
    setLoading(true);

    let authUserId: string | null = null;
    let companyId: string | null = null;

    try {
      // ============================================
      // VALIDATIONS DE SÉCURITÉ
      // ============================================

      // 1. Validation et sanitization de l'email
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        toast.error('Veuillez entrer un email');
        setLoading(false);
        return;
      }

      // Validation format email plus robuste
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(trimmedEmail)) {
        toast.error('Veuillez entrer un email valide');
        setLoading(false);
        return;
      }

      // Vérifier la longueur de l'email (RFC 5321)
      if (trimmedEmail.length > 254) {
        toast.error('L\'email est trop long (maximum 254 caractères)');
        setLoading(false);
        return;
      }

      // 2. Validation du mot de passe
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        toast.error('Veuillez entrer un mot de passe');
        setLoading(false);
        return;
      }

      // Longueur minimale
      if (trimmedPassword.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères');
        setLoading(false);
        return;
      }

      // Longueur maximale (protection contre les attaques)
      if (trimmedPassword.length > 128) {
        toast.error('Le mot de passe est trop long (maximum 128 caractères)');
        setLoading(false);
        return;
      }

      // Vérifier la complexité du mot de passe (optionnel mais recommandé)
      const hasUpperCase = /[A-Z]/.test(trimmedPassword);
      const hasLowerCase = /[a-z]/.test(trimmedPassword);
      const hasNumbers = /[0-9]/.test(trimmedPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        toast.error('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
        setLoading(false);
        return;
      }

      // 3. Validation et sanitization du nom d'entreprise
      const trimmedCompanyName = companyName.trim();
      if (!trimmedCompanyName) {
        toast.error('Veuillez entrer un nom d\'entreprise');
        setLoading(false);
        return;
      }

      // Longueur minimale
      if (trimmedCompanyName.length < 2) {
        toast.error('Le nom d\'entreprise doit contenir au moins 2 caractères');
        setLoading(false);
        return;
      }

      // Longueur maximale
      if (trimmedCompanyName.length > 100) {
        toast.error('Le nom d\'entreprise est trop long (maximum 100 caractères)');
        setLoading(false);
        return;
      }

      // Vérifier les caractères autorisés (lettres, chiffres, espaces, tirets, apostrophes)
      const companyNameRegex = /^[a-zA-Z0-9\s\-'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ]+$/;
      if (!companyNameRegex.test(trimmedCompanyName)) {
        toast.error('Le nom d\'entreprise contient des caractères non autorisés');
        setLoading(false);
        return;
      }

      // 4. Vérifier que l'email n'existe pas déjà dans la table users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (existingUser) {
        toast.error('Cet email est déjà utilisé. Veuillez vous connecter.');
        setLoading(false);
        return;
      }

      // ============================================
      // CRÉATION DU COMPTE
      // ============================================

      // Créer l'utilisateur dans auth (utiliser les valeurs sanitized)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (authError) {
        // Gérer spécifiquement l'erreur de rate limiting
        if (
          authError.message?.toLowerCase().includes('rate limit') ||
          authError.message?.toLowerCase().includes('16 seconds') ||
          authError.message?.toLowerCase().includes('security purposes')
        ) {
          toast.error('Trop de tentatives. Veuillez patienter quelques secondes avant de réessayer.');
        } else if (authError.message?.toLowerCase().includes('already registered')) {
          toast.error('Cet email est déjà utilisé. Veuillez vous connecter.');
        } else {
          toast.error(authError.message || 'Erreur lors de la création du compte');
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Erreur lors de la création du compte');
        setLoading(false);
        return;
      }

      authUserId = authData.user.id;

      // Vérifier si un email de confirmation est requis
      // Si authData.session est null, cela signifie généralement qu'un email de confirmation est requis
      if (!authData.session) {
        // Stocker le nom de l'entreprise dans les metadata de l'utilisateur pour le créer après confirmation
        try {
          await supabase.auth.updateUser({
            data: {
              pending_company_name: trimmedCompanyName
            }
          });
        } catch (metadataError) {
          // Si la mise à jour des metadata échoue, ce n'est pas bloquant
          console.warn('Could not store company name in metadata:', metadataError);
        }

        // Email de confirmation requis
        toast.success(
          'Compte créé avec succès ! Veuillez vérifier votre email et cliquer sur le lien de confirmation pour activer votre compte. Vous pourrez ensuite vous connecter.',
          { duration: 12000 }
        );
        
        // Réinitialiser le formulaire
        setEmail('');
        setPassword('');
        setCompanyName('');
        setLoading(false);
        
        // Basculer vers le mode connexion
        setIsLogin(true);
        return;
      }

      // Si la session existe, continuer avec la création de l'entreprise et de l'utilisateur
      // Attendre un peu pour que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 300));

      // Vérifier que la session est toujours active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Si la session n'est pas active, l'email de confirmation est probablement requis
        toast.success(
          'Compte créé avec succès ! Veuillez vérifier votre email et cliquer sur le lien de confirmation pour activer votre compte.',
          { duration: 10000 }
        );
        
        // Réinitialiser le formulaire
        setEmail('');
        setPassword('');
        setCompanyName('');
        setLoading(false);
        
        // Basculer vers le mode connexion
        setIsLogin(true);
        return;
      }

      // ============================================
      // CRÉATION DE L'ENTREPRISE
      // ============================================

      // Créer l'entreprise (utiliser la valeur sanitized)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: trimmedCompanyName }])
        .select()
        .single();

      if (companyError) {
        // Gérer spécifiquement l'erreur RLS
        if (companyError.message?.includes('row-level security policy')) {
          toast.error('Erreur de sécurité. Veuillez contacter le support ou réessayer dans quelques instants.');
          console.error('RLS Error:', companyError);
        } else {
          toast.error(companyError.message || 'Erreur lors de la création de l\'entreprise');
        }
        setLoading(false);
        return;
      }

      companyId = companyData.id;

      // ============================================
      // CRÉATION DE L'UTILISATEUR DANS LA TABLE USERS
      // ============================================

      // Vérifier que l'utilisateur n'existe pas déjà (double vérification)
      const { data: existingUserCheck } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle();

      if (existingUserCheck) {
        toast.error('Ce compte existe déjà. Veuillez vous connecter.');
        setLoading(false);
        return;
      }

      // Créer l'utilisateur dans la table users (en tant qu'admin)
      // Utiliser les valeurs sanitized
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authUserId,
            email: trimmedEmail,
            company_id: companyId,
            role: 'admin',
          },
        ]);

      if (userError) {
        // Gérer les erreurs spécifiques
        if (userError.code === '23505') {
          // Violation de contrainte unique (email ou id déjà utilisé)
          toast.error('Ce compte existe déjà. Veuillez vous connecter.');
        } else if (userError.code === '23503') {
          // Violation de clé étrangère (company_id invalide)
          toast.error('Erreur lors de la création du compte. Veuillez contacter le support.');
        } else {
          toast.error(userError.message || 'Erreur lors de la création du compte');
        }
        setLoading(false);
        return;
      }

      // ============================================
      // VÉRIFICATION FINALE
      // ============================================

      // Vérifier que la session est toujours active
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (!finalSession) {
        toast.error('Erreur : session perdue. Veuillez vous connecter.');
        setLoading(false);
        return;
      }

      // Vérifier que l'utilisateur existe bien dans la table users
      const { data: finalUserCheck, error: finalUserCheckError } = await supabase
        .from('users')
        .select('id, email, company_id, role')
        .eq('id', authUserId)
        .single();

      if (finalUserCheckError || !finalUserCheck) {
        toast.error('Erreur : compte créé mais non trouvé. Veuillez vous connecter.');
        setLoading(false);
        return;
      }

      toast.success('Compte créé avec succès ! Vous êtes maintenant connecté.');
      
      // Rediriger vers la page d'accueil
      router.push('/');
      router.refresh(); // Forcer le rafraîchissement pour charger les nouvelles données
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Gérer spécifiquement l'erreur de rate limiting
      if (
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('16 seconds') ||
        error.message?.toLowerCase().includes('security purposes')
      ) {
        toast.error('Trop de tentatives. Veuillez patienter quelques secondes avant de réessayer.');
      } else {
        toast.error(error.message || 'Erreur lors de la création du compte');
      }
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
            Gérez vos clients et vos produits facilement
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

