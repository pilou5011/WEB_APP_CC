'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, UserCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/auth');
      return;
    }

    // Vérifier si l'utilisateur existe dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', session.user.id)
      .single();

    // Si l'utilisateur n'existe pas dans users, le créer avec son entreprise
    if (userError || !userData) {
      // Vérifier que l'email est confirmé
      if (!session.user.email_confirmed_at) {
        toast.error('Veuillez d\'abord confirmer votre email');
        await supabase.auth.signOut();
        router.push('/auth');
        setLoading(false);
        return;
      }

      // Éviter les doubles créations
      if (creatingAccount) {
        console.log('Account creation already in progress, waiting...');
        setLoading(false);
        return;
      }

      setCreatingAccount(true);

      // Créer l'entreprise et l'utilisateur
      try {
        const userEmail = session.user.email || '';
        const pendingCompanyName = session.user.user_metadata?.pending_company_name || 
                                   userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 
                                   'Mon Entreprise';

        // Vérifier d'abord si l'utilisateur existe déjà dans users
        // Vérifier par ID et par email pour être sûr (RLS peut bloquer une des deux)
        const { data: existingUserCheckById, error: checkByIdError } = await supabase
          .from('users')
          .select('id, company_id, email')
          .eq('id', session.user.id)
          .maybeSingle();

        const { data: existingUserCheckByEmail, error: checkByEmailError } = await supabase
          .from('users')
          .select('id, company_id, email')
          .eq('email', userEmail)
          .maybeSingle();

        // Si une des vérifications trouve l'utilisateur, l'utiliser
        // Si les deux échouent avec une erreur RLS (406), l'utilisateur existe peut-être mais n'est pas visible
        const existingUserCheck = existingUserCheckById || existingUserCheckByEmail;
        // Vérifier les erreurs RLS (code PGRST116 ou message contenant "row-level security")
        const hasRlsError = (checkByIdError?.code === 'PGRST116' || checkByIdError?.message?.includes('row-level security')) ||
                           (checkByEmailError?.code === 'PGRST116' || checkByEmailError?.message?.includes('row-level security'));

        let companyId: string;

        // Si on a une erreur RLS, l'utilisateur existe peut-être mais n'est pas visible
        // Dans ce cas, essayer de récupérer les données complètes
        if (hasRlsError && !existingUserCheck) {
          console.warn('RLS error when checking user, trying to fetch anyway');
          const { data: rlsUserData } = await supabase
            .from('users')
            .select('*, company:companies(*)')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (rlsUserData) {
            setUser(rlsUserData);
            setCreatingAccount(false);
            setLoading(false);
            return;
          }
        }

        if (existingUserCheck) {
          // L'utilisateur existe déjà
          if (existingUserCheck.company_id) {
            // L'utilisateur a déjà une entreprise, recharger les données
            const { data: existingUserData } = await supabase
              .from('users')
              .select('*, company:companies(*)')
              .eq('id', session.user.id)
              .single();
            
            if (existingUserData) {
              setUser(existingUserData);
              setCreatingAccount(false);
              setLoading(false);
              return;
            }
          } else {
            // L'utilisateur existe mais n'a pas d'entreprise
            // Créer l'entreprise et mettre à jour l'utilisateur
            const { data: newCompanyData, error: newCompanyError } = await supabase
              .from('companies')
              .insert([{ name: pendingCompanyName }])
              .select()
              .single();
            
            if (newCompanyError) {
              toast.error(`Erreur lors de la création de l'entreprise: ${newCompanyError.message || 'Erreur inconnue'}`);
              setCreatingAccount(false);
              setLoading(false);
              return;
            }
            
            companyId = newCompanyData.id;
            
            // Mettre à jour l'utilisateur avec l'ID de l'entreprise
            const { error: updateUserError } = await supabase
              .from('users')
              .update({ company_id: companyId })
              .eq('id', session.user.id);
            
            if (updateUserError) {
              toast.error(`Erreur lors de la mise à jour du compte: ${updateUserError.message || 'Erreur inconnue'}`);
              setCreatingAccount(false);
              setLoading(false);
              return;
            }

            // Nettoyer les metadata
            await supabase.auth.updateUser({
              data: { pending_company_name: null }
            });

            // Recharger les données utilisateur
            const { data: updatedUserData } = await supabase
              .from('users')
              .select('*, company:companies(*)')
              .eq('id', session.user.id)
              .single();

            setUser(updatedUserData);
            toast.success('Compte activé avec succès !');
            setCreatingAccount(false);
            setLoading(false);
            return;
          }
        }

        // L'utilisateur n'existe pas, créer l'entreprise puis l'utilisateur
        // Créer l'entreprise en utilisant la fonction SECURITY DEFINER
        const { data: companyData, error: companyError } = await supabase
          .rpc('create_company_for_user', { company_name: pendingCompanyName });

        if (companyError) {
          console.error('Error creating company:', companyError);
          // Si la fonction n'existe pas, essayer l'insertion directe
          if (companyError.message?.includes('function') || companyError.code === '42883' || companyError.message?.includes('already has a company')) {
            // Fallback : insertion directe
            const { data: fallbackCompanyData, error: fallbackError } = await supabase
              .from('companies')
              .insert([{ name: pendingCompanyName }])
              .select()
              .single();
            
            if (fallbackError) {
              toast.error(`Erreur lors de la création de l'entreprise: ${fallbackError.message || 'Erreur inconnue'}`);
              setLoading(false);
              return;
            }
            
            // Utiliser les données du fallback
            const companyId = fallbackCompanyData.id;
            
            // Créer l'utilisateur
            const { error: createUserError } = await supabase
              .from('users')
              .insert([
                {
                  id: session.user.id,
                  email: userEmail,
                  company_id: companyId,
                  role: 'admin',
                },
              ]);

            if (createUserError) {
              console.error('Error creating user:', createUserError);
              if (createUserError.code === '23505') {
                // L'utilisateur existe déjà, recharger les données sans recharger la page
                const { data: existingUserData } = await supabase
                  .from('users')
                  .select('*, company:companies(*)')
                  .eq('id', session.user.id)
                  .single();
                
                if (existingUserData) {
                  setUser(existingUserData);
                  setCreatingAccount(false);
                  setLoading(false);
                  return;
                }
              }
              toast.error(`Erreur lors de la création du compte: ${createUserError.message || 'Erreur inconnue'}`);
              setCreatingAccount(false);
              setLoading(false);
              return;
            }

            // Nettoyer les metadata et recharger
            await supabase.auth.updateUser({
              data: { pending_company_name: null }
            });

            const { data: newUserData } = await supabase
              .from('users')
              .select('*, company:companies(*)')
              .eq('id', session.user.id)
              .single();

            setUser(newUserData);
            toast.success('Compte activé avec succès !');
            setLoading(false);
            return;
          } else {
            toast.error(`Erreur lors de la création de l'entreprise: ${companyError.message || 'Erreur inconnue'}`);
            setLoading(false);
            return;
          }
        }

        // La fonction retourne directement l'ID de l'entreprise (UUID)
        companyId = companyData;

        // Vérifier une dernière fois si l'utilisateur existe avant de créer
        const { data: finalCheck } = await supabase
          .from('users')
          .select('id, company_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (finalCheck) {
          // L'utilisateur existe maintenant (peut-être créé entre-temps)
          const { data: existingUserData } = await supabase
            .from('users')
            .select('*, company:companies(*)')
            .eq('id', session.user.id)
            .single();
          
          if (existingUserData) {
            setUser(existingUserData);
            setCreatingAccount(false);
            setLoading(false);
            return;
          }
        }

        // Créer l'utilisateur
        const { error: createUserError } = await supabase
          .from('users')
          .insert([
            {
              id: session.user.id,
              email: userEmail,
              company_id: companyId,
              role: 'admin',
            },
          ]);

        if (createUserError) {
          console.error('Error creating user:', createUserError);
          // Si l'erreur est due à un doublon (par ID ou email), recharger les données
          if (createUserError.code === '23505') {
            // Essayer de récupérer par ID d'abord
            const { data: existingUserDataById } = await supabase
              .from('users')
              .select('*, company:companies(*)')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (existingUserDataById) {
              setUser(existingUserDataById);
              setCreatingAccount(false);
              setLoading(false);
              return;
            }

            // Si pas trouvé par ID, essayer par email
            const { data: existingUserDataByEmail } = await supabase
              .from('users')
              .select('*, company:companies(*)')
              .eq('email', userEmail)
              .maybeSingle();
            
            if (existingUserDataByEmail) {
              setUser(existingUserDataByEmail);
              setCreatingAccount(false);
              setLoading(false);
              return;
            }
          }
          toast.error(`Erreur lors de la création du compte: ${createUserError.message || 'Erreur inconnue'}`);
          setCreatingAccount(false);
          setLoading(false);
          return;
        }

        // Nettoyer les metadata
        await supabase.auth.updateUser({
          data: {
            pending_company_name: null
          }
        });

        // Recharger les données utilisateur
        const { data: newUserData } = await supabase
          .from('users')
          .select('*, company:companies(*)')
          .eq('id', session.user.id)
          .single();

        setUser(newUserData);
        toast.success('Compte activé avec succès !');
        setCreatingAccount(false);
      } catch (error: any) {
        console.error('Error creating account:', error);
        toast.error('Erreur lors de l\'activation du compte. Veuillez vous reconnecter.');
        setCreatingAccount(false);
        setLoading(false);
        return;
      }
    } else {
      setUser(userData);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    toast.success('Déconnexion réussie');
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
        <div className="flex justify-between items-center mb-6">
          <div>
            {user?.company && (
              <p className="text-sm text-slate-600">
                Entreprise: <span className="font-semibold">{user.company.name}</span>
              </p>
            )}
            {user && (
              <p className="text-xs text-slate-500 mt-1">
                {user.email} • {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                onClick={() => router.push('/users')}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <Users className="mr-2 h-4 w-4" />
                Gérer les utilisateurs
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/profile')}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Mon Profil
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Gestion Dépôts-Ventes
          </h1>
          <p className="text-slate-500">
            Gérez vos clients et vos produits facilement
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
              <CardTitle className="text-2xl">Gestion des Produits</CardTitle>
              <CardDescription className="text-base">
                Gérez vos produits et leurs prix
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => router.push('/products')}
              >
                Accéder aux Produits
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
