import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { EventForm } from '@/components/events/event-form';
import { toInputDatetime } from '@/lib/date-utils';

/**
 * Event bearbeiten (OFFICER+, nur nicht-gesperrte Events)
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!can.editEvent((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  if (event.status === 'LOCKED' || event.status === 'DONE') {
    redirect(`/events/${id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Event bearbeiten</h1>
        <p className="text-muted-foreground text-sm mt-1">{event.title}</p>
      </div>
      <EventForm
        defaultValues={{
          id: event.id,
          title: event.title,
          type: event.type as 'RAID' | 'EVENT',
          description: event.description ?? undefined,
          startAt: toInputDatetime(new Date(event.startAt)),
          endAt: toInputDatetime(new Date(event.endAt)),
          lockAt: event.lockAt ? toInputDatetime(new Date(event.lockAt)) : undefined,
          maxSlots: event.maxSlots ?? undefined,
        }}
      />
    </div>
  );
}
