'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AppHome() {
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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      if (!session.user.email_confirmed_at) {
        toast.error("Veuillez d'abord confirmer votre email");
        await supabase.auth.signOut();
        router.push('/auth');
        setLoading(false);
        return;
      }

      if (creatingAccount) {
        console.log('Account creation already in progress, waiting...');
        setLoading(false);
        return;
      }

      setCreatingAccount(true);

      try {
        const userEmail = session.user.email || '';
        const pendingCompanyName =
          session.user.user_metadata?.pending_company_name ||
          userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() ||
          'Mon Entreprise';

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

        const existingUserCheck = existingUserCheckById || existingUserCheckByEmail;
        const hasRlsError =
          (checkByIdError?.code === 'PGRST116' || checkByIdError?.message?.includes('row-level security')) ||
          (checkByEmailError?.code === 'PGRST116' || checkByEmailError?.message?.includes('row-level security'));

        let companyId: string;

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
          if (existingUserCheck.company_id) {
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

            await supabase.auth.updateUser({
              data: { pending_company_name: null },
            });

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

        const { data: companyData, error: companyError } = await supabase.rpc('create_company_for_user', {
          company_name: pendingCompanyName,
        });

        if (companyError) {
          console.error('Error creating company:', companyError);
          if (
            companyError.message?.includes('function') ||
            companyError.code === '42883' ||
            companyError.message?.includes('already has a company')
          ) {
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

            const fallbackCompanyId = fallbackCompanyData.id;

            const { error: createUserError } = await supabase.from('users').insert([
              {
                id: session.user.id,
                email: userEmail,
                company_id: fallbackCompanyId,
                role: 'admin',
              },
            ]);

            if (createUserError) {
              console.error('Error creating user:', createUserError);
              if (createUserError.code === '23505') {
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

            await supabase.auth.updateUser({
              data: { pending_company_name: null },
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

        companyId = companyData;

        const { data: finalCheck } = await supabase
          .from('users')
          .select('id, company_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (finalCheck) {
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

        const { error: createUserError } = await supabase.from('users').insert([
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

        await supabase.auth.updateUser({
          data: {
            pending_company_name: null,
          },
        });

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
        toast.error("Erreur lors de l'activation du compte. Veuillez vous reconnecter.");
        setCreatingAccount(false);
        setLoading(false);
        return;
      }
    } else {
      setUser(userData);
    }

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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#0B1F33] mb-4">Gaston Stock</h1>
          <p className="text-slate-500">Gérez vos clients et vos produits facilement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200 flex flex-col"
            onClick={() => router.push('/clients')}
          >
            <CardHeader className="text-center flex-1">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-[#0B1F33]">Gestion des Clients</CardTitle>
              <CardDescription className="text-base">
                Gérez vos clients, leurs stocks et l&apos;historique des ventes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                size="lg"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/clients');
                }}
              >
                Accéder aux Clients
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200 flex flex-col"
            onClick={() => router.push('/products')}
          >
            <CardHeader className="text-center flex-1">
              <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-[#0B1F33]">Gestion des Produits</CardTitle>
              <CardDescription className="text-base">Gérez vos produits et leurs prix</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                size="lg"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/products');
                }}
              >
                Accéder aux Produits
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200 md:col-span-2 flex flex-col"
            onClick={() => router.push('/profile')}
          >
            <CardHeader className="text-center flex-1">
              <UserCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-[#0B1F33]">Profil de l&apos;entreprise</CardTitle>
              <CardDescription className="text-base">
                Renseignez les informations de votre entreprise (SIRET, TVA, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                size="lg"
                className="w-full max-w-md mx-auto"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/profile');
                }}
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

