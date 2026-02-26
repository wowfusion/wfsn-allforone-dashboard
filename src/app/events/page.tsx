import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EventsList } from '@/components/events/events-list';

/**
 * Events-Übersicht – alle Raids & Events der Gilde.
 */
export default async function EventsPage() {
  const session = await auth();

  const [events, rosterPlayers] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startAt: 'asc' },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { signups: true } },
      },
    }),
    prisma.player.findMany({
      where: { isMaxLevel: true },
      select: { id: true, characterName: true, className: true, role: true },
      orderBy: { characterName: 'asc' },
    }),
  ]);

  // Eigene Anmeldungen vorladen
  const mySignups = session?.user?.id
    ? await prisma.signup.findMany({
        where: { userId: session.user.id },
        select: { eventId: true, status: true },
      })
    : [];

  return (
    <EventsList
      events={events}
      mySignups={mySignups}
      session={session!}
      rosterPlayers={rosterPlayers}
    />
  );
}
