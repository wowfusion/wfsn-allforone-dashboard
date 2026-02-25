'use client';

/**
 * Unauthorized-Seite – wird angezeigt, wenn der User keine Berechtigung hat.
 */

import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

const REASON_MESSAGES: Record<string, string> = {
  not_guild_member: 'Du bist kein Mitglied im Gilden-Discord.',
  no_role: 'Dein Discord-Account hat keine berechtigende Gilden-Rolle.',
  error: 'Bei der Authentifizierung ist ein Fehler aufgetreten.',
};

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? 'no_role';
  const message = REASON_MESSAGES[reason] ?? REASON_MESSAGES.no_role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Kein Zugriff</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <p className="text-sm text-muted-foreground border border-border/50 rounded-lg p-3 bg-muted/30">
          Wende dich an einen Officer der Gilde <strong>All for One</strong>, um die
          entsprechende Discord-Rolle zu erhalten.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              Zur Startseite
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="h-4 w-4" />
            Ausloggen
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense>
      <UnauthorizedContent />
    </Suspense>
  );
}
