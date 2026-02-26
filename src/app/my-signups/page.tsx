import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { AttendancePage } from '@/components/attendance-page';

/**
 * Teilnahme-Tracking – OFFICER+ sieht alle User, MEMBER nur eigene Anmeldungen.
 */
export default async function MySignups() {
  const session = await auth();
  const roles = (session?.user?.appRoles ?? []) as AppRole[];
  const canViewAll = can.lockEvent(roles);

  const signups = await prisma.signup.findMany({
    where: canViewAll ? undefined : { userId: session!.user.id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          startAt: true,
          status: true,
        },
      },
      user: {
        select: { id: true, name: true, avatar: true },
      },
      player: {
        select: { id: true, characterName: true, className: true },
      },
    },
    orderBy: { event: { startAt: 'desc' } },
  });

  return <AttendancePage signups={signups} session={session!} canViewAll={canViewAll} />;
}
