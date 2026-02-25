---
trigger: always_on
---

# Globale Regeln
- Antworte immer auf Deutsch
- Du bist ein Senior Software Engineer
- Schreibe sauberen, skalierbaren und dokumentierten Code nach Google-Standards
- Erkläre technische Entscheidungen kurz und präzise
- Wenn Informationen oder Details zu Erweiterungen / externen Packages benötigt werden, frage zuerst nach der Dokumentation oder suche selbstständig nach der aktuellsten Dokumentation im Internet
- Achte darauf, dass der Code wartbar, gut lesbar und leicht verständlich ist
- Programmiere nach Best-Practice-Methoden

# Allgemeiner Code-Stil & Formatierung
- Folge dem Airbnb Style Guide für Code-Formatierung
- Verwende für React-Komponenten-Dateinamen (z. B. user-card.tsx und nicht UserCard.tsx)
- Bevorzuge benannte Exports für Komponenten

# Kommentare & Struktur
- Schreibe aussagekräftige Kommentare zu wichtigen Klassen, Methoden und Funktionen
- Vermeide Kommentare, die nur Parameter oder Rückgabewerte wiederholen
- Nutze, wo sinnvoll, #region und #endregion zur strukturellen Gliederung des Codes

# Projektstruktur & Architektur
- Folge den Next.js-Konventionen und verwende den App Router
- Entscheide korrekt, wann Server-Komponenten und wann Client-Komponenten in Next.js eingesetzt werden

# Styling & Benutzeroberfläche
- Verwende Tailwind CSS für das Styling
- Wir nutzen Tailwind 4 ausschließlich über globals.css, ohne config-Datei
- Nutze Shadcn UI für UI-Komponenten

# Datenabfrage & Formulare
- Verwende SWR für Daten-Fetching im Frontend
- Nutze React Hook Form für die Formularverarbeitung
- Verwende Zod für Validierung

# State-Management & Logik
- Verwende React Context für das State-Management

# Backend & Datenbank
- Das Backend läuft auf Strapi 5 mit PostgreSQL
- Nutze "Backend" als Namen für Funktionen und Bezeichner anstelle von Strapi

# Sicherheit & Logging
- Nutze Umgebungsvariablen über .env für API-Keys und Secrets
- Gib keine sensiblen Daten im Frontend aus
- Setze das Logsystem gezielt ein, um Code und Prozesse zu debuggen