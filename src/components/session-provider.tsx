'use client';

/**
 * SessionProvider-Wrapper für NextAuth v5.
 * Muss als Client-Komponente das gesamte Layout umschließen.
 * Bindet den Auto-Logout-Hook ein (30 Minuten Inaktivität).
 */

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { useAutoLogout } from '@/hooks/use-auto-logout';

/** Innere Komponente damit der Hook innerhalb des SessionProvider-Kontexts läuft */
function AutoLogoutGuard({ children }: { children: React.ReactNode }) {
  useAutoLogout(30 * 60 * 1000);
  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <AutoLogoutGuard>{children}</AutoLogoutGuard>
    </NextAuthSessionProvider>
  );
}
