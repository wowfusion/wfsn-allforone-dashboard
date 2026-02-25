import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';

export default async function MySignupsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav session={session} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">{children}</main>
    </div>
  );
}
