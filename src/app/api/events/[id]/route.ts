/**
 * GET    /api/events/:id  – Event-Details
 * PATCH  /api/events/:id  – Event aktualisieren (OFFICER+)
 * DELETE /api/events/:id  – Event löschen (OFFICER+, nur DRAFT)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateEventSchema } from '@/lib/validations';
import { can } from '@/lib/rbac';
import { createDiscordScheduledEvent, updateDiscordScheduledEvent, deleteDiscordScheduledEvent } from '@/lib/discord';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      signups: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          player: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      lockSnapshot: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.editEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  if (existing.status === 'LOCKED' || existing.status === 'DONE') {
    return NextResponse.json({ error: 'Festgeschriebene Events können nicht geändert werden' }, { status: 409 });
  }

  const body = await req.json();
  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const wasPublished = existing.status === 'DRAFT' && parsed.data.status === 'PUBLISHED';

  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...parsed.data,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
      lockAt: parsed.data.lockAt ? new Date(parsed.data.lockAt) : undefined,
    },
    include: {
      signups: { include: { user: true } },
      creator: true,
    },
  });

  // Discord Scheduled Event bei Publish erstellen
  if (wasPublished) {
    const discordResult = await createDiscordScheduledEvent(updated);
    await prisma.event.update({
      where: { id },
      data: {
        discordEventId: discordResult.discordEventId,
        discordSyncStatus: discordResult.discordEventId ? 'SYNCED' : 'FAILED',
      },
    });
  } else if (existing.discordEventId) {
    // Bestehendes Scheduled Event aktualisieren
    await updateDiscordScheduledEvent(existing.discordEventId, updated);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.editEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  if ((existing.status === 'LOCKED' || existing.status === 'DONE') && !can.manageConfig(session.user.appRoles)) {
    return NextResponse.json({ error: 'Festgeschriebene Events können nur von Admins gelöscht werden' }, { status: 403 });
  }

  // Discord Scheduled Event löschen falls vorhanden
  if (existing.discordEventId) {
    await deleteDiscordScheduledEvent(existing.discordEventId);
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
