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

  const lastSync = players[0]?.lastSync ?? null;

  return <RosterPage players={players} lastSync={lastSync} session={session!} rosterMaxLevel={settings.rosterMaxLevel} />;
}
