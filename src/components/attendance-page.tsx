'use client';

/**
 * Teilnahme-Tracking – Übersicht aller Event-Anmeldungen.
 * OFFICER+ sieht alle User mit Statistiken, MEMBER nur eigene Anmeldungen.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Hourglass,
  Users,
  BarChart3,
  Swords,
  PartyPopper,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from '@/lib/date-utils';

// #region Typen

interface AttendanceEvent {
  id: string;
  title: string;
  type: 'RAID' | 'EVENT';
  startAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DONE';
}

interface AttendanceUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface AttendancePlayer {
  id: string;
  characterName: string;
  className: string;
}

interface SignupEntry {
  id: string;
  status: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
  note: string | null;
  createdAt: Date;
  event: AttendanceEvent;
  user: AttendanceUser;
  player: AttendancePlayer | null;
}

interface AttendancePageProps {
  signups: SignupEntry[];
  session: Session;
  canViewAll: boolean;
}

// #endregion

// #region Konfiguration

const SIGNUP_CONFIG = {
  GOING:    { label: 'Angemeldet', icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-400/10' },
  MAYBE:    { label: 'Vielleicht', icon: HelpCircle,  color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  DECLINED: { label: 'Abgesagt',   icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-400/10' },
  WAITLIST: { label: 'Warteliste', icon: Hourglass,   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
};

const EVENT_TYPE_CONFIG = {
  RAID:  { label: 'Raid',  emoji: '⚔️' },
  EVENT: { label: 'Event', emoji: '🎉' },
};

// #endregion

// #region Hilfsfunktionen

/** Berechnet die Teilnahmequote (GOING + MAYBE / gesamt ohne DECLINED) */
function attendanceRate(entries: SignupEntry[]): number {
  const relevant = entries.filter((e) => e.status !== 'DECLINED');
  if (relevant.length === 0) return 0;
  const positive = relevant.filter((e) => e.status === 'GOING' || e.status === 'MAYBE').length;
  return Math.round((positive / relevant.length) * 100);
}

/** Gruppiert Signups nach User */
function groupByUser(signups: SignupEntry[]): Map<string, { user: AttendanceUser; entries: SignupEntry[] }> {
  const map = new Map<string, { user: AttendanceUser; entries: SignupEntry[] }>();
  for (const s of signups) {
    if (!map.has(s.user.id)) {
      map.set(s.user.id, { user: s.user, entries: [] });
    }
    map.get(s.user.id)!.entries.push(s);
  }
  return map;
}

// #endregion

export function AttendancePage({ signups, session, canViewAll }: AttendancePageProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'RAID' | 'EVENT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST'>('ALL');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filtered = useMemo(() => signups.filter((s) => {
    if (filterType !== 'ALL' && s.event.type !== filterType) return false;
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    return true;
  }), [signups, filterType, filterStatus]);

  const pastSignups = signups.filter((s) => new Date(s.event.startAt) < new Date());
  const totalGoing = signups.filter((s) => s.status === 'GOING').length;
  const totalRaids = signups.filter((s) => s.event.type === 'RAID').length;
  const totalEvents = signups.filter((s) => s.event.type === 'EVENT').length;

  const userGroups = useMemo(() => {
    if (!canViewAll) return null;
    return Array.from(groupByUser(filtered).values())
      .sort((a, b) => b.entries.filter((e) => e.status === 'GOING').length - a.entries.filter((e) => e.status === 'GOING').length);
  }, [filtered, canViewAll]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Teilnahme-Tracking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {canViewAll
            ? `${signups.length} Anmeldungen von allen Mitgliedern`
            : `Deine persönliche Anmelde-Übersicht · ${signups.length} Einträge`}
        </p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-amber-400" />}
          label="Gesamt"
          value={signups.length}
        />
        <StatCard
          icon={<CheckCircle className="h-4 w-4 text-green-400" />}
          label="Angemeldet"
          value={totalGoing}
        />
        <StatCard
          icon={<Swords className="h-4 w-4 text-purple-400" />}
          label="Raids"
          value={totalRaids}
        />
        <StatCard
          icon={<PartyPopper className="h-4 w-4 text-blue-400" />}
          label="Events"
          value={totalEvents}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Typ:</span>
        {(['ALL', 'RAID', 'EVENT'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterType === t
                ? 'bg-amber-400/10 border-amber-400/40 text-amber-400'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'ALL' ? 'Alle' : EVENT_TYPE_CONFIG[t].label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-3">Status:</span>
        {(['ALL', 'GOING', 'MAYBE', 'DECLINED', 'WAITLIST'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterStatus === s
                ? 'bg-amber-400/10 border-amber-400/40 text-amber-400'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'ALL' ? 'Alle' : SIGNUP_CONFIG[s].label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} Einträge
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Einträge für diesen Filter.</p>
        </div>
      ) : canViewAll ? (
        // OFFICER+: Gruppiert nach User
        <div className="space-y-3">
          {userGroups!.map(({ user, entries }) => {
            const going = entries.filter((e) => e.status === 'GOING').length;
            const maybe = entries.filter((e) => e.status === 'MAYBE').length;
            const declined = entries.filter((e) => e.status === 'DECLINED').length;
            const raids = entries.filter((e) => e.event.type === 'RAID').length;
            const rate = attendanceRate(entries);
            const isExpanded = expandedUser === user.id;
            const pastEntries = entries.filter((e) => new Date(e.event.startAt) < new Date());

            return (
              <Card key={user.id} className="overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entries.length} Anmeldungen · {raids} Raids · {pastEntries.length} vergangen
                        </p>
                      </div>
                      {/* Mini-Statistiken */}
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />{going}
                        </span>
                        <span className="text-yellow-400 flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />{maybe}
                        </span>
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />{declined}
                        </span>
                        <div className="ml-2 flex items-center gap-1">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-8">{rate}%</span>
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                    </div>
                  </CardContent>
                </button>

                {/* Ausgeklappte Detail-Liste */}
                {isExpanded && (
                  <div className="border-t border-border/50 divide-y divide-border/30">
                    {entries.map((entry) => (
                      <SignupRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        // MEMBER: Eigene Anmeldungen als flache Liste
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-0">
                <SignupRow entry={entry} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// #region Unterkomponenten

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SignupRow({ entry }: { entry: SignupEntry }) {
  const cfg = SIGNUP_CONFIG[entry.status];
  const Icon = cfg.icon;

  return (
    <Link
      href={`/events/${entry.event.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
    >
      <span className="text-base shrink-0">{EVENT_TYPE_CONFIG[entry.event.type].emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {entry.event.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(entry.event.startAt))}
          </span>
          {entry.player && (
            <span className="text-muted-foreground/70">
              · {entry.player.characterName} ({entry.player.className})
            </span>
          )}
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${cfg.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </div>
    </Link>
  );
}

// #endregion
