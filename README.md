# All for One – Gildendashboard & Raidbuilder

Raid- und Event-Planungssystem für die WoW-Gilde **All for One** (Festung der Stürme – EU).
Login und Rollenverwaltung ausschließlich über den Gilden-Discord (OAuth2).

---

## Features

- **Discord OAuth2 Login** – nur Gildenmitglieder mit berechtigter Rolle erhalten Zugriff
- **RBAC** – Member / Planner / Officer / Admin (gesteuert über Discord-Rollen-IDs)
- **Raid/Event CRUD** – Erstellen, Bearbeiten, Veröffentlichen, Locking
- **Discord-Integration** – automatischer Post + Scheduled Event beim Publish; Update beim Lock
- **Signup-System** – GOING / MAYBE / DECLINED / WAITLIST pro Event
- **Short-Notice Drop Tracking** – DropHistory bei kurzfristigen Absagen nach Anmeldung
- **Locking + LockSnapshot** – unveränderlicher Snapshot beim Festschreiben
- **Guild-Roster-Sync** – Battle.net API, nur Max-Level 80 Charaktere
- **Admin/Officer Auswertung** – Aggregation der DropHistory, CSV-Export

---

## Erwartete Umgebungsvariablen (`.env.local`)

```env
# Datenbank
DATABASE_URL=postgresql://user:password@localhost:5432/raidbuilder

# NextAuth
AUTH_SECRET=                    # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Discord OAuth App
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Discord Bot (für Scheduled Events)
DISCORD_BOT_TOKEN=

# Discord Konfiguration
DISCORD_GUILD_ID=               # Server-ID der Gilde

# Discord Rollen-IDs (kommagetrennt für mehrere IDs pro Rolle)
DISCORD_ROLE_MEMBER=
DISCORD_ROLE_PLANNER=
DISCORD_ROLE_OFFICER=
DISCORD_ROLE_ADMIN=

# Battle.net API
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
BATTLENET_REGION=eu
BATTLENET_LOCALE=de_DE

# Gilden-Konfiguration (nur diese Gilde wird gefetcht)
GUILD_NAME=all-for-one
GUILD_NAME_SLUG=all-for-one
GUILD_REALM_SLUG=festung-der-stuerme

# Short-Notice Schwellenwert in Stunden (Standard: 24)
SHORT_NOTICE_HOURS=24
```

---

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Datenbank anlegen

```bash
# PostgreSQL-Datenbank erstellen, dann:
npx prisma migrate dev --name init
```

### 3. Prisma Client generieren

```bash
npx prisma generate
```

### 4. Dev-Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

---

## Architektur

```bash
src/
├── app/
│   ├── page.tsx                    # Landing Page (öffentlich)
│   ├── unauthorized/               # Fehlermeldung bei fehlendem Zugriff
│   ├── dashboard/                  # Geschützter Bereich (MEMBER+)
│   ├── events/                     # Event-Liste, Detail, Neu, Edit
│   ├── my-signups/                 # Eigene Anmeldungen
│   ├── admin/                      # Auswertungen + Roster (OFFICER+)
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth Handler
│       ├── events/                 # CRUD + Signups + Lock
│       ├── guild/sync/             # Battle.net Roster-Sync
│       └── admin/stats/            # DropHistory Aggregation
├── components/
│   ├── landing-page.tsx
│   ├── session-provider.tsx
│   ├── dashboard/                  # Nav, Overview
│   ├── events/                     # List, Detail, Form
│   ├── admin/                      # Stats, Roster
│   └── ui/                         # shadcn/ui Komponenten
└── lib/
    ├── auth.ts                     # NextAuth Konfiguration
    ├── prisma.ts                   # PrismaClient Singleton
    ├── rbac.ts                     # Rollendefinitionen + can.*
    ├── discord.ts                  # Discord Bot Integration
    ├── validations.ts              # Zod Schemas
    ├── date-utils.ts               # Datumsfunktionen
    └── blizzard.ts                 # Battle.net API Client
```

---

## Locking-Verhalten

1. Officer/Admin klickt „Jetzt sperren" oder `lockAt`-Zeitpunkt wird erreicht
2. `Event.status` → `LOCKED`
3. `LockSnapshot` wird mit finalem Teilnehmer-Stand erstellt (unveränderlich)
4. Discord-Post wird aktualisiert: „🔒 Festgeschrieben"
5. Keine weiteren Signup-Änderungen möglich

---

## Short-Notice Drop

Eine Abmeldung gilt als **kurzfristig**, wenn:
- Die Abmeldung **nach dem `lockAt`-Zeitpunkt** erfolgt, ODER
- Die Abmeldung innerhalb von **`SHORT_NOTICE_HOURS` Stunden** vor Eventbeginn erfolgt (Standard: 24h)

---

## Assumptions

- **Eine Gilde**: Die App ist hart auf die in `.env.local` konfigurierte Gilde beschränkt. Alle Battle.net-Abrufe verwenden `GUILD_NAME_SLUG` und `GUILD_REALM_SLUG`.
- **Max-Level = 80**: Nur Charaktere mit Level ≥ 80 werden gespeichert und im Roster angezeigt.
- **Discord-Sync ist nicht-kritisch**: Wenn der Discord-Post fehlschlägt, wird das Event trotzdem gespeichert und `discordSyncStatus: FAILED` gesetzt.
- **Scheduled Events**: Werden erstellt, wenn der Bot die nötigen Rechte hat. Fehler werden ignoriert.
- **Roster-Sync**: Muss manuell ausgelöst werden (Officer+). Kein automatischer Cron im Serverless-Betrieb.
- **SQLite für lokale Entwicklung**: Prisma unterstützt SQLite als Alternative – `DATABASE_URL=file:./dev.db` + `provider = "sqlite"` im Schema.
