'use client';

/**
 * Events-Liste – zeigt alle Raids & Events mit Filter und Aktionen.
 * OFFICER+ können direkt hier ein neues Event erstellen inkl. Discord-Push-Option.
 */

import Link from 'next/link';
import type { Session } from 'next-auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Plus, Search, Lock, Clock, Users, Save, Send, AlertTriangle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { can } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { format, formatDistanceToNow, toInputDatetime } from '@/lib/date-utils';
import { createEventSchema, type CreateEventInput } from '@/lib/validations';

interface EventItem {
  id: string;
  title: string;
  type: 'RAID' | 'EVENT';
  startAt: Date;
  endAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DONE';
  description: string | null;
  creator: { id: string; name: string; avatar: string | null };
  _count: { signups: number };
}

interface MySignup {
  eventId: string;
  status: 'GOING' | 'MAYBE' | 'DECLINED' | 'WAITLIST';
}

interface RosterPlayer {
  id: string;
  characterName: string;
  className: string;
  role: string | null;
}

interface EventsListProps {
  events: EventItem[];
  mySignups: MySignup[];
  session: Session;
  rosterPlayers?: RosterPlayer[];
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Entwurf', variant: 'secondary' as const, color: 'text-muted-foreground' },
  PUBLISHED: { label: 'Offen', variant: 'default' as const, color: 'text-green-400' },
  LOCKED: { label: '🔒 Gesperrt', variant: 'outline' as const, color: 'text-orange-400' },
  DONE: { label: 'Abgeschlossen', variant: 'secondary' as const, color: 'text-muted-foreground' },
};

const SIGNUP_STATUS_LABEL: Record<string, string> = {
  GOING: '✅ Angemeldet',
  MAYBE: '❓ Vielleicht',
  DECLINED: '❌ Abgesagt',
  WAITLIST: '⏳ Warteliste',
};

