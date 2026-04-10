'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  FolderTree,
  Landmark,
  DollarSign,
  Settings,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Movimientos', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Cashflow', href: '/cashflow', icon: TrendingUp },
  { label: 'Categorías', href: '/categories', icon: FolderTree },
  { label: 'Bancos', href: '/bank-balances', icon: Landmark },
  { label: 'Divisas', href: '/currencies', icon: DollarSign },
  { label: 'Ajustes', href: '/settings', icon: Settings },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setEmail(user.email || '');
      setIsLoading(false);
    };

    getUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-6">
          <div className="text-2xl font-bold text-emerald-600">₡ Cashflow</div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>
        </SidebarContent>
        <SidebarFooter className="border-t px-4 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    {email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {email.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="border-b bg-white px-4 py-3 flex items-center">
          <SidebarTrigger className="md:hidden" />
        </header>
        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="container max-w-7xl mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
