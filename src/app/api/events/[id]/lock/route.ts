/**
 * POST /api/events/:id/lock – Event festschreiben (OFFICER+)
 * Setzt Status auf LOCKED, erstellt LockSnapshot, aktualisiert Discord-Post.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { updateDiscordScheduledEvent } from '@/lib/discord';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.lockEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung (OFFICER+ erforderlich)' }, { status: 403 });
  }

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      signups: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          player: true,
        },
      },
      creator: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  if (event.status === 'LOCKED' || event.status === 'DONE') {
    return NextResponse.json({ error: 'Event ist bereits festgeschrieben' }, { status: 409 });
  }

  if (event.status === 'DRAFT') {
    return NextResponse.json({ error: 'DRAFT-Events können nicht gesperrt werden (erst publizieren)' }, { status: 409 });
  }

  // Snapshot der finalen Teilnehmer erstellen
  const going = event.signups.filter((s) => s.status === 'GOING');
  const waitlist = event.signups.filter((s) => s.status === 'WAITLIST');
  const declined = event.signups.filter((s) => s.status === 'DECLINED');
  const maybe = event.signups.filter((s) => s.status === 'MAYBE');

  const snapshotJson = {
    lockedAt: new Date().toISOString(),
    going: going.map((s) => ({ userId: s.userId, name: s.user.name, playerId: s.playerId })),
    waitlist: waitlist.map((s) => ({ userId: s.userId, name: s.user.name, playerId: s.playerId })),
    maybe: maybe.map((s) => ({ userId: s.userId, name: s.user.name, playerId: s.playerId })),
    declined: declined.map((s) => ({ userId: s.userId, name: s.user.name })),
    totalGoing: going.length,
    totalWaitlist: waitlist.length,
  };

  // Transaktion: Event sperren + Snapshot erstellen
  const [lockedEvent] = await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: { status: 'LOCKED' },
    }),
    prisma.lockSnapshot.create({
      data: {
        eventId,
        lockedBy: session.user.id,
        snapshotJson,
      },
    }),
  ]);

  // Discord Scheduled Event als COMPLETED markieren
  if (event.discordEventId) {
    const freshEvent = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { signups: { include: { user: true } }, creator: true },
    });
    const success = await updateDiscordScheduledEvent(event.discordEventId, freshEvent, true);

    if (!success) {
      await prisma.event.update({
        where: { id: eventId },
        data: { discordSyncStatus: 'FAILED' },
      });
    }
  }

  return NextResponse.json({ success: true, event: lockedEvent, snapshot: snapshotJson });
}
