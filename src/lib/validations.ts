/**
 * Zod-Validierungsschemas für alle API-Endpunkte.
 */

import { z } from 'zod';

// #region Event

export const createEventSchema = z.object({
  title: z.string().min(3, 'Titel muss mindestens 3 Zeichen haben').max(100),
  type: z.enum(['RAID', 'EVENT']),
  description: z.string().max(2000).optional(),
  startAt: z.string().min(1, 'Startdatum erforderlich').refine((v) => !isNaN(Date.parse(v)), 'Ungültiges Datum'),
  endAt: z.string().min(1, 'Enddatum erforderlich').refine((v) => !isNaN(Date.parse(v)), 'Ungültiges Datum'),
  lockAt: z.string().refine((v) => !v || !isNaN(Date.parse(v)), 'Ungültiges Datum').optional(),
  maxSlots: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  coverImage: z.string().optional(),
  raidLeadName: z.string().optional(),
  roleSlots: z
    .object({
      tank: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
      healer: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
      dps: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
    })
    .optional(),
});

/** Serverseitig inferierter Typ (nach Transformation) */
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Formular-Typ für React Hook Form (vor Transformation – number-Felder als string/number erlaubt) */
export type CreateEventFormInput = Omit<CreateEventInput, 'maxSlots' | 'roleSlots'> & {
  maxSlots?: number | string;
  roleSlots?: {
    tank?: number | string;
    healer?: number | string;
    dps?: number | string;
  };
};

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'LOCKED', 'DONE']).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// #endregion

// #region Signup

export const signupSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'DECLINED']),
  playerId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// #endregion

// #region DropHistory

export const dropReasonSchema = z.object({
  reason: z.string().max(500).optional(),
});

// #endregion
