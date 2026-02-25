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
  maxSlots: z.number().int().positive().optional(),
  roleSlots: z
    .object({
      tank: z.number().int().min(0).optional(),
      healer: z.number().int().min(0).optional(),
      dps: z.number().int().min(0).optional(),
    })
    .optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

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
