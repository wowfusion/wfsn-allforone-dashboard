/**
 * GET /api/admin/stats – RSVP-basierte Auswertungen für OFFICER+
 * Liefert: Anwesenheitsquote, Abmeldemuster, Teilnehmer-Ranking, iLvl pro Event
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }
  if (!can.createEvent((session.user.appRoles ?? []) as AppRole[])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  // Alle Events mit ihren RSVPs laden
  const events = await prisma.event.findMany({
    where: { status: { in: ['PUBLISHED', 'LOCKED', 'DONE'] } },
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      status: true,
      discordRsvps: {
        select: {
          discordUserId: true,
          username: true,
          displayName: true,
          avatar: true,
          itemLevel: true,
          leftAt: true,
          lastLeftAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { startAt: 'desc' },
  });

  // #region Teilnehmer-Ranking & Anwesenheitsquote

  // Pro User aggregieren
  const userMap = new Map<string, {
    discordUserId: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    itemLevel: number | null;
    attended: number;      // aktiv dabei (leftAt === null)
    declined: number;      // abgemeldet
    totalEvents: number;   // Events wo RSVP gesetzt wurde
    lastDeclineAt: Date | null;
  }>();

  for (const event of events) {
    for (const rsvp of event.discordRsvps) {
      const existing = userMap.get(rsvp.discordUserId) ?? {
        discordUserId: rsvp.discordUserId,
        username: rsvp.username,
        displayName: rsvp.displayName,
        avatar: rsvp.avatar,
        itemLevel: rsvp.itemLevel,
        attended: 0,
        declined: 0,
        totalEvents: 0,
        lastDeclineAt: null,
      };

      existing.totalEvents++;
      // Aktuell aktiv dabei
      if (rsvp.leftAt === null) {
        existing.attended++;
      }
      // Hatte sich abgemeldet (lastLeftAt = je abgemeldet, auch wenn wieder angemeldet)
      if (rsvp.lastLeftAt !== null || rsvp.leftAt !== null) {
        existing.declined++;
      }

      // Letzter Abmeldezeitpunkt (neuester)
      const declineTs = rsvp.lastLeftAt ?? rsvp.leftAt;
      if (declineTs && (!existing.lastDeclineAt || declineTs > existing.lastDeclineAt)) {
        existing.lastDeclineAt = declineTs;
      }

      // iLvl aktuell halten
      if (rsvp.itemLevel) existing.itemLevel = rsvp.itemLevel;

      userMap.set(rsvp.discordUserId, existing);
    }
  }

  const userStats = Array.from(userMap.values())
    .map((u) => ({
      ...u,
      attendanceRate: u.totalEvents > 0 ? Math.round((u.attended / u.totalEvents) * 100) : 0,
    }))
    .sort((a, b) => b.attended - a.attended);

  // #endregion

  // #region iLvl-Entwicklung pro Event (absteigend nach Datum)

  const ilvlPerEvent = events
    .filter((e) => e.discordRsvps.some((r) => r.itemLevel !== null))
    .map((e) => {
      const levels = e.discordRsvps
        .filter((r) => r.itemLevel !== null && r.leftAt === null)
        .map((r) => r.itemLevel as number);

      const avg = levels.length > 0
        ? Math.round(levels.reduce((s, v) => s + v, 0) / levels.length)
        : null;
      const max = levels.length > 0 ? Math.max(...levels) : null;
      const min = levels.length > 0 ? Math.min(...levels) : null;

      return {
        eventId: e.id,
        title: e.title,
        type: e.type,
        startAt: e.startAt,
        avgItemLevel: avg,
        maxItemLevel: max,
        minItemLevel: min,
        participantCount: levels.length,
      };
    })
    .filter((e) => e.avgItemLevel !== null)
    .slice(0, 10); // letzte 10 Events

  // #endregion

  // #region Event-Füllstand

  const eventFillRate = events.slice(0, 20).map((e) => ({
    eventId: e.id,
    title: e.title,
    type: e.type,
    startAt: e.startAt,
    status: e.status,
    active: e.discordRsvps.filter((r) => r.leftAt === null).length,
    declined: e.discordRsvps.filter((r) => r.leftAt !== null).length,
    total: e.discordRsvps.length,
  }));

  // #endregion

  return NextResponse.json({ userStats, ilvlPerEvent, eventFillRate });
}
