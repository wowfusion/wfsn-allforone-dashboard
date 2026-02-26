'use client';

/**
 * Dashboard-Navigation – rollenbasierte Sichtbarkeit der Menüpunkte.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import {
  Calendar,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Users,
  LogOut,
  Swords,
  RefreshCw,
  ChevronDown,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface DashboardNavProps {
  session: Session;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredRole?: AppRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Raids & Events', icon: Calendar },
  { href: '/my-signups', label: 'Teilnahme', icon: ClipboardList },
  { href: '/admin', label: 'Auswertungen', icon: BarChart3, requiredRole: 'OFFICER' },
  { href: '/admin/roster', label: 'Roster & Sync', icon: Users, requiredRole: 'OFFICER' },
  { href: '/admin/rsvp', label: 'RSVP Übersicht', icon: MessageSquare, requiredRole: 'OFFICER' },
  { href: '/admin/settings', label: 'Einstellungen', icon: Settings, requiredRole: 'OFFICER' },
];

export function DashboardNav({ session }: DashboardNavProps) {
  const pathname = usePathname();
  const roles = (session.user.appRoles ?? []) as AppRole[];

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === 'OFFICER') return can.createEvent(roles);
    if (item.requiredRole === 'ADMIN') return can.manageConfig(roles);
    return false;
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-6">
            <Swords className="h-5 w-5 text-amber-400" />
            <span className="font-bold text-sm text-amber-400">All for One</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-amber-400/10 text-amber-400 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User-Menü */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {session.user.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm max-w-[120px] truncate">
                  {session.user.name}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {roles[0] ?? 'Member'}
                </p>
              </div>
              <DropdownMenuSeparator />
              {can.syncGuild(roles) && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/roster" className="gap-2 cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Roster synchronisieren
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="h-3.5 w-3.5" />
                Ausloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
