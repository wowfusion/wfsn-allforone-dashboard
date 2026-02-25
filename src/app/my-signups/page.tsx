import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MySignupsPage } from '@/components/my-signups-page';

/**
 * Meine Anmeldungen – Übersicht aller eigenen Signup-Einträge.
 */
export default async function MySignups() {
  const session = await auth();

  const signups = await prisma.signup.findMany({
    where: { userId: session!.user.id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          startAt: true,
          endAt: true,
          status: true,
        },
      },
      player: {
        select: { id: true, characterName: true, className: true, realm: true },
      },
    },
    orderBy: { event: { startAt: 'desc' } },
  });

  return <MySignupsPage signups={signups} session={session!} />;
}
