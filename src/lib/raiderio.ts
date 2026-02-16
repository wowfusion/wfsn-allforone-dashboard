/**
 * Raider.io API Integration
 * Kostenlose API ohne API-Key für Guild- und Character-Daten.
 * Liefert M+ Rankings und Raid-Progression aus Raider.io Perspektive.
 */


const RIO_BASE = 'https://raider.io/api/v1';
const REGION = 'eu';
const REALM = 'festung-der-stürme';

// #region Types
export interface RioGuildProfile {
  name: string;
  realm: string;
  profileUrl: string;
  raidProgression: Record<string, RioRaidProgression> | null;
  raidRankings: Record<string, RioRaidRanking> | null;
}

export interface RioRaidProgression {
  summary: string;
  totalBosses: number;
  normalBossesKilled: number;
  heroicBossesKilled: number;
  mythicBossesKilled: number;
}

export interface RioRaidRanking {
  normal: RioRankEntry;
  heroic: RioRankEntry;
  mythic: RioRankEntry;
}

export interface RioRankEntry {
  world: number;
  region: number;
  realm: number;
}

export interface RioCharacterProfile {
  name: string;
  realm: string;
  profileUrl: string;
  mythicPlusScores: { all: number; dps: number; healer: number; tank: number } | null;
  mythicPlusBestRuns: RioMythicRun[];
  mythicPlusRecentRuns: RioMythicRun[];
}

export interface RioMythicRun {
  dungeon: string;
  shortName: string;
  mythicLevel: number;
  completedAt: string;
  clearTimeMs: number;
  parTimeMs: number;
  numKeystoneUpgrades: number;
  score: number;
  affixes: { id: number; name: string; description: string }[];
  url: string;
}
// #endregion

// #region Guild Profile
/**
 * Holt das Gildenprofil von Raider.io mit Raid-Progression und Rankings.
 */
export async function fetchRioGuildProfile(guildName: string): Promise<RioGuildProfile | null> {
  try {
    const fields = 'raid_progression,raid_rankings';
    const url = `${RIO_BASE}/guilds/profile?region=${REGION}&realm=${encodeURIComponent(REALM)}&name=${encodeURIComponent(guildName)}&fields=${fields}`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      console.warn(`[Raider.io] Guild Profile Fehler: ${res.status}`);
      return null;
    }

    const data = await res.json();

    return {
      name: data.name,
      realm: data.realm,
      profileUrl: data.profile_url || '',
      raidProgression: data.raid_progression
        ? Object.fromEntries(
            Object.entries(data.raid_progression).map(([key, val]: [string, unknown]) => {
              const v = val as Record<string, unknown>;
              return [key, {
                summary: (v.summary as string) || '',
                totalBosses: (v.total_bosses as number) || 0,
                normalBossesKilled: (v.normal_bosses_killed as number) || 0,
                heroicBossesKilled: (v.heroic_bosses_killed as number) || 0,
                mythicBossesKilled: (v.mythic_bosses_killed as number) || 0,
              }];
            }),
          )
        : null,
      raidRankings: data.raid_rankings
        ? Object.fromEntries(
            Object.entries(data.raid_rankings).map(([key, val]: [string, unknown]) => {
              const v = val as Record<string, Record<string, unknown>>;
              const mapRank = (r: Record<string, unknown>) => ({
                world: (r.world as number) || 0,
                region: (r.region as number) || 0,
                realm: (r.realm as number) || 0,
              });
              return [key, {
                normal: mapRank(v.normal || {}),
                heroic: mapRank(v.heroic || {}),
                mythic: mapRank(v.mythic || {}),
              }];
            }),
          )
        : null,
    };
  } catch (err) {
    console.error('[Raider.io] Guild Profile Fehler:', err);
    return null;
  }
}
// #endregion

// #region Character Profile
/**
 * Holt Raider.io Profil eines Charakters: M+ Score, beste und letzte Runs.
 */
export async function fetchRioCharacterProfile(charName: string, realmSlug?: string): Promise<RioCharacterProfile | null> {
  try {
    const realm = realmSlug || REALM;
    const fields = 'mythic_plus_scores_by_season:current,mythic_plus_best_runs:all,mythic_plus_recent_runs';
    const url = `${RIO_BASE}/characters/profile?region=${REGION}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(charName)}&fields=${fields}`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;

    const data = await res.json();

    const season = data.mythic_plus_scores_by_season?.[0];
    const scores = season?.scores || null;

    const mapRun = (r: Record<string, unknown>): RioMythicRun => ({
      dungeon: (r.dungeon as string) || '',
      shortName: (r.short_name as string) || '',
      mythicLevel: (r.mythic_level as number) || 0,
      completedAt: (r.completed_at as string) || '',
      clearTimeMs: (r.clear_time_ms as number) || 0,
      parTimeMs: (r.par_time_ms as number) || 0,
      numKeystoneUpgrades: (r.num_keystone_upgrades as number) || 0,
      score: (r.score as number) || 0,
      affixes: ((r.affixes as Record<string, unknown>[]) || []).map((a) => ({
        id: (a.id as number) || 0,
        name: (a.name as string) || '',
        description: (a.description as string) || '',
      })),
      url: (r.url as string) || '',
    });

    return {
      name: data.name,
      realm: data.realm,
      profileUrl: data.profile_url || '',
      mythicPlusScores: scores ? {
        all: scores.all || 0,
        dps: scores.dps || 0,
        healer: scores.healer || 0,
        tank: scores.tank || 0,
      } : null,
      mythicPlusBestRuns: (data.mythic_plus_best_runs || []).map(mapRun),
      mythicPlusRecentRuns: (data.mythic_plus_recent_runs || []).map(mapRun),
    };
  } catch (err) {
    console.error(`[Raider.io] Character Profile Fehler (${charName}):`, err);
    return null;
  }
}
// #endregion
