/**
 * NextAuth Typen-Erweiterung – App-spezifische Session-Felder.
 */

import type { AppRole } from '@/lib/rbac';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      discordId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      appRoles: AppRole[];
    };
  }

  interface JWT {
    userId?: string;
    discordId?: string;
    accessToken?: string;
    appRoles?: AppRole[];
  }
}
