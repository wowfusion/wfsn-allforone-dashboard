import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { SettingsPage } from '@/components/admin/settings-page';

/**
 * App-Einstellungen Seite – nur für ADMIN zugänglich.
 */
export default async function AdminSettingsPage() {
  const session = await auth();

  if (!can.manageConfig((session?.user?.appRoles ?? []) as AppRole[])) {
    redirect('/dashboard');
  }

  return <SettingsPage />;
}
