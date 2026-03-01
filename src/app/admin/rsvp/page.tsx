import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { RsvpOverview } from '@/components/admin/rsvp-overview';

/**
 * Seite: Discord RSVP Übersicht (OFFICER+)
 * Zeigt alle RSVP-Einträge aller Events mit Filter nach Event, Rolle und Status.
 */
export default async function RsvpOverviewPage() {
  const session = await auth();

  if (!can.createEvent((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  const [events, rsvps, signupActivities] = await Promise.all([
    prisma.event.findMany({
      select: { id: true, title: true, type: true, startAt: true, status: true },
      orderBy: { startAt: 'desc' },
    }),
    prisma.discordRsvp.findMany({
      include: {
        event: { select: { id: true, title: true, type: true, startAt: true } },
        raidSlots: { select: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.signupActivity.findMany({
      include: { user: { select: { name: true, discordId: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Discord RSVP Übersicht</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Alle Interessenten je Event – filterbar nach Event, Rolle und Status.
        </p>
      </div>
      <RsvpOverview events={events} rsvps={rsvps} signupActivities={signupActivities} />
    </div>
  );
}
