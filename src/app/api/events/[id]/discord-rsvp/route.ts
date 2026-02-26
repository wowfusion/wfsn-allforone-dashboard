/**
 * API-Route: Discord RSVP für ein Event synchronisieren und abrufen.
 * GET  – Holt RSVP-User von Discord und speichert/aktualisiert sie in der DB.
 * Kein Login der RSVP-User nötig – nur der Bot-Token wird genutzt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchDiscordRsvpUsers } from '@/lib/discord';

/** Leitet aus den Discord-Rollen-IDs des Users alle zutreffenden WoW-Rollen ab (serverseitig). */
function suggestWowRoles(discordRoles: string[]): ('TANK' | 'HEALER' | 'DPS')[] {
  const toIds = (key: string) =>
    (process.env[key] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  const result: ('TANK' | 'HEALER' | 'DPS')[] = [];
  if (toIds('DISCORD_ROLE_WOW_TANK').some((id) => discordRoles.includes(id))) result.push('TANK');
  if (toIds('DISCORD_ROLE_WOW_HEALER').some((id) => discordRoles.includes(id))) result.push('HEALER');
  if (toIds('DISCORD_ROLE_WOW_DPS').some((id) => discordRoles.includes(id))) result.push('DPS');
  return result;
}

/**
 * Baut eine Map discordId → itemLevel aus dem Gilden-Roster.
 * Matched über User.name (case-insensitiv) gegen Player.characterName.
 * Setzt voraus dass der Roster-Sync zuvor itemLevel befüllt hat.
 */
async function buildRosterItemLevelMap(
  rsvpUsers: Array<{ discordUserId: string; displayName: string | null; username: string }>
): Promise<Map<string, number>> {
  if (rsvpUsers.length === 0) return new Map();

  // Alle Max-Level Spieler aus dem Roster laden (itemLevel via Sync befüllt)
  const players = await prisma.player.findMany({
    where: { isMaxLevel: true, itemLevel: { not: null } },
    select: { characterName: true, itemLevel: true },
  });

  // Lookup: characterName (lowercase) → itemLevel
  const playerByName = new Map<string, number>();
  for (const p of players) {
    if (p.itemLevel != null) {
      playerByName.set(p.characterName.toLowerCase(), p.itemLevel);
    }
  }

  // Map: discordId → itemLevel
  // Priorität: displayName (Server-Nickname = WoW-Charname) → username als Fallback
  const map = new Map<string, number>();
  for (const u of rsvpUsers) {
    const candidates = [u.displayName, u.username].filter(Boolean) as string[];
    for (const name of candidates) {
      const ilvl = playerByName.get(name.toLowerCase());
      if (ilvl != null) {
        map.set(u.discordUserId, ilvl);
        break;
      }
    }
  }
  return map;
}

/** Hängt suggestedRoles an eine Liste von RSVP-Einträgen an */
function withSuggestedRoles<T extends { discordRoles: string[] }>(rsvps: T[]) {
  return rsvps.map((r) => ({ ...r, suggestedRoles: suggestWowRoles(r.discordRoles) }));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, discordEventId: true, type: true },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  if (!event.discordEventId) {
    // Kein Discord-Event verknüpft – leere Liste zurückgeben
    const existing = await prisma.discordRsvp.findMany({
      where: { eventId },
      include: { raidSlots: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ rsvps: withSuggestedRoles(existing), synced: false });
  }

  // Discord RSVP-User abrufen und in DB synchronisieren
  try {
    const discordUsers = await fetchDiscordRsvpUsers(event.discordEventId);

    // Roster-iLvl Map vorab aufbauen – matched displayName/username gegen Player.characterName
    const itemLevelMap = await buildRosterItemLevelMap(discordUsers);

    // Upsert: neue User anlegen, bestehende aktualisieren und leftAt + itemLevel setzen
    for (const u of discordUsers) {
      const itemLevel = itemLevelMap.get(u.discordUserId) ?? null;
      await prisma.discordRsvp.upsert({
        where: { eventId_discordUserId: { eventId, discordUserId: u.discordUserId } },
        create: {
          eventId,
          discordUserId: u.discordUserId,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          discordRoles: u.discordRoles,
          itemLevel,
        },
        update: {
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          discordRoles: u.discordRoles,
          leftAt: null, // Wieder-Anmeldung: Abmelde-Timestamp zurücksetzen
          itemLevel,    // iLvl bei jedem Sync aktualisieren
        },
      });
    }

    // User die nicht mehr "Interessiert" sind: Soft-Delete mit Abmelde-Zeitstempel
    const currentIds = discordUsers.map((u) => u.discordUserId);
    await prisma.discordRsvp.updateMany({
      where: {
        eventId,
        discordUserId: { notIn: currentIds },
        leftAt: null, // Nur setzen wenn noch nicht abgemeldet
      },
      data: { leftAt: new Date() },
    });

    const rsvps = await prisma.discordRsvp.findMany({
      where: { eventId },
      include: { raidSlots: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ rsvps: withSuggestedRoles(rsvps), synced: true });
  } catch (err) {
    console.error('[Discord RSVP] Sync-Fehler:', err);

    // Bei Fehler: gespeicherte Daten zurückgeben
    const rsvps = await prisma.discordRsvp.findMany({
      where: { eventId },
      include: { raidSlots: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ rsvps: withSuggestedRoles(rsvps), synced: false, error: String(err) });
  }
}
