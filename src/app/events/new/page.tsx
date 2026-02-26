import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { EventForm } from '@/components/events/event-form';

/**
 * Seite: Neues Event erstellen (OFFICER+)
 */
export default async function NewEventPage() {
  const session = await auth();

  if (!can.createEvent((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  const rosterPlayers = await prisma.player.findMany({
    where: { isMaxLevel: true },
    select: { id: true, characterName: true, className: true, role: true },
    orderBy: { characterName: 'asc' },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Neues Event erstellen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Erstelle einen neuen Raid oder ein Guild-Event.
        </p>
      </div>
      <EventForm rosterPlayers={rosterPlayers} />
    </div>
  );
}
