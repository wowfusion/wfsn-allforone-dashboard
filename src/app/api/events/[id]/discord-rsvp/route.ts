/**
 * API-Route: Discord RSVP für ein Event synchronisieren und abrufen.
 * GET  – Holt RSVP-User von Discord und speichert/aktualisiert sie in der DB.
 * Kein Login der RSVP-User nötig – nur der Bot-Token wird genutzt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchDiscordRsvpUsers } from '@/lib/discord';

/** Leitet aus den Discord-Rollen-IDs des Users die WoW-Rolle ab (serverseitig). */
function suggestWowRole(discordRoles: string[]): 'TANK' | 'HEALER' | 'DPS' | null {
  const toIds = (key: string) =>
    (process.env[key] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  if (toIds('DISCORD_ROLE_WOW_TANK').some((id) => discordRoles.includes(id))) return 'TANK';
  if (toIds('DISCORD_ROLE_WOW_HEALER').some((id) => discordRoles.includes(id))) return 'HEALER';
  if (toIds('DISCORD_ROLE_WOW_DPS').some((id) => discordRoles.includes(id))) return 'DPS';
  return null;
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
    return NextResponse.json({ rsvps: existing, synced: false });
  }

  // Discord RSVP-User abrufen und in DB synchronisieren
  try {
    const discordUsers = await fetchDiscordRsvpUsers(event.discordEventId);

    // Upsert: neue User anlegen, bestehende aktualisieren und leftAt zurücksetzen
    for (const u of discordUsers) {
      await prisma.discordRsvp.upsert({
        where: { eventId_discordUserId: { eventId, discordUserId: u.discordUserId } },
        create: {
          eventId,
          discordUserId: u.discordUserId,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          discordRoles: u.discordRoles,
        },
        update: {
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          discordRoles: u.discordRoles,
          leftAt: null, // Wieder-Anmeldung: Abmelde-Timestamp zurücksetzen
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

    const rsvpsWithSuggestion = rsvps.map((r) => ({
      ...r,
      suggestedRole: suggestWowRole(r.discordRoles),
    }));

    return NextResponse.json({ rsvps: rsvpsWithSuggestion, synced: true });
  } catch (err) {
    console.error('[Discord RSVP] Sync-Fehler:', err);

    // Bei Fehler: gespeicherte Daten zurückgeben
    const rsvps = await prisma.discordRsvp.findMany({
      where: { eventId },
      include: { raidSlots: true },
      orderBy: { createdAt: 'asc' },
    });
    const rsvpsWithSuggestion = rsvps.map((r) => ({
      ...r,
      suggestedRole: suggestWowRole(r.discordRoles),
    }));
    return NextResponse.json({ rsvps: rsvpsWithSuggestion, synced: false, error: String(err) });
  }
}
