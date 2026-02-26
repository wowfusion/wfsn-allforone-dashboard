/**
 * NextAuth v5 Konfiguration mit Discord OAuth2.
 * Scope: nur identify – Rollen werden über den Bot Token abgefragt.
 */

import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { prisma } from '@/lib/prisma';
import type { AppRole } from '@/lib/rbac';
import { mapDiscordRolesToAppRoles } from '@/lib/rbac';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Ruft die Gilden-Rollen eines Users über den Bot Token ab.
 * Gibt null zurück wenn der User kein Mitglied ist.
 */
async function fetchMemberRolesViaBot(discordUserId: string): Promise<string[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    console.error('[Auth] DISCORD_BOT_TOKEN oder DISCORD_GUILD_ID nicht gesetzt');
    return null;
  }

  const res = await fetch(
    `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`,
    { headers: { Authorization: `Bot ${botToken}` } }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('[Auth] Bot-Rollen-Abfrage fehlgeschlagen:', res.status, await res.text());
    return null;
  }

  const data = await res.json() as { roles: string[] };
  return data.roles ?? [];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify',
        },
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 60 },
  callbacks: {
    /**
     * Wird nach erfolgreichem OAuth aufgerufen.
     * Prüft Gildenmitgliedschaft + Rollen und blockiert bei fehlendem Zugriff.
     */
    async signIn({ user, account }) {
      if (account?.provider !== 'discord' || !account.providerAccountId) return false;

      const discordUserId = account.providerAccountId;

      try {
        const discordRoleIds = await fetchMemberRolesViaBot(discordUserId);

        if (discordRoleIds === null) {
          console.warn(`[Auth] User ${user.name} ist kein Mitglied oder Bot-Fehler`);
          return '/unauthorized?reason=not_guild_member';
        }

        const appRoles = mapDiscordRolesToAppRoles(discordRoleIds);

        if (appRoles.length === 0) {
          console.warn(`[Auth] User ${user.name} (Rollen: ${discordRoleIds.join(',')}) hat keine berechtigende Rolle`);
          return '/unauthorized?reason=no_role';
        }

        // Rollen-Snapshot in DB speichern
        if (process.env.DATABASE_URL) {
          await prisma.user.upsert({
            where: { discordId: discordUserId },
            update: {
              name: user.name ?? '',
              avatar: user.image,
              rolesSnapshot: discordRoleIds,
              lastLogin: new Date(),
            },
            create: {
              discordId: discordUserId,
              name: user.name ?? '',
              avatar: user.image,
              rolesSnapshot: discordRoleIds,
              lastLogin: new Date(),
            },
          });
        }

        return true;
      } catch (err) {
        console.error('[Auth] Fehler bei Guild-Prüfung:', err);
        return '/unauthorized?reason=error';
      }
    },

    /** JWT-Token beim initialen Login mit Rollen und discordId anreichern */
    async jwt({ token, account }) {
      if (account?.provider === 'discord' && account.providerAccountId) {
        const discordUserId = account.providerAccountId;
        token.discordId = discordUserId;

        const discordRoleIds = await fetchMemberRolesViaBot(discordUserId);
        token.appRoles = discordRoleIds ? mapDiscordRolesToAppRoles(discordRoleIds) : [];

        if (process.env.DATABASE_URL) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { discordId: discordUserId },
              select: { id: true },
            });
            if (dbUser) token.userId = dbUser.id;
          } catch (err) {
            console.error('[Auth] JWT DB-Zugriff fehlgeschlagen:', err);
          }
        }
      }

      // userId bei Folge-Requests aus DB nachladen falls noch nicht gesetzt
      if (!token.userId && token.discordId && process.env.DATABASE_URL) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: token.discordId as string },
            select: { id: true },
          });
          if (dbUser) token.userId = dbUser.id;
        } catch (err) {
          console.error('[Auth] JWT userId Nachladen fehlgeschlagen:', err);
        }
      }

      return token;
    },

    /** Session mit App-Rollen anreichern */
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.discordId = token.discordId as string;
      session.user.appRoles = (token.appRoles ?? []) as AppRole[];
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/unauthorized',
  },
});
