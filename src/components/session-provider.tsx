'use client';

/**
 * SessionProvider-Wrapper für NextAuth v5.
 * Muss als Client-Komponente das gesamte Layout umschließen.
 */

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
