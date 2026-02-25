'use client';

/**
 * Landing Page – öffentliche Einstiegsseite.
 * Zeigt Guild-Infos und Features. Login-Button dezent unten rechts.
 */

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield, Calendar, Users, Lock, BarChart3, Bell, LogIn, Sword, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Calendar,
    title: 'Raid-Planung',
    description: 'Erstelle und verwalte Raids & Events mit Anmeldesystem und Slot-Verwaltung.',
  },
  {
    icon: Users,
    title: 'Roster-Verwaltung',
    description: 'Synchronisiert automatisch mit Battle.net – nur Max-Level Charaktere.',
  },
  {
    icon: Bell,
    title: 'Discord-Integration',
    description: 'Automatische Posts & Events im Gilden-Discord beim Erstellen und Sperren.',
  },
  {
    icon: Lock,
    title: 'Locking-System',
    description: 'Anmeldungen festschreiben mit unveränderlichem Snapshot und Discord-Update.',
  },
  {
    icon: Shield,
    title: 'Rollenbasierter Zugriff',
    description: 'Member, Officer und Admin – gesteuert über Discord-Rollen.',
  },
  {
    icon: BarChart3,
    title: 'Auswertungen',
    description: 'Kurzfristige Absagen tracken und übersichtlich für Officers aufbereiten.',
  },
];

export function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Eingeloggte User direkt zum Dashboard weiterleiten
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Hintergrund-Dekoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-6 py-5 border-b border-border/40">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Swords className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold tracking-tight">All for One</span>
            </div>
            <span className="text-muted-foreground text-sm ml-1">Festung der Stürme – EU</span>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 text-xs text-muted-foreground mb-6 bg-muted/30">
              <Sword className="h-3 w-3" />
              Gildendashboard &amp; Raidbuilder
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
              Raid-Organisation
              <br />
              <span className="text-primary/80">für die Gilde</span>
            </h1>

            <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto">
              Plane Raids und Events, verwalte Anmeldungen und synchronisiere alles automatisch
              mit dem Gilden-Discord.
            </p>

            {/* Feature-Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-border transition-colors"
                >
                  <f.icon className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-border/40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} All for One – Festung der Stürme
            </p>
            <p className="text-xs text-muted-foreground">
              World of Warcraft ist ein Markenzeichen von Blizzard Entertainment
            </p>
          </div>
        </footer>
      </div>

      {/* Dezenter Login-Button unten rechts */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="sm"
          variant="outline"
          className="gap-2 shadow-lg bg-card/80 backdrop-blur-sm border-border/60 hover:bg-card text-xs"
          onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
          disabled={status === 'loading'}
        >
          <LogIn className="h-3.5 w-3.5" />
          {status === 'loading' ? 'Laden…' : 'Mit Discord einloggen'}
        </Button>
      </div>
    </div>
  );
}
