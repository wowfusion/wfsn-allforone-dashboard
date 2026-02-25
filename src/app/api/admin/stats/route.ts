/**
 * GET /api/admin/stats – Auswertung der Short-Notice Drops (OFFICER+)
 * Aggregiert DropHistory pro User, filterbar nach Zeitraum.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!can.viewStats(session.user.appRoles)) {
    return NextResponse.json({ error: 'Keine Berechtigung (OFFICER+ erforderlich)' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const shortNoticeOnly = searchParams.get('shortNoticeOnly') !== 'false';

  const dateFilter = {
    ...(fromParam ? { gte: new Date(fromParam) } : {}),
    ...(toParam ? { lte: new Date(toParam) } : {}),
  };

  const drops = await prisma.dropHistory.findMany({
    where: {
      ...(shortNoticeOnly ? { isShortNotice: true } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { droppedAt: dateFilter } : {}),
    },
    include: {
      user: { select: { id: true, name: true, avatar: true, discordId: true } },
      event: { select: { id: true, title: true, startAt: true, type: true } },
    },
    orderBy: { droppedAt: 'desc' },
  });

  // Aggregation: Drops pro User zusammenfassen
  const userMap = new Map<
    string,
    {
      user: { id: string; name: string; avatar: string | null; discordId: string };
      totalDrops: number;
      shortNoticeDrops: number;
      drops: typeof drops;
    }
  >();

  for (const drop of drops) {
    const uid = drop.userId;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        user: drop.user,
        totalDrops: 0,
        shortNoticeDrops: 0,
        drops: [],
      });
    }
    const entry = userMap.get(uid)!;
    entry.totalDrops++;
    if (drop.isShortNotice) entry.shortNoticeDrops++;
    entry.drops.push(drop);
  }

  const stats = Array.from(userMap.values()).sort(
    (a, b) => b.shortNoticeDrops - a.shortNoticeDrops
  );

  return NextResponse.json({
    totalDrops: drops.length,
    shortNoticeDrops: drops.filter((d) => d.isShortNotice).length,
    users: stats,
    filters: { from: fromParam, to: toParam, shortNoticeOnly },
  });
}
