/**
 * GET    /api/events/:id/signups  – Anmeldungen eines Events
 * POST   /api/events/:id/signups  – Anmelden/Abmelden (MEMBER+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { signupSchema } from '@/lib/validations';
import { can } from '@/lib/rbac';

type RouteParams = { params: Promise<{ id: string }> };

/** Schwellenwert in Stunden für „kurzfristig" (konfigurierbar via env) */
const SHORT_NOTICE_HOURS = parseInt(process.env.SHORT_NOTICE_HOURS ?? '24', 10);

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { id } = await params;

  const signups = await prisma.signup.findMany({
    where: { eventId: id },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      player: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(signups);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.signupForEvent(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { signups: { include: { user: true } }, creator: true },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 });
  }

  if (event.status === 'LOCKED' || event.status === 'DONE') {
    return NextResponse.json({ error: 'Anmeldungen sind festgeschrieben' }, { status: 409 });
  }

  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const existingSignup = await prisma.signup.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  // Abmeldungs-Tracking: war vorher GOING oder MAYBE → DropHistory
  if (existingSignup && parsed.data.status === 'DECLINED') {
    if (existingSignup.status === 'GOING' || existingSignup.status === 'MAYBE') {
      const now = new Date();
      const startAt = new Date(event.startAt);
      const hoursUntilStart = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isAfterLock = event.lockAt ? now > new Date(event.lockAt) : false;
      const isShortNotice = isAfterLock || hoursUntilStart < SHORT_NOTICE_HOURS;

      await prisma.dropHistory.create({
        data: {
          eventId,
          userId,
          previousStatus: existingSignup.status,
          isShortNotice,
          reason: body.reason ?? null,
        },
      });
    }
  }

  // Signup erstellen oder aktualisieren
  const signup = await prisma.signup.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: {
      eventId,
      userId,
      status: parsed.data.status,
      playerId: parsed.data.playerId ?? null,
      note: parsed.data.note ?? null,
    },
    update: {
      status: parsed.data.status,
      playerId: parsed.data.playerId ?? null,
      note: parsed.data.note ?? null,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      player: true,
    },
  });

  // Aktivitäts-Log schreiben (jede Status-Änderung / Erstanmeldung)
  const previousStatus = existingSignup?.status ?? null;
  if (!existingSignup || existingSignup.status !== parsed.data.status) {
    await prisma.signupActivity.create({
      data: {
        eventId,
        userId,
        newStatus: parsed.data.status,
        previousStatus: previousStatus ?? undefined,
      },
    });
  }

  return NextResponse.json(signup);
}
