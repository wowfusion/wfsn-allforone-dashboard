/**
 * Discord Bot Integration – erstellt und aktualisiert Discord Scheduled Events.
 * Kein Channel-Post, nur native Guild-Events über die Discord API.
 * Benötigt: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
 */

import type { Event, Signup, User } from '../generated/prisma';

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
function buildScheduledEventBody(event: EventWithDetails, isLocked = false) {
  const statusSuffix = isLocked ? ' 🔒' : '';

  const channelId =
    event.type === 'RAID'
      ? process.env.DISCORD_VOICE_CHANNEL_RAID
      : process.env.DISCORD_VOICE_CHANNEL_EVENT;

  // Slot-Infos aufbauen
  const slots = event.roleSlots as { tank?: number; healer?: number; dps?: number } | null;
  const slotLines: string[] = [];

  if (slots && (slots.tank || slots.healer || slots.dps)) {
    if (slots.tank) slotLines.push(`🛡️ Tank: ${slots.tank}`);
    if (slots.healer) slotLines.push(`💚 Heiler: ${slots.healer}`);
    if (slots.dps) slotLines.push(`⚔️ DPS: ${slots.dps}`);
  } else if (event.maxSlots) {
    slotLines.push(`� Slots: ${event.maxSlots}`);
  }

  const description = [
    event.description ?? '',
    slotLines.length > 0 ? '' : null,
    ...slotLines,
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

  // Cover-Bild übergeben wenn vorhanden (Discord erwartet Base64-Data-URI)
  if (event.coverImage) {
    body.image = event.coverImage;
  }

  return body;
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
    const body = buildScheduledEventBody(event);
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
    const body: Record<string, unknown> = buildScheduledEventBody(event, isLocked);

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
