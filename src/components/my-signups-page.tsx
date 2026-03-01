'use client';

/**
 * Meine Anmeldungen – Übersicht aller eigenen Event-Anmeldungen.
 */

import Link from 'next/link';
import type { Session } from 'next-auth';
import { Calendar, Clock, CheckCircle, XCircle, HelpCircle, Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format, formatDistanceToNow } from '@/lib/date-utils';

interface SignupEvent {
  id: string;
  title: string;
  type: 'RAID' | 'EVENT';
  startAt: Date;
  endAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DONE';
}

interface SignupPlayer {
  id: string;
  characterName: string;
  className: string;
  realm: string;
}

interface SignupItem {
  id: string;
  status: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
  note: string | null;
  createdAt: Date;
  event: SignupEvent;
  player: SignupPlayer | null;
}

interface MySignupsPageProps {
  signups: SignupItem[];
  session: Session;
}

const SIGNUP_CONFIG = {
  GOING: { label: 'Angemeldet', icon: CheckCircle, color: 'text-green-400' },
  MAYBE: { label: 'Vielleicht', icon: HelpCircle, color: 'text-yellow-400' },
  DECLINED: { label: 'Abgesagt', icon: XCircle, color: 'text-red-400' },
  WAITLIST: { label: 'Warteliste', icon: Hourglass, color: 'text-blue-400' },
};

const EVENT_STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' },
  PUBLISHED: { label: 'Offen', variant: 'default' },
  LOCKED: { label: '🔒 Gesperrt', variant: 'outline' },
  DONE: { label: 'Fertig', variant: 'secondary' },
};

export function MySignupsPage({ signups }: MySignupsPageProps) {
  const upcoming = signups.filter((s) => new Date(s.event.startAt) >= new Date());
  const past = signups.filter((s) => new Date(s.event.startAt) < new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Meine Anmeldungen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {signups.length} Anmeldung{signups.length !== 1 ? 'en' : ''} gesamt
        </p>
      </div>

      {signups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Du hast dich noch für kein Event angemeldet.</p>
          <Link href="/events" className="text-primary text-sm hover:underline mt-2 block">
            Alle Events ansehen →
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Anstehend ({upcoming.length})
              </h2>
              {upcoming.map((signup) => (
                <SignupCard key={signup.id} signup={signup} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Vergangen ({past.length})
              </h2>
              {past.map((signup) => (
                <SignupCard key={signup.id} signup={signup} isPast />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SignupCard({ signup, isPast = false }: { signup: SignupItem; isPast?: boolean }) {
  const cfg = SIGNUP_CONFIG[signup.status];
  const Icon = cfg.icon;
  const eventStatusCfg = EVENT_STATUS_BADGE[signup.event.status];

  return (
    <Card className={isPast ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <Link href={`/events/${signup.event.id}`} className="flex items-center justify-between gap-4 group">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl">{signup.event.type === 'RAID' ? '⚔️' : '🎉'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                  {signup.event.title}
                </p>
                <Badge variant={eventStatusCfg.variant} className="text-xs shrink-0">
                  {eventStatusCfg.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(signup.event.startAt))}
                </span>
                {!isPast && (
                  <span className="text-muted-foreground/60">
                    {formatDistanceToNow(new Date(signup.event.startAt))}
                  </span>
                )}
                {signup.player && (
                  <span className="text-muted-foreground/80">
                    {signup.player.characterName} ({signup.player.className})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${cfg.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {cfg.label}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
