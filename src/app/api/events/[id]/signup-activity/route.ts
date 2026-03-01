/**
 * GET /api/events/:id/signup-activity – Aktivitätslog für An-/Abmeldungen eines Events (OFFICER+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.createEvent((session.user.appRoles ?? []) as AppRole[])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { id: eventId } = await params;

  const activities = await prisma.signupActivity.findMany({
    where: { eventId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Aggregierte Statistiken
  const stats = await prisma.signupActivity.groupBy({
    by: ['newStatus'],
    where: { eventId },
    _count: { id: true },
  });

  return NextResponse.json({ activities, stats });
}
