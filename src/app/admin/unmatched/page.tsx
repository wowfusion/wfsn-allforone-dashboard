import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { UnmatchedPage } from '@/components/admin/unmatched-page';

/**
 * Seite für Gildenmitglieder ohne Discord-Rollen-Zuordnung (OFFICER+)
 */
export default async function AdminUnmatchedPage() {
  const session = await auth();

  if (!can.syncGuild((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  // Alle Spieler ohne Level-Begrenzung laden
  const players = await prisma.player.findMany({
    orderBy: [{ guildRank: 'asc' }, { characterName: 'asc' }],
  });

  // Discord Member Cache laden
  const memberCache = await prisma.discordMemberCache.findUnique({
    where: { id: 'discord-members' },
  });

  const cachedMembers: Array<{
    discordUserId: string;
    username: string;
    displayName: string | null;
    roles: string[];
  }> = memberCache ? JSON.parse(memberCache.membersJson) : [];

  // Alle bekannten Discord-Namen sammeln (lowercase)
  const discordNames = new Set<string>();
  for (const m of cachedMembers) {
    if (m.displayName) discordNames.add(m.displayName.toLowerCase());
    if (m.username) discordNames.add(m.username.toLowerCase());
  }

  type UnmatchedReason = 'NOT_IN_DISCORD' | 'NAME_MISMATCH' | 'FORMER_MEMBER' | 'NO_CACHE';

  /** Alle zutreffenden Gründe ermitteln */
  function getReasons(charName: string, isFormerMember: boolean): UnmatchedReason[] {
    if (cachedMembers.length === 0) return ['NO_CACHE'];
    const reasons: UnmatchedReason[] = [];
    if (isFormerMember) reasons.push('FORMER_MEMBER');

    const lower = charName.toLowerCase();

    // Exakter Match wurde bereits ausgeschlossen (Spieler ist in unmatched-Liste).
    // NAME_MISMATCH nur wenn ein Discord-Name mit denselben ersten 4+ Zeichen beginnt.
    const PREFIX_LEN = 4;
    const prefix = lower.slice(0, PREFIX_LEN);
    const hasSimilarName = prefix.length >= PREFIX_LEN && cachedMembers.some((m) => {
      const dn = m.displayName?.toLowerCase() ?? '';
      const un = m.username?.toLowerCase() ?? '';
      return dn.startsWith(prefix) || un.startsWith(prefix);
    });

    if (hasSimilarName) {
      reasons.push('NAME_MISMATCH');
    } else {
      reasons.push('NOT_IN_DISCORD');
    }

    return reasons;
  }

  // Prüfen ob jemals ein Roster-Sync nach dem Schema-Change stattgefunden hat
  // (wenn kein einziger Spieler isFormerMember=true hat, aber es ehemalige geben könnte)
  const hasFormerMembers = players.some((p) => p.isFormerMember);
  const rosterSyncRequired = cachedMembers.length > 0 && !hasFormerMembers;

  // Spieler ohne passenden Discord-Eintrag filtern
  const unmatched = players
    .filter((p) => !discordNames.has(p.characterName.toLowerCase()))
    .map((p) => ({ ...p, reasons: getReasons(p.characterName, p.isFormerMember) }));

  return (
    <UnmatchedPage
      players={unmatched}
      totalPlayers={players.length}
      discordMemberSyncedAt={memberCache?.syncedAt ?? null}
      rosterSyncRequired={rosterSyncRequired}
      session={session!}
    />
  );
}
