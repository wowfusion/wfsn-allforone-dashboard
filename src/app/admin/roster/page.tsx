import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { RosterPage } from '@/components/admin/roster-page';

/**
 * Roster & Sync Seite (OFFICER+)
 */
export default async function AdminRosterPage() {
  const session = await auth();

  if (!can.syncGuild((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
    select: { rosterMaxLevel: true },
  });

  const players = await prisma.player.findMany({
    where: { level: { gte: settings.rosterMaxLevel } },
    orderBy: [{ guildRank: 'asc' }, { characterName: 'asc' }],
  });

  // Discord Member Cache laden (aus /api/discord/members-sync befüllt)
  const memberCache = await prisma.discordMemberCache.findUnique({ where: { id: 'discord-members' } });
  const cachedMembers: Array<{ discordUserId: string; username: string; displayName: string | null; roles: string[] }> =
    memberCache ? JSON.parse(memberCache.membersJson) : [];

  // Fallback: Neueste DiscordRsvp-Einträge wenn kein Cache vorhanden
  const rsvpEntries = cachedMembers.length === 0
    ? await prisma.discordRsvp.findMany({
        distinct: ['discordUserId'],
        orderBy: { updatedAt: 'desc' },
        select: { displayName: true, username: true, discordRoles: true },
      })
    : [];

  const tankIds = (process.env.DISCORD_ROLE_WOW_TANK ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const healerIds = (process.env.DISCORD_ROLE_WOW_HEALER ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const dpsIds = (process.env.DISCORD_ROLE_WOW_DPS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  // Name → Rollen-Map aufbauen
  const roleMap = new Map<string, string[]>();

  if (cachedMembers.length > 0) {
    for (const m of cachedMembers) {
      if (m.displayName) roleMap.set(m.displayName.toLowerCase(), m.roles);
      if (m.username) roleMap.set(m.username.toLowerCase(), m.roles);
    }
  } else {
    for (const r of rsvpEntries) {
      const derived: string[] = [];
      if (tankIds.some((id) => r.discordRoles.includes(id))) derived.push('TANK');
      if (healerIds.some((id) => r.discordRoles.includes(id))) derived.push('HEALER');
      if (dpsIds.some((id) => r.discordRoles.includes(id))) derived.push('DPS');
      if (r.displayName) roleMap.set(r.displayName.toLowerCase(), derived);
      if (r.username) roleMap.set(r.username.toLowerCase(), derived);
    }
  }

  const discordMemberSyncedAt = memberCache?.syncedAt ?? null;

  // Spieler mit abgeleiteten Rollen anreichern
  const playersWithRoles = players.map((p) => ({
    ...p,
    wowRoles: roleMap.get(p.characterName.toLowerCase()) ?? [],
  }));

  const lastSync = players[0]?.lastSync ?? null;

  return <RosterPage players={playersWithRoles} lastSync={lastSync} session={session!} rosterMaxLevel={settings.rosterMaxLevel} discordMemberSyncedAt={discordMemberSyncedAt} />;
}