export function EventsList({ events, mySignups, session, rosterPlayers = [] }: EventsListProps) {
  const roles = (session.user.appRoles ?? []) as AppRole[];
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'all' | 'mine'>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pushToDiscord, setPushToDiscord] = useState(true);

  const now = new Date();
  const defaultStart = toInputDatetime(new Date(now.getTime() + 24 * 3600_000));
  const defaultEnd = toInputDatetime(new Date(now.getTime() + 27 * 3600_000));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { type: 'RAID' },
  });

  const selectedType = watch('type');

  async function onSubmit(data: CreateEventInput, publish: boolean) {
    setServerError(null);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, publish, pushToDiscord: publish && pushToDiscord }),
    });
    if (!res.ok) {
      let errMsg = 'Fehler beim Speichern';
      try {
        const errBody = await res.json();
        errMsg = errBody.error?.formErrors?.join(', ') ?? errBody.error ?? errMsg;
      } catch { /* leerer Body */ }
      setServerError(errMsg);
      return;
    }
    const saved = await res.json();
    reset();
    setShowForm(false);
    router.push(`/events/${saved.id}`);
    router.refresh();
  }

  const mySignupMap = new Map(mySignups.map((s) => [s.eventId, s.status]));

  const filtered = events.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    const now = new Date();
    if (tab === 'upcoming') return new Date(e.startAt) >= now || e.status === 'PUBLISHED';
    if (tab === 'mine') return mySignupMap.has(e.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Raids & Events</h1>
          <p className="text-muted-foreground text-sm mt-1">{events.length} Events gesamt</p>
        </div>
        {can.createEvent(roles) && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => { setShowForm((v) => !v); setServerError(null); }}
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Schließen' : 'Neues Event'}
          </Button>
        )}
      </div>

      {/* Inline-Formular Neues Event */}
      {showForm && can.createEvent(roles) && (
        <Card className="border-amber-400/30 bg-amber-400/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-400 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Neues Event erstellen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* Typ */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Typ *</label>
                <div className="flex gap-2">
                  {(['RAID', 'EVENT'] as const).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-border/60 hover:bg-accent/40 transition-colors has-[:checked]:border-amber-400/60 has-[:checked]:bg-amber-400/10"
                    >
                      <input type="radio" value={type} {...register('type')} className="sr-only" defaultChecked={type === 'RAID'} />
                      <span className="text-sm font-medium">{type === 'RAID' ? '⚔️ Raid' : '🎉 Event'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Titel */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="new-title">Titel *</label>
                <Input id="new-title" placeholder="z.B. Nerubar Palace Heroic" {...register('title')} aria-invalid={!!errors.title} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              {/* Beschreibung */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="new-desc">Beschreibung</label>
                <textarea
                  id="new-desc"
                  className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  placeholder="Optionale Infos…"
                  {...register('description')}
                />
              </div>

              {/* Start / Ende */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="new-start">Start *</label>
                  <Input id="new-start" type="datetime-local" defaultValue={defaultStart} {...register('startAt')} aria-invalid={!!errors.startAt} />
                  {errors.startAt && <p className="text-xs text-destructive">{errors.startAt.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="new-end">Ende *</label>
                  <Input id="new-end" type="datetime-local" defaultValue={defaultEnd} {...register('endAt')} aria-invalid={!!errors.endAt} />
                  {errors.endAt && <p className="text-xs text-destructive">{errors.endAt.message}</p>}
                </div>
              </div>

              {/* Lock + Slots */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="new-lock">Anmeldeschluss</label>
                  <Input id="new-lock" type="datetime-local" {...register('lockAt')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="new-slots">Max. Teilnehmer</label>
                  <Input id="new-slots" type="number" min={1} max={40} placeholder="z.B. 20" {...register('maxSlots', { valueAsNumber: true })} />
                </div>
              </div>

              {/* Raidlead – nur bei Raid */}
              {selectedType === 'RAID' && rosterPlayers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="new-raidlead">Raidlead (optional)</label>
                  <select
                    id="new-raidlead"
                    {...register('raidLeadName')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">– Kein Raidlead –</option>
                    {rosterPlayers.map((p) => (
                      <option key={p.id} value={p.characterName}>
                        {p.characterName} ({p.className}{p.role ? ` · ${p.role}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rollen-Slots – nur bei Raid */}
              {selectedType === 'RAID' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rollen-Slots (optional)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['tank', 'healer', 'dps'] as const).map((role) => (
                      <div key={role} className="space-y-1">
                        <label className="text-xs text-muted-foreground">{role === 'healer' ? 'Heiler' : role === 'tank' ? 'Tank' : 'DPS'}</label>
                        <Input type="number" min={0} max={30} placeholder="0" {...register(`roleSlots.${role}`, { valueAsNumber: true })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discord-Push-Option */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-accent/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={pushToDiscord}
                  onChange={(e) => setPushToDiscord(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#5865F2]" />
                  <span className="text-sm font-medium">Als Discord Scheduled Event posten</span>
                </div>
              </label>

              {/* Fehler */}
              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

              {/* Aktions-Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Button type="button" variant="outline" size="sm" className="gap-2" disabled={isSubmitting} onClick={handleSubmit((data) => onSubmit(data, false))}>
                  <Save className="h-4 w-4" />
                  Als Entwurf speichern
                </Button>
                <Button type="button" size="sm" className="gap-2" disabled={isSubmitting} onClick={handleSubmit((data) => onSubmit(data, true))}>
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Wird veröffentlicht…' : 'Veröffentlichen'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Events suchen…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming">Anstehend</TabsTrigger>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="mine">Meine</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Event-Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Events gefunden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => {
            const statusCfg = STATUS_CONFIG[event.status];
            const mySignupStatus = mySignupMap.get(event.id);
            const isLocked = event.status === 'LOCKED';

            return (
              <Card key={event.id} className={`transition-colors hover:border-border ${isLocked ? 'opacity-80' : ''}`}>
                <CardContent className="p-4">
                  <Link href={`/events/${event.id}`} className="flex items-start justify-between gap-4 group">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-2xl mt-0.5">
                        {event.type === 'RAID' ? '⚔️' : '🎉'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm group-hover:text-amber-400 transition-colors truncate">
                            {event.title}
                          </h3>
                          <Badge variant={statusCfg.variant} className="text-xs shrink-0">
                            {statusCfg.label}
                          </Badge>
                          {mySignupStatus && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {SIGNUP_STATUS_LABEL[mySignupStatus]}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startAt))}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event._count.signups} Anmeldungen
                          </span>
                          <span className="text-muted-foreground/60">
                            {formatDistanceToNow(new Date(event.startAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isLocked && <Lock className="h-4 w-4 text-orange-400 shrink-0 mt-1" />}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
