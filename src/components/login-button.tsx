'use client';

/**
 * Floating Login-Button unten rechts.
 * Eingeloggte User: Weiterleitung zu /dashboard.
 * Nicht eingeloggte User: Discord OAuth Login.
 */

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, LayoutDashboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="sm" disabled className="gap-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      </div>
    );
  }

  if (session) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="sm"
          className="gap-2 shadow-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:border-amber-400/50"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          <LayoutDashboard className="h-4 w-4" />
          Raidplaner
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="sm"
        className="gap-2 shadow-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:border-amber-400/50"
        variant="outline"
        onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
      >
        <LogIn className="h-4 w-4" />
        Login
      </Button>
    </div>
  );
}
