'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, Users, Package, Home, LogOut, CreditCard, FileText, HelpCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    // Récupérer l'email de l'utilisateur connecté
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    // Forcer le positionnement du menu à droite de la page
    const updatePosition = () => {
      // Trouver tous les portails Radix
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach(portal => {
        // Chercher le contenu du popover dans chaque portail
        const contentWrapper = portal.querySelector('[data-radix-popper-content-wrapper]') as HTMLElement;
        if (contentWrapper) {
          const rect = contentWrapper.getBoundingClientRect();
          // Vérifier si c'est proche du côté droit (dans les 300px)
          if (rect.right > window.innerWidth - 300) {
            contentWrapper.style.right = '0px';
            contentWrapper.style.left = 'auto';
            // Annuler toute transformation
            const innerContent = contentWrapper.firstElementChild as HTMLElement;
            if (innerContent) {
              innerContent.style.transform = 'translateX(0)';
            }
          }
        }
      });
    };

    // Petit délai pour laisser Radix UI positionner l'élément
    const timeoutId = setTimeout(updatePosition, 10);
    const intervalId = setInterval(updatePosition, 50);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Ne pas afficher le header sur la page d'authentification
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  const navItems = [
    { label: 'Accueil', href: '/', icon: Home },
    { label: 'Clients', href: '/clients', icon: Users },
    { label: 'Produits', href: '/products', icon: Package },
  ];

  // Obtenir les initiales pour l'avatar
  const getInitials = (email: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200" style={{ backgroundColor: '#0B1F33' }}>
      <div className="w-full flex h-16 items-center justify-between pr-0">
        {/* Logo et texte Gaston */}
        <Link href="/" className="flex items-center flex-shrink-0 h-full hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(to right, #FFFFFF 0%, #FFFFFF 75%, rgba(11, 31, 51, 0.1) 82%, rgba(11, 31, 51, 0.4) 88%, rgba(11, 31, 51, 0.7) 94%, #0B1F33 100%)' }}>
          <div className="h-full flex items-center px-4 md:px-6 lg:px-8 pr-12 md:pr-16 lg:pr-20">
            <Image
              src="/logo.png"
              alt="Gaston"
              width={160}
              height={160}
              className="h-full w-auto object-contain"
              priority
            />
            <span className="ml-2 text-[#0B1F33] font-bold text-2xl tracking-tight" style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif', letterSpacing: '-0.02em' }}>
              Gaston
            </span>
          </div>
        </Link>

        {/* Navigation centrale */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'flex items-center gap-2 text-white transition-colors',
                    isActive 
                      ? 'bg-white/20 text-white hover:bg-white hover:text-[#0B1F33]' 
                      : 'hover:bg-white hover:text-[#0B1F33]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Menu utilisateur */}
        <div
          className="relative h-full flex items-center justify-end min-w-[120px] pl-4 pr-4 md:pr-6 lg:pr-8"
          onMouseEnter={() => setIsUserMenuOpen(true)}
          onMouseLeave={() => setIsUserMenuOpen(false)}
        >
          <Popover open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <PopoverTrigger asChild>
              <div className="h-full flex items-center justify-end cursor-pointer w-full">
                <Button 
                  variant="ghost" 
                  className={cn(
                    "relative h-10 w-10 rounded-full p-0 transition-colors",
                    isUserMenuOpen ? "bg-white" : ""
                  )}
                >
                  <User className={cn(
                    "h-6 w-6 transition-colors",
                    isUserMenuOpen ? "text-[#0B1F33]" : "text-white"
                  )} />
                </Button>
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-56 p-0" 
              align="end"
              alignOffset={0}
              sideOffset={0}
              side="bottom"
            >
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {userEmail && (
                  <p className="font-medium text-sm text-slate-600">{userEmail}</p>
                )}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="p-1">
              <div
                onClick={() => {
                  router.push('/profile');
                  setIsUserMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-slate-600"
              >
                <User className="mr-2 h-4 w-4" />
                Mon profil
              </div>
              <div
                onClick={() => {
                  router.push('/users');
                  setIsUserMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-slate-600"
              >
                <Settings className="mr-2 h-4 w-4" />
                Gestion des utilisateurs
              </div>
              <div
                onClick={() => {
                  router.push('/subscription');
                  setIsUserMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-slate-600"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Mon abonnement
              </div>
              <div
                onClick={() => {
                  router.push('/compliance');
                  setIsUserMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-slate-600"
              >
                <FileText className="mr-2 h-4 w-4" />
                Conformité / CGU / CGV / RGPD
              </div>
              <div
                onClick={() => {
                  router.push('/help');
                  setIsUserMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-slate-600"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Aide et Assistance
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="p-1">
              <div
                onClick={() => {
                  handleLogout();
                  setIsUserMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </div>
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>
    </header>
  );
}

