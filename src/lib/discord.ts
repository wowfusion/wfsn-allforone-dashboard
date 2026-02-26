/**
 * Discord Bot Integration – erstellt und aktualisiert Discord Scheduled Events.
 * Kein Channel-Post, nur native Guild-Events über die Discord API.
 * Benötigt: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
 */

import type { Event, Signup, User } from '../generated/prisma';
import { generateEventCover } from './generate-event-cover';

const DISCORD_API = 'https://discord.com/api/v10';

/** Vollständiges Event mit Signups und Creator */
type EventWithDetails = Event & {
  signups: Array<Signup & { user: User }>;
  creator: User;
};

/** Rückgabe beim Erstellen eines Discord Events */
export interface DiscordEventResult {
  discordEventId: string | null;
  error?: string;
}

// #region API-Hilfsfunktionen

/**
 * Führt einen authentifizierten Discord-API-Request mit Bot-Token aus.
 */
async function discordRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN nicht gesetzt');

  return fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// #endregion

// #region Scheduled Event Body

/**
 * Baut den Request-Body für ein Discord Scheduled Event.
 * entity_type: 2 = VOICE (Voice-Channel als Standort).
 * privacy_level: 2 = GUILD_ONLY.
 */
async function buildScheduledEventBody(event: EventWithDetails, isLocked = false) {
  const statusSuffix = isLocked ? ' 🔒' : '';

  const channelId =
    event.type === 'RAID'
      ? process.env.DISCORD_VOICE_CHANNEL_RAID
      : process.env.DISCORD_VOICE_CHANNEL_EVENT;

  // Slot-Infos aufbauen – alles in einer Zeile nebeneinander
  const slots = event.roleSlots as { tank?: number; healer?: number; dps?: number } | null;
  const slotParts: string[] = [];

  if (slots && (slots.tank || slots.healer || slots.dps)) {
    if (slots.tank) slotParts.push(`${slots.tank} 🛡️`);
    if (slots.healer) slotParts.push(`${slots.healer} 💚`);
    if (slots.dps) slotParts.push(`${slots.dps} ⚔️`);
  } else if (event.maxSlots) {
    slotParts.push(`${event.maxSlots} 👥`);
  }

  const slotLine = slotParts.length > 0 ? `**Raidplanung:** ${slotParts.join(' / ')}` : null;

  const description = [
    event.description ?? '',
    slotLine ? '' : null,
    slotLine,
    isLocked ? '' : null,
    isLocked ? '🔒 Anmeldungen sind festgeschrieben.' : null,
  ]
    .filter((v) => v !== null)
    .join('\n')
    .trim();

  const body: Record<string, unknown> = {
    name: `${event.type === 'RAID' ? '⚔️' : '🎉'} ${event.title}${statusSuffix}`,
    description,
    scheduled_start_time: new Date(event.startAt).toISOString(),
    scheduled_end_time: new Date(event.endAt).toISOString(),
    privacy_level: 2,
    entity_type: 2,
    channel_id: channelId,
  };

  // Cover-Bild automatisch aus dem Banner-Bild mit Titel generieren
  try {
    body.image = await generateEventCover(event.title);
  } catch (err) {
    console.error('[Discord] Cover-Bild Generierung fehlgeschlagen:', err);
  }

  return body;
}

// #endregion

// #region Discord RSVP

/** Discord-User aus dem Scheduled Event RSVP */
export interface DiscordRsvpUser {
  discordUserId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  discordRoles: string[];
}

/**
 * Holt alle User die beim Discord Scheduled Event auf "Interessiert" geklickt haben.
 * Lädt zusätzlich die Guild-Member-Daten um die Discord-Rollen zu kennen.
 */
export async function fetchDiscordRsvpUsers(
  discordEventId: string
): Promise<DiscordRsvpUser[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) throw new Error('DISCORD_GUILD_ID nicht gesetzt');

  const users: DiscordRsvpUser[] = [];
  let after: string | undefined;

  // Paginierung: Discord liefert max. 100 User pro Request
  while (true) {
    const query = new URLSearchParams({ limit: '100', with_member: 'true' });
    if (after) query.set('after', after);

    const res = await discordRequest(
      `/guilds/${guildId}/scheduled-events/${discordEventId}/users?${query}`
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord RSVP Fehler: ${errText}`);
    }

    const page = await res.json() as Array<{
      user: { id: string; username: string; global_name?: string; avatar?: string };
      member?: { roles: string[]; nick?: string };
    }>;

    for (const entry of page) {
      users.push({
        discordUserId: entry.user.id,
        username: entry.user.username,
        displayName: entry.member?.nick ?? entry.user.global_name ?? null,
        avatar: entry.user.avatar
          ? `https://cdn.discordapp.com/avatars/${entry.user.id}/${entry.user.avatar}.webp?size=64`
          : null,
        discordRoles: entry.member?.roles ?? [],
      });
    }

    if (page.length < 100) break;
    after = page[page.length - 1].user.id;
  }

  return users;
}

// #endregion

// #region Öffentliche Funktionen

/**
 * Erstellt ein Discord Scheduled Event beim Publish eines Raids/Events.
 * Gibt die discordEventId zurück oder null bei Fehler.
 * Der Fehler ist nicht kritisch – das App-Event wird trotzdem gespeichert.
 */
