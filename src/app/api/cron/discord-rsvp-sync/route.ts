/**
 * Cron-Job: Discord RSVP Sync für alle aktiven Events.
 * GET /api/cron/discord-rsvp-sync
 *
 * Wird von einem externen Scheduler (z.B. Vercel Cron, GitHub Actions, cron-job.org)
 * in dem in den AppSettings konfigurierten Intervall aufgerufen.
 * Gesichert per CRON_SECRET Header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchDiscordRsvpUsers } from '@/lib/discord';

function suggestWowRole(discordRoles: string[]): 'TANK' | 'HEALER' | 'DPS' | null {
  const toIds = (key: string) =>
    (process.env[key] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  if (toIds('DISCORD_ROLE_WOW_TANK').some((id) => discordRoles.includes(id))) return 'TANK';
  if (toIds('DISCORD_ROLE_WOW_HEALER').some((id) => discordRoles.includes(id))) return 'HEALER';
  if (toIds('DISCORD_ROLE_WOW_DPS').some((id) => discordRoles.includes(id))) return 'DPS';
  return null;
}

export async function GET(req: NextRequest) {
  // Sicherheits-Check: CRON_SECRET muss im Authorization-Header übergeben werden
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const startTime = Date.now();

  // Alle PUBLISHED Events mit verknüpftem Discord-Event laden
  const events = await prisma.event.findMany({
    where: {
      status: { in: ['PUBLISHED'] },
      discordEventId: { not: null },
    },
    select: { id: true, discordEventId: true },
  });

  if (events.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, errors: 0, durationMs: Date.now() - startTime });
  }

  let synced = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const event of events) {
    try {
      const discordUsers = await fetchDiscordRsvpUsers(event.discordEventId!);

      // Upsert: neue User anlegen, bestehende aktualisieren
      for (const u of discordUsers) {
        await prisma.discordRsvp.upsert({
          where: { eventId_discordUserId: { eventId: event.id, discordUserId: u.discordUserId } },
          create: {
            eventId: event.id,
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
          },
        });
      }

      // Nicht mehr interessierte User: Soft-Delete mit Abmelde-Zeitstempel
      const currentIds = discordUsers.map((u) => u.discordUserId);
      await prisma.discordRsvp.updateMany({
        where: {
          eventId: event.id,
          discordUserId: { notIn: currentIds },
          leftAt: null,
        },
        data: { leftAt: new Date() },
      });

      synced++;
    } catch (err) {
      errors++;
      errorDetails.push(`Event ${event.id}: ${String(err)}`);
      console.error(`[Cron RSVP] Fehler bei Event ${event.id}:`, err);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[Cron RSVP] Abgeschlossen: ${synced} Events synced, ${errors} Fehler, ${durationMs}ms`);

  return NextResponse.json({
    synced,
    skipped: events.length - synced - errors,
    errors,
    errorDetails: errors > 0 ? errorDetails : undefined,
    durationMs,
  });
}
