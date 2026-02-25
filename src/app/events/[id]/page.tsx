import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EventDetail } from '@/components/events/event-detail';

/**
 * Event-Detailseite – zeigt Anmeldungen, Signup-Formular und Lock-Funktion.
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

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

  if (!event) notFound();

  const players = await prisma.player.findMany({
    where: { isMaxLevel: true },
    orderBy: { characterName: 'asc' },
    select: { id: true, characterName: true, realm: true, className: true, role: true },
  });

  return <EventDetail event={event} session={session!} players={players} />;
}
