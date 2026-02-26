/**
 * POST /api/guild/sync – Gilden-Roster aus Battle.net synchronisieren (OFFICER+)
 * Lädt nur Max-Level (80) Charaktere und speichert sie lokal.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { fetchGuildRosterPublic, fetchCharacterProfile } from '@/lib/blizzard';
import type { BnetRosterMember } from '@/lib/types';

/** Max-Level in War Within */
const MAX_LEVEL = 80;

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.syncGuild(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung (OFFICER+ erforderlich)' }, { status: 403 });
  }

  const guildName = process.env.GUILD_NAME_SLUG;
  const realmSlug = process.env.GUILD_REALM_SLUG;

  if (!guildName || !realmSlug) {
    return NextResponse.json(
      { error: 'GUILD_NAME_SLUG und GUILD_REALM_SLUG müssen in .env.local gesetzt sein' },
      { status: 500 }
    );
  }

  try {
    const rosterData = await fetchGuildRosterPublic(guildName, realmSlug);

    // Nur Max-Level-Charaktere (serverseitige Einschränkung)
    const maxLevelMembers = rosterData.members.filter(
      (m: BnetRosterMember) => m.character.level >= MAX_LEVEL
    );

    const { WOW_CLASSES } = await import('@/lib/types');

    // Character-Profile parallel laden (equipped_item_level + active_spec)
    const profileResults = await Promise.all(
      maxLevelMembers.map(async (m) => {
        try {
          const profile = await fetchCharacterProfile(m.character.realm.slug, m.character.name);
          return {
            key: `${m.character.name}-${m.character.realm.slug}`,
            itemLevel: profile?.equipped_item_level ?? null,
            specName: profile?.active_spec?.name ?? null,
          };
        } catch {
          return { key: `${m.character.name}-${m.character.realm.slug}`, itemLevel: null, specName: null };
        }
      })
    );
    const profileMap = new Map(profileResults.map((r) => [r.key, r]));

    let created = 0;
    let updated = 0;

    for (const member of maxLevelMembers) {
      const char = member.character;
      const classInfo = WOW_CLASSES[char.playable_class.id];
      const realmName = char.realm.name ?? char.realm.slug;
      const profile = profileMap.get(`${char.name}-${char.realm.slug}`);

      const data = {
        characterName: char.name,
        realm: realmName,
        realmSlug: char.realm.slug,
        faction: char.faction?.type ?? rosterData.guild.faction.type,
        classId: char.playable_class.id,
        className: classInfo?.name ?? `Klasse ${char.playable_class.id}`,
        level: char.level,
        isMaxLevel: char.level >= MAX_LEVEL,
        guildRank: member.rank,
        itemLevel: profile?.itemLevel ?? null,
        specName: profile?.specName ?? null,
        lastSync: new Date(),
      };

      const existing = await prisma.player.findUnique({
        where: { characterName_realmSlug: { characterName: char.name, realmSlug: char.realm.slug } },
      });

      if (existing) {
        await prisma.player.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.player.create({ data });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      total: maxLevelMembers.length,
      created,
      updated,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GuildSync] Fehler:', err);
    return NextResponse.json({ error: 'Sync fehlgeschlagen', details: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const players = await prisma.player.findMany({
    where: { isMaxLevel: true },
    orderBy: { characterName: 'asc' },
  });

  return NextResponse.json(players);
}
