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

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-slate-50 p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#0B1F33] text-white'
                    : 'text-slate-700 hover:bg-slate-200 hover:shadow-md hover:scale-[1.02]'
                )}
              >
                <Icon className="h-5 w-5" />
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
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

