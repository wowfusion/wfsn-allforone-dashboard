import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';

/**
 * Events-Layout – nutzt dieselbe Navigation wie das Dashboard.
 */
export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav session={session} />
      <main className="flex-1 max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8 w-full">{children}</main>
    </div>
  );
}
