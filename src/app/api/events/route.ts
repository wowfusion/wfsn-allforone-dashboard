/**
 * GET  /api/events  – Liste aller Events (authentifizierte User)
 * POST /api/events  – Neues Event erstellen (OFFICER+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createEventSchema } from '@/lib/validations';
import { can } from '@/lib/rbac';
import { createDiscordScheduledEvent, sendEventAnnouncementMessage } from '@/lib/discord';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    orderBy: { startAt: 'asc' },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      _count: { select: { signups: true } },
    },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.createEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, type, description, startAt, endAt, lockAt, maxSlots, coverImage, raidLeadName, roleSlots } = parsed.data;

  // Raidlead automatisch als erste Zeile in die Description einfügen
  const enrichedDescription = raidLeadName && type === 'RAID'
    ? `🎯 Raidlead: ${raidLeadName}${description ? `\n\n${description}` : ''}`
    : description;

  const shouldPublish = body.publish === true;
  const shouldPushDiscord = shouldPublish && body.pushToDiscord !== false;

  if (!session.user.id) {
    return NextResponse.json({ error: 'Benutzer-ID fehlt – bitte neu einloggen' }, { status: 401 });
  }

  const parsedStartAt = new Date(startAt);
  const parsedEndAt = new Date(endAt);
  const parsedLockAt = lockAt ? new Date(lockAt) : null;

  if (isNaN(parsedStartAt.getTime()) || isNaN(parsedEndAt.getTime())) {
    return NextResponse.json({ error: 'Ungültiges Datum für Start oder Ende' }, { status: 400 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        title,
        type,
        description: enrichedDescription,
        raidLeadName: raidLeadName ?? null,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        lockAt: parsedLockAt,
        maxSlots,
        coverImage: coverImage ?? null,
        roleSlots: roleSlots ?? undefined,
        status: shouldPublish ? 'PUBLISHED' : 'DRAFT',
        createdBy: session.user.id,
      },
      include: {
        signups: { include: { user: true } },
        creator: true,
      },
    });

    // Event-Details für Discord-Aktionen laden (creator + signups benötigt)
    let fullEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: { signups: { include: { user: true } }, creator: true },
    });

    // Erst Discord Scheduled Event erstellen damit die discordEventId für den Ankündigungs-Button bekannt ist
    if (shouldPushDiscord) {
      const discordResult = await createDiscordScheduledEvent(fullEvent);

      await prisma.event.update({
        where: { id: event.id },
        data: {
          discordEventId: discordResult.discordEventId,
          discordSyncStatus: discordResult.discordEventId ? 'SYNCED' : 'FAILED',
        },
      });

      // fullEvent mit gesetzter discordEventId neu laden damit der Button-Link korrekt ist
      if (discordResult.discordEventId) {
        fullEvent = await prisma.event.findUniqueOrThrow({
          where: { id: event.id },
          include: { signups: { include: { user: true } }, creator: true },
        });
      }
    }

    // Ankündigung in den Text-Channel senden (inkl. Button-Link falls discordEventId bekannt)
    await sendEventAnnouncementMessage(fullEvent);

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error('[Events POST] Fehler:', err);
    return NextResponse.json({ error: 'Event konnte nicht erstellt werden', details: String(err) }, { status: 500 });
  }
}
