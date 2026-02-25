/**
 * Role-Based Access Control (RBAC) – zentrale Rollendefinitionen.
 * Discord-Rollen-IDs werden aus .env.local gelesen und auf App-Rollen gemappt.
 */

// #region App-Rollen

/**
 * Definierte App-Rollen (hierarchisch):
 * - MEMBER:  Alle Gildenmitglieder – können sich anmelden und Events sehen
 * - OFFICER: Projektleitung/Offizier – können Events erstellen, sperren, Auswertungen sehen
 * - ADMIN:   Vollzugriff inkl. Konfiguration
 */
export type AppRole = 'MEMBER' | 'OFFICER' | 'ADMIN';

/** Rollengewichtung für Vergleiche */
const ROLE_WEIGHT: Record<AppRole, number> = {
  MEMBER: 1,
  OFFICER: 2,
  ADMIN: 3,
};

// #endregion

// #region Mapping Discord → App-Rollen

/**
 * Mappt Discord-Rollen-IDs auf App-Rollen.
 * Konfiguration erfolgt über Umgebungsvariablen:
 *   DISCORD_ROLE_MEMBER, DISCORD_ROLE_OFFICER, DISCORD_ROLE_ADMIN
 * Mehrere IDs pro Rolle werden kommagetrennt angegeben.
 */
export function mapDiscordRolesToAppRoles(discordRoleIds: string[]): AppRole[] {
  const roleMap: Array<{ envKey: string; appRole: AppRole }> = [
    { envKey: 'DISCORD_ROLE_ADMIN', appRole: 'ADMIN' },
    { envKey: 'DISCORD_ROLE_OFFICER', appRole: 'OFFICER' },
    { envKey: 'DISCORD_ROLE_MEMBER', appRole: 'MEMBER' },
  ];

  const matched: AppRole[] = [];

  for (const { envKey, appRole } of roleMap) {
    const configuredIds = (process.env[envKey] ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (configuredIds.some((id) => discordRoleIds.includes(id))) {
      matched.push(appRole);
    }
  }

  return matched;
}

// #endregion

// #region Hilfsfunktionen

/** Prüft ob der User mindestens die gegebene Rolle hat */
export function hasRole(userRoles: AppRole[], required: AppRole): boolean {
  const maxWeight = Math.max(0, ...userRoles.map((r) => ROLE_WEIGHT[r]));
  return maxWeight >= ROLE_WEIGHT[required];
}

/** Gibt die höchste Rolle des Users zurück */
export function getHighestRole(userRoles: AppRole[]): AppRole | null {
  if (userRoles.length === 0) return null;
  return userRoles.reduce((highest, current) =>
    ROLE_WEIGHT[current] > ROLE_WEIGHT[highest] ? current : highest
  );
}

/** Alle Berechtigungsprüfungen zentral */
export const can = {
  viewEvents: (roles: AppRole[]) => hasRole(roles, 'MEMBER'),
  signupForEvent: (roles: AppRole[]) => hasRole(roles, 'MEMBER'),
  createEvent: (roles: AppRole[]) => hasRole(roles, 'OFFICER'),
  editEvent: (roles: AppRole[]) => hasRole(roles, 'OFFICER'),
  lockEvent: (roles: AppRole[]) => hasRole(roles, 'OFFICER'),
  viewStats: (roles: AppRole[]) => hasRole(roles, 'OFFICER'),
  syncGuild: (roles: AppRole[]) => hasRole(roles, 'OFFICER'),
  manageConfig: (roles: AppRole[]) => hasRole(roles, 'ADMIN'),
};

// #endregion
