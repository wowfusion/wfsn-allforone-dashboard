'use client';

/**
 * useAutoLogout – meldet den User nach einer definierten Inaktivitätsdauer automatisch ab.
 * Inaktivität = kein Mausklick, keine Tastatureingabe, kein Touch innerhalb der Timeout-Zeit.
 * Der Timer wird bei jeder Benutzerinteraktion zurückgesetzt.
 */

import { useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';

const INACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Startet einen Inaktivitäts-Timer und ruft signOut() auf wenn keine
 * Benutzerinteraktion innerhalb von `timeoutMs` Millisekunden stattfindet.
 *
 * @param timeoutMs - Inaktivitätsdauer in Millisekunden (Standard: 30 Minuten)
 */
export function useAutoLogout(timeoutMs = 30 * 60 * 1000) {
  const { status } = useSession();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    /** Timer zurücksetzen bei jeder Nutzerinteraktion */
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: '/' });
      }, timeoutMs);
    };

    // Initialen Timer starten
    resetTimer();

    // Event Listener für alle Interaktions-Events registrieren
    INACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      INACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [status, timeoutMs]);
}
