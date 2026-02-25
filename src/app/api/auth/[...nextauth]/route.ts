/**
 * NextAuth v5 Route Handler – verarbeitet alle /api/auth/* Anfragen.
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
