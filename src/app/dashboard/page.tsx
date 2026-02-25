import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';

/**
 * Dashboard Hauptseite – zeigt geplante Events und Statistiken.
 */
export default async function DashboardPage() {
  const session = await auth();

  const [upcomingEvents, totalPlayers] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ['PUBLISHED', 'LOCKED'] } },
      orderBy: { startAt: 'asc' },
      take: 5,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { signups: true } },
      },
    }),
    prisma.player.count({ where: { isMaxLevel: true } }),
  ]);

  return (
    <DashboardOverview
      session={session!}
      upcomingEvents={upcomingEvents}
      totalPlayers={totalPlayers}
    />
  );
}
