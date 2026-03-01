/**
 * Battle.net API Client
 * Server-seitige Funktionen für Token-Abruf, Guild Roster und Professions.
 */

import type {
  BnetTokenResponse,
  BnetRosterResponse,
  BnetRosterMember,
  BnetProfessionsResponse,
  BnetCharacterProfile,
  BnetMythicKeystoneProfile,
  BnetRaidEncountersResponse,
  BnetGuildAchievementsResponse,
  BnetGuildActivityResponse,
  BnetEquipmentResponse,
  BnetCharacterMedia,
  BnetCharacterAchievementsResponse,
  CharacterAchievementData,
  GuildData,
  GuildMemberData,
  ProfessionData,
  RecipeData,
  MythicRunData,
  RaidProgressData,
  RaidEncounterData,
  GuildStats,
  ProfessionCount,
  ClassCount,
  GuildRaidSummary,
  ActivityItem,
  CharacterDetailData,
  EquipmentSlotData,
} from './types';
import { WOW_CLASSES, CURRENT_TIER_PREFIX } from './types';

// #region Konfiguration
const REGION = process.env.BATTLENET_REGION || 'eu';
const LOCALE = process.env.BATTLENET_LOCALE || 'de_DE';
const CLIENT_ID = process.env.BATTLENET_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BATTLENET_CLIENT_SECRET || '';
const REALM_SLUG = process.env.GUILD_REALM_SLUG || '';
const GUILD_SLUG = process.env.GUILD_NAME_SLUG || '';

const API_BASE = `https://${REGION}.api.blizzard.com`;
const TOKEN_URL = 'https://oauth.battle.net/token';
// #endregion

// #region Token Cache
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** Holt oder cached einen Client Credentials Token. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    throw new Error(`Token-Request fehlgeschlagen: ${res.status}`);
  }

  const data: BnetTokenResponse = await res.json();
  cachedToken = data.access_token;
  // 5 Minuten Puffer vor Ablauf
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

  return cachedToken;
}
// #endregion

