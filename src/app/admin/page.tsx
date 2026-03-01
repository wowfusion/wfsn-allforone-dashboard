import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { RsvpStatsPage } from '@/components/admin/rsvp-stats-page';

/**
 * Auswertungsseite – RSVP-basierte Statistiken (OFFICER+)
 */
export default async function AdminPage() {
  const session = await auth();

  if (!can.createEvent((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Auswertungen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          RSVP-basierte Statistiken – Anwesenheit, Ranking und Event-Füllstand.
        </p>
      </div>
      <RsvpStatsPage />
    </div>
  );
}