export async function createDiscordScheduledEvent(
  event: EventWithDetails
): Promise<DiscordEventResult> {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId) {
    return { discordEventId: null, error: 'DISCORD_GUILD_ID nicht gesetzt' };
  }

  try {
    const body = await buildScheduledEventBody(event);
    const res = await discordRequest(`/guilds/${guildId}/scheduled-events`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json() as { id: string };
      console.info(`[Discord] Scheduled Event erstellt: ${data.id}`);
      return { discordEventId: data.id };
    }

    const errText = await res.text();
    console.error('[Discord] Scheduled Event erstellen fehlgeschlagen:', errText);
    return { discordEventId: null, error: errText };
  } catch (err) {
    console.error('[Discord] Scheduled Event Fehler:', err);
    return { discordEventId: null, error: String(err) };
  }
}

/**
 * Aktualisiert ein bestehendes Discord Scheduled Event (z.B. nach Titeländerung oder beim Lock).
 * Beim Lock: Event-Name bekommt 🔒 Suffix, Status → COMPLETED.
 */
export async function updateDiscordScheduledEvent(
  discordEventId: string,
  event: EventWithDetails,
  isLocked = false
): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return false;

  try {
    const body: Record<string, unknown> = await buildScheduledEventBody(event, isLocked);

    // Beim Locking: Discord-Event als abgeschlossen markieren
    if (isLocked) {
      body.status = 3; // COMPLETED
    }

    const res = await discordRequest(
      `/guilds/${guildId}/scheduled-events/${discordEventId}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    );

    if (!res.ok) {
      console.error('[Discord] Scheduled Event Update fehlgeschlagen:', await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Discord] Scheduled Event Update-Fehler:', err);
    return false;
  }
}

/**
 * Sendet eine Ankündigungs-Nachricht in den konfigurierten Text-Channel
 * (DISCORD_ANNOUNCE_CHANNEL_ID) sobald ein neues Event erstellt wurde.
 * Fehler sind nicht kritisch – das App-Event bleibt gespeichert.
 */
export async function sendEventAnnouncementMessage(
  event: EventWithDetails
): Promise<void> {
  const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  if (!channelId) {
    console.warn('[Discord] DISCORD_ANNOUNCE_CHANNEL_ID nicht gesetzt – Ankündigung übersprungen');
    return;
  }

  const typeEmoji = event.type === 'RAID' ? '⚔️' : '🎉';
  const typeLabel = event.type === 'RAID' ? 'Raid' : 'Event';

  const startDate = new Date(event.startAt);
  const dateStr = startDate.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const timeStr = startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // Slot-Info aufbauen
  const slots = event.roleSlots as { tank?: number; healer?: number; dps?: number } | null;
  const slotParts: string[] = [];
  if (slots?.tank) slotParts.push(`${slots.tank} 🛡️ Tank`);
  if (slots?.healer) slotParts.push(`${slots.healer} 💚 Heiler`);
  if (slots?.dps) slotParts.push(`${slots.dps} ⚔️ DPS`);
  const slotLine = slotParts.length > 0 ? slotParts.join(' · ') : event.maxSlots ? `${event.maxSlots} Plätze` : null;

  // Embed-Felder zusammenstellen
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: '📅 Datum', value: `${dateStr} um ${timeStr} Uhr`, inline: false },
  ];
  if (event.raidLeadName) {
    fields.push({ name: '🎯 Raidlead', value: event.raidLeadName, inline: true });
  }
  if (slotLine) {
    fields.push({ name: '👥 Slots', value: slotLine, inline: true });
  }

  const guildId = process.env.DISCORD_GUILD_ID;

  // Discord Scheduled Event Link (falls bereits eine ID vorhanden – wird nach dem Create gesetzt)
  // Hier wird die ID direkt aus dem Event-Objekt gelesen, falls sie bereits bekannt ist
  const discordEventUrl =
    event.discordEventId && guildId
      ? `https://discord.com/events/${guildId}/${event.discordEventId}`
      : null;

  const embed = {
    title: `${typeEmoji} Neuer ${typeLabel}: ${event.title}`,
    // Embed-Titel wird klickbar wenn url gesetzt ist
    url: discordEventUrl ?? undefined,
    description: event.description
      ? event.description.slice(0, 300) + (event.description.length > 300 ? '…' : '')
      : `Ein neuer ${typeLabel} wurde eingetragen.`,
    color: event.type === 'RAID' ? 0xf59e0b : 0x5865f2,
    fields,
    footer: { text: `Erstellt von ${event.creator.name ?? 'Unbekannt'}` },
    timestamp: new Date().toISOString(),
  };

  // Button-Komponente für direkten RSVP-Link (nur wenn Discord-Event-ID bekannt)
  const components = discordEventUrl
    ? [
        {
          type: 1, // ActionRow
          components: [
            {
              type: 2, // Button
              style: 5, // LINK
              label: '📅 Bei Discord anmelden',
              url: discordEventUrl,
            },
          ],
        },
      ]
    : [];

  try {
    const res = await discordRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ embeds: [embed], ...(components.length > 0 && { components }) }),
    });

    if (!res.ok) {
      console.error('[Discord] Ankündigung senden fehlgeschlagen:', await res.text());
    } else {
      console.info(`[Discord] Ankündigung gesendet für Event: ${event.title}`);
    }
  } catch (err) {
    console.error('[Discord] Ankündigung Fehler:', err);
  }
}

/**
 * Löscht ein Discord Scheduled Event (z.B. bei Event-Löschung im Draft-Status).
 */
export async function deleteDiscordScheduledEvent(
  discordEventId: string
): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return false;

  try {
    const res = await discordRequest(
      `/guilds/${guildId}/scheduled-events/${discordEventId}`,
      { method: 'DELETE' }
    );
    return res.ok || res.status === 204;
  } catch (err) {
    console.error('[Discord] Scheduled Event Löschen-Fehler:', err);
    return false;
  }
}

// #endregion
