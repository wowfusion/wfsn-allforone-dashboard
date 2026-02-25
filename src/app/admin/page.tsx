import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { AdminStatsPage } from '@/components/admin/admin-stats-page';

/**
 * Admin/Officer Auswertungsseite – Short-Notice Drop Statistiken.
 */
export default async function AdminPage() {
  const session = await auth();

  if (!can.viewStats((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  const drops = await prisma.dropHistory.findMany({
    where: { isShortNotice: true },
    include: {
      user: { select: { id: true, name: true, avatar: true, discordId: true } },
      event: { select: { id: true, title: true, startAt: true, type: true } },
    },
    orderBy: { droppedAt: 'desc' },
  });

  return <AdminStatsPage drops={drops} session={session!} />;
}
