'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Package, FileText, Receipt, Calculator } from 'lucide-react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const clientId = params.id as string;

  const navItems = [
    {
      title: 'Facturer (dépôt)',
      href: `/clients/${clientId}/stock`,
      icon: Package,
    },
    {
      title: 'Facturer (compte ferme)',
      href: `/clients/${clientId}/invoice`,
      icon: Calculator,
    },
    {
      title: 'Créer un avoir',
      href: `/clients/${clientId}/credit-note`,
      icon: Receipt,
    },
    {
      title: 'Documents',
      href: `/clients/${clientId}/documents`,
      icon: FileText,
    },
  ];

  const navLinkContent = (item: typeof navItems[0], isActive: boolean) => {
    const Icon = item.icon;
    return (
      <>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="whitespace-nowrap">
          {item.title.includes('(') ? (
            <>
              {item.title.split('(')[0]}
              <span className="text-xs">({item.title.match(/\(([^)]+)\)/)?.[1]})</span>
            </>
          ) : (
            item.title
          )}
        </span>
      </>
    );
  };

  const linkClassName = (isActive: boolean) => cn(
    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-[#0B1F33] text-white'
      : 'text-slate-700 hover:bg-slate-200 hover:shadow-md hover:scale-[1.02]'
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Barre de navigation horizontale en haut (toutes tailles) */}
      <nav className="sticky top-16 z-40 border-b border-slate-200 bg-slate-50 py-2 overflow-x-auto">
        <div className="flex justify-center w-full px-4">
          <div className="flex gap-2 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(linkClassName(isActive), 'flex-shrink-0')}
              >
                {navLinkContent(item, isActive)}
              </Link>
            );
          })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