// #region API Helpers
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest<T>(url: string, token: string, retries = 2): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (res.status === 404) return null;

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
    await sleep(retryAfter * 1000);
    return apiRequest<T>(url, token, retries - 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.substring(0, 200)}`);
  }

  return res.json();
}
// #endregion

// #region Guild Roster
async function fetchGuildRoster(token: string): Promise<BnetRosterResponse> {
  const url = `${API_BASE}/data/wow/guild/${encodeURIComponent(REALM_SLUG)}/${encodeURIComponent(GUILD_SLUG)}/roster?namespace=profile-${REGION}&locale=${LOCALE}`;
  const data = await apiRequest<BnetRosterResponse>(url, token);
  if (!data) throw new Error('Guild Roster nicht gefunden');
  return data;
}

/**
 * Öffentlicher Wrapper: holt einen Token und gibt den Roster zurück.
 * Wird vom Sync-API-Endpunkt genutzt.
 */
export async function fetchGuildRosterPublic(
  _guildName: string,
  _realmSlug: string
): Promise<BnetRosterResponse> {
  const token = await getAccessToken();
  return fetchGuildRoster(token);
}
// #endregion

// #region Guild Achievements
async function fetchGuildAchievements(token: string): Promise<number> {
  const url = `${API_BASE}/data/wow/guild/${encodeURIComponent(REALM_SLUG)}/${encodeURIComponent(GUILD_SLUG)}/achievements?namespace=profile-${REGION}&locale=${LOCALE}`;
  const data = await apiRequest<BnetGuildAchievementsResponse>(url, token);
  return data?.total_points ?? 0;
}
// #endregion

// #region Guild Activity Feed
async function fetchGuildActivity(token: string): Promise<ActivityItem[]> {
  const url = `${API_BASE}/data/wow/guild/${encodeURIComponent(REALM_SLUG)}/${encodeURIComponent(GUILD_SLUG)}/activity?namespace=profile-${REGION}&locale=${LOCALE}`;
  const data = await apiRequest<BnetGuildActivityResponse>(url, token);
  if (!data?.activities?.length) return [];

  return data.activities.slice(0, 30).map((a) => {
    if (a.character_achievement) {
      return {
        type: 'achievement' as const,
        characterName: a.character_achievement.character.name,
        description: a.character_achievement.achievement.name,
        timestamp: new Date(a.timestamp).toISOString(),
      };
    }
    if (a.encounter_completed) {
      return {
        type: 'encounter' as const,
        characterName: '',
        description: `${a.encounter_completed.encounter.name} (${a.encounter_completed.mode.name})`,
        timestamp: new Date(a.timestamp).toISOString(),
      };
    }
    return {
      type: 'unknown' as const,
      characterName: '',
      description: a.activity?.type || 'Unbekannt',
      timestamp: new Date(a.timestamp).toISOString(),
    };
  }).filter((a) => a.type !== 'unknown');
}
// #endregion

// #region Character Professions
async function fetchCharProfessions(
  token: string,
  realmSlug: string,
  charName: string,
): Promise<ProfessionData[] | null> {
  const url = `${API_BASE}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(charName.toLowerCase())}/professions?namespace=profile-${REGION}&locale=${LOCALE}`;

  const data = await apiRequest<BnetProfessionsResponse>(url, token);
  if (!data) return null;

  const professions: ProfessionData[] = [];

  const processProfs = (profs: BnetProfessionsResponse['primaries'], type: 'primary' | 'secondary') => {
    for (const prof of profs || []) {
      const currentTier = prof.tiers?.find((t) => t.tier?.name?.startsWith(CURRENT_TIER_PREFIX));
      if (!currentTier) continue;

      const recipes: RecipeData[] = (currentTier.known_recipes || []).map((r) => ({
        name: r.name,
        id: r.id,
      }));

      professions.push({
        name: prof.profession.name,
        id: prof.profession.id,
        type,
        skill: currentTier.skill_points,
        maxSkill: currentTier.max_skill_points,
        knownRecipes: recipes,
      });
    }
  };

  processProfs(data.primaries, 'primary');
  processProfs(data.secondaries, 'secondary');

  return professions;
}
// #endregion

// #region Character Profile
async function fetchCharProfile(
  token: string,
  realmSlug: string,
  charName: string,
): Promise<BnetCharacterProfile | null> {
  const url = `${API_BASE}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(charName.toLowerCase())}?namespace=profile-${REGION}&locale=${LOCALE}`;
  return apiRequest<BnetCharacterProfile>(url, token);
}

/**
 * Öffentlicher Wrapper: Holt das Character-Profile (equipped_item_level, active_spec, etc.)
 */
export async function fetchCharacterProfile(
  realmSlug: string,
  charName: string,
): Promise<BnetCharacterProfile | null> {
  const token = await getAccessToken();
  return fetchCharProfile(token, realmSlug, charName);
}
// #endregion

// #region Mythic+ Keystone Profile
/** Cached aktuelle M+ Season ID */
let cachedSeasonId: number | null = null;

async function getCurrentMythicSeasonId(token: string): Promise<number> {
  if (cachedSeasonId) return cachedSeasonId;

  const url = `${API_BASE}/data/wow/mythic-keystone/season/index?namespace=dynamic-${REGION}&locale=${LOCALE}`;
  const data = await apiRequest<{ seasons: { id: number }[]; current_season?: { id: number } }>(url, token);
  if (!data?.seasons?.length) throw new Error('Keine M+ Seasons gefunden');

  cachedSeasonId = data.current_season?.id ?? data.seasons[data.seasons.length - 1].id;
  return cachedSeasonId;
}

async function fetchCharMythicProfile(
  token: string,
  realmSlug: string,
  charName: string,
  seasonId: number,
): Promise<BnetMythicKeystoneProfile | null> {
  const url = `${API_BASE}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(charName.toLowerCase())}/mythic-keystone-profile/season/${seasonId}?namespace=profile-${REGION}&locale=${LOCALE}`;
  return apiRequest<BnetMythicKeystoneProfile>(url, token);
}
// #endregion

// #region Raid Encounters
/**
 * Ermittelt den aktuellsten Raid dynamisch:
 * Letzte Expansion → Letzter Raid in der Liste.
 * Extrahiert Encounter-Details (Bosse, Kills, Timestamps).
 */
async function fetchCharRaids(
  token: string,
  realmSlug: string,
  charName: string,
): Promise<RaidProgressData | null> {
  const url = `${API_BASE}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(charName.toLowerCase())}/encounters/raids?namespace=profile-${REGION}&locale=${LOCALE}`;
  const data = await apiRequest<BnetRaidEncountersResponse>(url, token);
  if (!data?.expansions?.length) return null;

  // Letzte Expansion = aktuellste
  const lastExp = data.expansions[data.expansions.length - 1];
  if (!lastExp.instances?.length) return null;

  // Letzter Raid in der letzten Expansion = aktuellster Raid
  const latestRaid = lastExp.instances[lastExp.instances.length - 1];

  const getProgress = (diffType: string): string => {
    const mode = latestRaid.modes?.find((m) => m.difficulty.type === diffType);
    if (!mode) return '0/0';
    return `${mode.progress.completed_count}/${mode.progress.total_count}`;
  };

  // Encounter-Details sammeln (alle Bosse mit Kills pro Schwierigkeit)
  const encounterMap = new Map<number, RaidEncounterData>();

  // Total count vom ersten verfügbaren Mode für die Boss-Anzahl
  const anyMode = latestRaid.modes?.[0];
  if (anyMode?.progress?.encounters) {
    for (const enc of anyMode.progress.encounters) {
      encounterMap.set(enc.encounter.id, {
        name: enc.encounter.name,
        id: enc.encounter.id,
        normalKills: 0,
        heroicKills: 0,
        mythicKills: 0,
        lastKill: null,
      });
    }
  }

  // Kills pro Schwierigkeit eintragen
  for (const mode of latestRaid.modes || []) {
    for (const enc of mode.progress?.encounters || []) {
      let entry = encounterMap.get(enc.encounter.id);
      if (!entry) {
        entry = { name: enc.encounter.name, id: enc.encounter.id, normalKills: 0, heroicKills: 0, mythicKills: 0, lastKill: null };
        encounterMap.set(enc.encounter.id, entry);
      }

      switch (mode.difficulty.type) {
        case 'NORMAL': entry.normalKills = enc.completed_count; break;
        case 'HEROIC': entry.heroicKills = enc.completed_count; break;
        case 'MYTHIC': entry.mythicKills = enc.completed_count; break;
      }

      if (enc.last_kill_timestamp) {
        const killDate = new Date(enc.last_kill_timestamp).toISOString();
        if (!entry.lastKill || killDate > entry.lastKill) {
          entry.lastKill = killDate;
        }
      }
    }
  }

  return {
    raidName: latestRaid.instance.name,
    raidId: latestRaid.instance.id,
    normal: getProgress('NORMAL'),
    heroic: getProgress('HEROIC'),
    mythic: getProgress('MYTHIC'),
    encounters: [...encounterMap.values()],
  };
}
// #endregion

// #region Batch Fetch (alle Endpoints parallel pro Charakter)
interface MemberFetchResult {
  professions: ProfessionData[] | null;
  profile: BnetCharacterProfile | null;
  mythic: BnetMythicKeystoneProfile | null;
  raidProgress: RaidProgressData | null;
  error?: string;
}

/** Minimales Level ab dem wir überhaupt API-Calls machen */
const MIN_FETCH_LEVEL = 10;
/** Level ab dem Profile-Daten geholt werden */
const MIN_PROFILE_LEVEL = 10;
/** Level ab dem M+ und Raids geholt werden (Max-Level) */
const MAX_LEVEL = 80;

async function fetchAllMemberData(
  token: string,
  members: BnetRosterMember[],
  concurrency = 20,
): Promise<Map<string, MemberFetchResult>> {
  const results = new Map<string, MemberFetchResult>();

  // M+ Season vorab ermitteln (1 einziger API Call)
  const seasonId = await getCurrentMythicSeasonId(token);

  for (let i = 0; i < members.length; i += concurrency) {
    const batch = members.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (m) => {
        const key = `${m.character.name}-${m.character.realm.slug}`;
        const realm = m.character.realm.slug;
        const name = m.character.name;
        const level = m.character.level;

        // Unter MIN_FETCH_LEVEL komplett skippen
        if (level < MIN_FETCH_LEVEL) {
          results.set(key, { professions: null, profile: null, mythic: null, raidProgress: null });
          return;
        }

        try {
          const promises: [
            Promise<ProfessionData[] | null>,
            Promise<BnetCharacterProfile | null>,
            Promise<BnetMythicKeystoneProfile | null>,
            Promise<RaidProgressData | null>,
          ] = [
            fetchCharProfessions(token, realm, name),
            level >= MIN_PROFILE_LEVEL ? fetchCharProfile(token, realm, name) : Promise.resolve(null),
            level >= MAX_LEVEL ? fetchCharMythicProfile(token, realm, name, seasonId) : Promise.resolve(null),
            level >= MAX_LEVEL ? fetchCharRaids(token, realm, name) : Promise.resolve(null),
          ];

          const [profs, profile, mythic, raids] = await Promise.all(promises);

          results.set(key, { professions: profs, profile, mythic, raidProgress: raids });
        } catch (err) {
          results.set(key, {
            professions: null, profile: null, mythic: null, raidProgress: null,
            error: (err as Error).message,
          });
        }
      }),
    );

    // Blizzard Rate-Limit: ~100 req/sec, bei 20 concurrency × 4 calls = 80 pro Batch
    if (i + concurrency < members.length) await sleep(50);
  }

  return results;
}
// #endregion

// #region Helpers: M+ Farbe
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
// #endregion

// #region Stats berechnen
function computeStats(members: GuildMemberData[], rosterMaxLevel = 90): GuildStats {
  const profMap = new Map<string, { count: number; totalSkill: number; maxed: number; maxSkill: number }>();
  const classMap = new Map<number, number>();

  let withProfs = 0;
  let withoutData = 0;
  let maxLevel = 0;
  let totalIlvl = 0;
  let ilvlCount = 0;
  let highestIlvl = 0;
  let totalMythicRating = 0;
  let mythicCount = 0;
  let highestMythic = 0;
  let activeCount = 0;

  // Raid-Aggregation: zuerst den häufigsten aktuellen Raid ermitteln
  const raidNameCounts = new Map<string, number>();
  for (const m of members) {
    if (m.raidProgress) {
      raidNameCounts.set(m.raidProgress.raidName, (raidNameCounts.get(m.raidProgress.raidName) || 0) + 1);
    }
  }
  // Der aktuellste Raid ist der mit den meisten Spielern
  const currentRaidName = raidNameCounts.size > 0
    ? [...raidNameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : '';

  let totalBosses = 0;
  let normalRaiders = 0;
  let heroicRaiders = 0;
  let mythicRaiders = 0;
  let normalCleared = 0;
  let heroicCleared = 0;
  let mythicCleared = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const m of members) {
    // Berufe
    if (m.professions && m.professions.length > 0) {
      withProfs++;
      for (const p of m.professions) {
        if (p.type !== 'primary') continue;
        const entry = profMap.get(p.name) || { count: 0, totalSkill: 0, maxed: 0, maxSkill: p.maxSkill };
        entry.count++;
        entry.totalSkill += p.skill;
        if (p.skill >= p.maxSkill) entry.maxed++;
        profMap.set(p.name, entry);
      }
    } else {
      withoutData++;
    }

    // Klassen-Verteilung
    classMap.set(m.classId, (classMap.get(m.classId) || 0) + 1);

    if (m.level >= rosterMaxLevel) maxLevel++;

    // Item Level (nur Max-Level einbeziehen, damit Low-Level-Chars den Schnitt nicht verfälschen)
    if (m.equippedItemLevel && m.level >= rosterMaxLevel) {
      totalIlvl += m.equippedItemLevel;
      ilvlCount++;
      if (m.equippedItemLevel > highestIlvl) highestIlvl = m.equippedItemLevel;
    }

    // M+ Rating
    if (m.mythicRating && m.mythicRating > 0) {
      totalMythicRating += m.mythicRating;
      mythicCount++;
      if (m.mythicRating > highestMythic) highestMythic = m.mythicRating;
    }

    // Aktiv (7 Tage)
    if (m.lastLogin && new Date(m.lastLogin).getTime() > sevenDaysAgo) {
      activeCount++;
    }

    // Raid Progress aggregieren (nur für den aktuellsten Raid, nicht alte Raids)
    if (m.raidProgress && m.raidProgress.raidName === currentRaidName) {
      // totalBosses aus dem höchsten Nenner aller Schwierigkeiten bestimmen
      const nTotal = parseInt(m.raidProgress.normal.split('/')[1]) || 0;
      const hTotal = parseInt(m.raidProgress.heroic.split('/')[1]) || 0;
      const mTotal = parseInt(m.raidProgress.mythic.split('/')[1]) || 0;
      const maxTotal = Math.max(nTotal, hTotal, mTotal);
      if (maxTotal > totalBosses) totalBosses = maxTotal;

      const nKills = parseInt(m.raidProgress.normal.split('/')[0]) || 0;
      const hKills = parseInt(m.raidProgress.heroic.split('/')[0]) || 0;
      const mKills = parseInt(m.raidProgress.mythic.split('/')[0]) || 0;
      if (nKills > 0) normalRaiders++;
      if (hKills > 0) heroicRaiders++;
      if (mKills > 0) mythicRaiders++;
      if (nKills >= totalBosses && totalBosses > 0) normalCleared++;
      if (hKills >= totalBosses && totalBosses > 0) heroicCleared++;
      if (mKills >= totalBosses && totalBosses > 0) mythicCleared++;
    }
  }

  const professionDistribution: ProfessionCount[] = [...profMap.entries()]
    .map(([name, d]) => ({
      name,
      count: d.count,
      avgSkill: Math.round(d.totalSkill / d.count),
      maxedCount: d.maxed,
    }))
    .sort((a, b) => b.count - a.count);

  const classDistribution: ClassCount[] = [...classMap.entries()]
    .map(([classId, count]) => {
      const info = WOW_CLASSES[classId] || { name: 'Unbekannt', color: '#888' };
      return { classId, className: info.name, color: info.color, count };
    })
    .sort((a, b) => b.count - a.count);

  const raidSummary: GuildRaidSummary | null = currentRaidName
    ? { raidName: currentRaidName, totalBosses, normalRaiders, heroicRaiders, mythicRaiders, normalCleared, heroicCleared, mythicCleared }
    : null;

  return {
    totalMembers: members.length,
    activeMembersCount: activeCount,
    membersWithProfessions: withProfs,
    membersWithoutData: withoutData,
    professionDistribution,
    classDistribution,
    maxLevelCount: maxLevel,
    avgItemLevel: ilvlCount > 0 ? Math.round(totalIlvl / ilvlCount) : 0,
    highestItemLevel: highestIlvl,
    avgMythicRating: mythicCount > 0 ? Math.round(totalMythicRating / mythicCount) : 0,
    highestMythicRating: highestMythic,
    membersWithMythicRating: mythicCount,
    raidSummary,
  };
}
// #endregion

// #region Main Export
/**
 * Hauptfunktion: Ruft alle Gildendaten inkl. Berufe ab.
 * Wird von der API Route aufgerufen.
 */
export async function fetchGuildData(rosterMaxLevel = 90): Promise<GuildData> {
  const token = await getAccessToken();

  // Raider.io Import (dynamisch, da optional)
  const { fetchRioGuildProfile } = await import('./raiderio');

  // 1. Roster + Guild-Level Daten + Raider.io parallel abrufen
  const [roster, guildAchievementPoints, recentActivity, rioGuild] = await Promise.all([
    fetchGuildRoster(token),
    fetchGuildAchievements(token),
    fetchGuildActivity(token),
    fetchRioGuildProfile('All for One').catch(() => null),
  ]);
  const rosterMembers = roster.members || [];

  // 2. Alle Daten parallel abrufen (Professions + Profile + M+ + Raids)
  const memberResults = await fetchAllMemberData(token, rosterMembers);

  // 3. Daten zusammenführen
  const members: GuildMemberData[] = rosterMembers.map((m) => {
    const key = `${m.character.name}-${m.character.realm.slug}`;
    const result = memberResults.get(key);
    const classInfo = WOW_CLASSES[m.character.playable_class?.id] || { name: 'Unbekannt', color: '#888' };

    // M+ Rating + Farbe (Season-Endpoint: mythic_rating, Base-Endpoint: current_mythic_rating)
    const mpData = result?.mythic?.mythic_rating ?? result?.mythic?.current_mythic_rating ?? null;
    const mythicRating = mpData?.rating ?? null;
    const mythicColor = mpData?.color;
    const mythicRatingColor = mythicColor
      ? rgbToHex(mythicColor.r, mythicColor.g, mythicColor.b)
      : null;

    // Beste M+ Runs
    const mythicBestRuns: MythicRunData[] | null = result?.mythic?.best_runs
      ? result.mythic.best_runs
          .map((run) => ({
            dungeon: run.dungeon.name,
            level: run.keystone_level,
            inTime: run.is_completed_within_time,
            rating: Math.round(run.mythic_rating?.rating ?? 0),
          }))
          .sort((a, b) => b.rating - a.rating)
      : null;

    // Last Login formatieren
    const lastLoginTs = result?.profile?.last_login_timestamp;
    const lastLogin = lastLoginTs ? new Date(lastLoginTs).toISOString() : null;

    return {
      name: m.character.name,
      realm: m.character.realm?.name || m.character.realm?.slug || '?',
      realmSlug: m.character.realm?.slug || '',
      level: m.character.level,
      classId: m.character.playable_class?.id,
      className: classInfo.name,
      raceId: m.character.playable_race?.id,
      rank: m.rank,
      faction: m.character.faction?.type || roster.guild.faction?.type || 'UNKNOWN',
      professions: result?.professions || null,
      activeSpec: result?.profile?.active_spec?.name ?? null,
      averageItemLevel: result?.profile?.average_item_level ?? null,
      equippedItemLevel: result?.profile?.equipped_item_level ?? null,
      achievementPoints: result?.profile?.achievement_points ?? null,
      lastLogin,
      mythicRating: mythicRating ? Math.round(mythicRating) : null,
      mythicRatingColor,
      mythicBestRuns: mythicBestRuns,
      raidProgress: result?.raidProgress ?? null,
      error: result?.error,
    };
  });

  // Nach Level desc, dann Name asc sortieren
  members.sort((a, b) => {
    const lvl = b.level - a.level;
    if (lvl !== 0) return lvl;
    return a.name.localeCompare(b.name, 'de');
  });

  const stats = computeStats(members, rosterMaxLevel);

  return {
    guildName: roster.guild.name,
    realmName: roster.guild.realm.name,
    faction: roster.guild.faction?.type || 'UNKNOWN',
    memberCount: rosterMembers.length,
    fetchedAt: new Date().toISOString(),
    members,
    stats,
    guildAchievementPoints,
    recentActivity,
    rioProfileUrl: rioGuild?.profileUrl || null,
    rioRaidProgression: rioGuild?.raidProgression
      ? Object.fromEntries(
          Object.entries(rioGuild.raidProgression).map(([k, v]) => [k, {
            summary: v.summary,
            totalBosses: v.totalBosses,
            normalBossesKilled: v.normalBossesKilled,
            heroicBossesKilled: v.heroicBossesKilled,
            mythicBossesKilled: v.mythicBossesKilled,
          }]),
        )
      : null,
    rioRaidRankings: rioGuild?.raidRankings
      ? Object.fromEntries(
          Object.entries(rioGuild.raidRankings).map(([k, v]) => [k, {
            normal: v.normal,
            heroic: v.heroic,
            mythic: v.mythic,
          }]),
        )
      : null,
  };
}
// #endregion

// #region On-Demand: Character Detail (Equipment + Media)
/**
 * Wird pro Charakter on-demand aufgerufen (nicht beim initialen Laden).
 * Liefert Equipment-Items + Render-URL für den Detail-Dialog.
 */
export async function fetchCharacterDetail(
  realmSlug: string,
  charName: string,
): Promise<CharacterDetailData> {
  const token = await getAccessToken();
  const base = `${API_BASE}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(charName.toLowerCase())}`;

  const [equipment, media, achievementsRes] = await Promise.all([
    apiRequest<BnetEquipmentResponse>(`${base}/equipment?namespace=profile-${REGION}&locale=${LOCALE}`, token),
    apiRequest<BnetCharacterMedia>(`${base}/character-media?namespace=profile-${REGION}&locale=${LOCALE}`, token),
    apiRequest<BnetCharacterAchievementsResponse>(`${base}/achievements?namespace=profile-${REGION}&locale=${LOCALE}`, token),
  ]);

  // Render + Avatar + Inset URLs extrahieren
  const renderUrl = media?.assets?.find((a) => a.key === 'main')?.value
    || media?.assets?.find((a) => a.key === 'main-raw')?.value
    || null;
  const avatarUrl = media?.assets?.find((a) => a.key === 'avatar')?.value || null;
  const insetUrl = media?.assets?.find((a) => a.key === 'inset')?.value || null;

  // Equipment Items mappen (inkl. IDs für Wowhead Tooltips)
  const items: EquipmentSlotData[] = (equipment?.equipped_items || []).map((item) => ({
    slot: item.slot.type,
    slotName: item.slot.name,
    itemId: item.item.id,
    name: item.name,
    quality: item.quality.type,
    itemLevel: item.level.value,
    enchantments: item.enchantments?.map((e) => e.display_string) || [],
    enchantmentIds: item.enchantments?.map((e) => e.enchantment_id) || [],
    gems: item.sockets?.filter((s) => s.item).map((s) => s.item!.name) || [],
    gemIds: item.sockets?.filter((s) => s.item).map((s) => s.item!.id) || [],
    setName: item.set?.item_set?.name || null,
    setItemIds: item.set?.items?.map((si) => si.item.id) || [],
    bonusIds: item.bonus_list || [],
    stats: item.stats?.map((s) => ({ name: s.type.name, value: s.value })) || [],
  }));

  // Achievements mappen und nach Datum sortieren (neueste zuerst)
  const achievements: CharacterAchievementData[] = (achievementsRes?.achievements || [])
    .filter((a) => a.completed_timestamp)
    .map((a) => ({
      id: a.achievement.id,
      name: a.achievement.name,
      completedAt: a.completed_timestamp ? new Date(a.completed_timestamp).toISOString() : null,
    }))
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  return {
    name: charName,
    realm: realmSlug,
    renderUrl,
    avatarUrl,
    insetUrl,
    equipment: items,
    achievements,
  };
}
// #endregion

// #region Dungeon Media (Journal Instance Tile Images)
/** Cache: Journal Instance Name (lowercase) → Instance ID */
let journalInstanceMap: Map<string, number> | null = null;
/** Cache: Instance ID → Tile Image URL */
const dungeonTileCache = new Map<number, string>();

/**
 * Lädt den Journal Instance Index und baut ein Name→ID Mapping.
 * Wird permanent gecacht (ändert sich nur bei Patches).
 */
async function getJournalInstanceMap(token: string): Promise<Map<string, number>> {
  if (journalInstanceMap) return journalInstanceMap;

  const url = `${API_BASE}/data/wow/journal-instance/index?namespace=static-${REGION}&locale=${LOCALE}`;
  const data = await apiRequest<{ instances?: { name: string; id: number }[] }>(url, token);

  journalInstanceMap = new Map();
  for (const inst of data?.instances || []) {
    if (inst.name && inst.id) {
      journalInstanceMap.set(inst.name.toLowerCase(), inst.id);
    }
  }
  return journalInstanceMap;
}

/**
 * Lädt das Tile-Bild für eine Journal Instance.
 * Wird permanent gecacht.
 */
async function getDungeonTileUrl(instanceId: number, token: string): Promise<string | null> {
  if (dungeonTileCache.has(instanceId)) return dungeonTileCache.get(instanceId)!;

  try {
    const url = `${API_BASE}/data/wow/media/journal-instance/${instanceId}?namespace=static-${REGION}`;
    const data = await apiRequest<{ assets?: { key: string; value: string }[] }>(url, token);
    const tile = data?.assets?.find((a) => a.key === 'tile')?.value || null;
    if (tile) dungeonTileCache.set(instanceId, tile);
    return tile;
  } catch {
    return null;
  }
}

/**
 * Sucht Dungeon-Tile-Bilder für eine Liste von Dungeon-Namen (z.B. aus Raider.io Runs).
 * Matcht Dungeon-Namen fuzzy gegen den Journal Instance Index.
 * Gibt ein Mapping von Dungeon-Name → Tile-Image-URL zurück.
 */
export async function fetchDungeonMedia(dungeonNames: string[]): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const instanceMap = await getJournalInstanceMap(token);

  const result: Record<string, string> = {};
  const uniqueNames = [...new Set(dungeonNames)];

  await Promise.all(
    uniqueNames.map(async (name) => {
      const lower = name.toLowerCase();

      // Exakte Übereinstimmung
      let instanceId = instanceMap.get(lower);

      // Fuzzy: Instance-Name enthält den Dungeon-Namen oder umgekehrt
      if (!instanceId) {
        for (const [instName, id] of instanceMap) {
          if (instName.includes(lower) || lower.includes(instName)) {
            instanceId = id;
            break;
          }
        }
      }

      if (instanceId) {
        const tile = await getDungeonTileUrl(instanceId, token);
        if (tile) result[name] = tile;
      }
    }),
  );

  return result;
}
// #endregion
