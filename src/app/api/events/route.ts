/**
 * GET  /api/events  – Liste aller Events (authentifizierte User)
 * POST /api/events  – Neues Event erstellen (OFFICER+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createEventSchema } from '@/lib/validations';
import { can } from '@/lib/rbac';
import { createDiscordScheduledEvent } from '@/lib/discord';

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

  const { title, type, description, startAt, endAt, lockAt, maxSlots, roleSlots } = parsed.data;

  const shouldPublish = body.publish === true;

  const event = await prisma.event.create({
    data: {
      title,
      type,
      description,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      lockAt: lockAt ? new Date(lockAt) : null,
      maxSlots,
      roleSlots: roleSlots ?? undefined,
      status: shouldPublish ? 'PUBLISHED' : 'DRAFT',
      createdBy: session.user.id,
    },
    include: {
      signups: { include: { user: true } },
      creator: true,
    },
  });

  // Discord-Post wenn direkt published
  if (shouldPublish) {
    const fullEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: { signups: { include: { user: true } }, creator: true },
    });
    const discordResult = await createDiscordScheduledEvent(fullEvent);

    await prisma.event.update({
      where: { id: event.id },
      data: {
        discordEventId: discordResult.discordEventId,
        discordSyncStatus: discordResult.discordEventId ? 'SYNCED' : 'FAILED',
      },
    });
  }

  return NextResponse.json(event, { status: 201 });
}
