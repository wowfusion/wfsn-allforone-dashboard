/**
 * POST /api/discord/members-sync – Alle Discord-Server-Mitglieder abrufen
 * und ihre Rollen-Zuordnung (TANK/HEALER/DPS) in der DiscordRsvp-Tabelle
 * als Snapshot speichern. Dient als Datenquelle für den Roster.
 * Benötigt: OFFICER+ Berechtigung
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { fetchDiscordGuildMembers } from '@/lib/discord';

/** Singleton-Tabelle für gecachte Discord-Member-Rollen */
const CACHE_KEY = 'discord-members';

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.syncGuild(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung (OFFICER+ erforderlich)' }, { status: 403 });
  }

  try {
    const members = await fetchDiscordGuildMembers();

    // Rollen-IDs aus Env
    const toIds = (key: string) =>
      (process.env[key] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const tankIds = toIds('DISCORD_ROLE_WOW_TANK');
    const healerIds = toIds('DISCORD_ROLE_WOW_HEALER');
    const dpsIds = toIds('DISCORD_ROLE_WOW_DPS');

    // Nur Mitglieder mit mindestens einer WoW-Rolle speichern
    const wowMembers = members.filter((m) =>
      [...tankIds, ...healerIds, ...dpsIds].some((id) => m.discordRoles.includes(id))
    );

    // Upsert in eigener Tabelle – wir nutzen eine einfache KV-ähnliche Struktur
    // und speichern die Daten als JSON in AppSettings (kein Schema-Change nötig)
    const snapshot = wowMembers.map((m) => ({
      discordUserId: m.discordUserId,
      username: m.username,
      displayName: m.displayName,
      avatar: m.avatar,
      roles: [
        ...(tankIds.some((id) => m.discordRoles.includes(id)) ? ['TANK'] : []),
        ...(healerIds.some((id) => m.discordRoles.includes(id)) ? ['HEALER'] : []),
        ...(dpsIds.some((id) => m.discordRoles.includes(id)) ? ['DPS'] : []),
      ] as string[],
    }));

    // Snapshot als JSON in der Cache-Tabelle speichern
    await prisma.discordMemberCache.upsert({
      where: { id: CACHE_KEY },
      create: {
        id: CACHE_KEY,
        membersJson: JSON.stringify(snapshot),
        syncedAt: new Date(),
      },
      update: {
        membersJson: JSON.stringify(snapshot),
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      total: members.length,
      withWowRoles: wowMembers.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DiscordMembersSync] Fehler:', err);
    return NextResponse.json({ error: 'Sync fehlgeschlagen', details: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  try {
    const cache = await prisma.discordMemberCache.findUnique({ where: { id: CACHE_KEY } });
    if (!cache) return NextResponse.json({ members: [], syncedAt: null });

    return NextResponse.json({
      members: JSON.parse(cache.membersJson),
      syncedAt: cache.syncedAt,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
