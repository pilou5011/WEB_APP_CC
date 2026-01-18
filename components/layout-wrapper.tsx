'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Loader2 } from 'lucide-react';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    // Si le pathname change, on affiche le loader
    if (pathname !== previousPathnameRef.current) {
      setIsLoading(true);
      previousPathnameRef.current = pathname;
      
      // Masquer le loader après un court délai pour permettre au contenu de se charger
      // On utilise un délai plus court pour une meilleure UX
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 200);

      return () => clearTimeout(timer);
    } else {
      // Si le pathname n'a pas changé, s'assurer que le loader n'est pas affiché
      setIsLoading(false);
    }
  }, [pathname]);

  return (
    <>
      <Header />
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0B1F33]" />
            <span className="text-sm font-medium text-slate-700">Chargement...</span>
          </div>
        </div>
      )}
      <div className={isLoading ? 'opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}>
        {children}
      </div>
    </>
  );
}

