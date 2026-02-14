// ============================================================
// PreScan DTO
// Satisfies: DEFT §12 — Pre-Transfer Risk Scan (Mandatory)
// ============================================================

import { z } from 'zod';

export const PreScanSchema = z.object({
  userId: z.string(),
  sourceAccountId: z.string(),
  destinationAccountId: z.string(),
  sourceFileIds: z.array(z.string()).min(1),
  destinationFolderId: z.string(),
  mode: z.enum(['copy', 'move']),
});

export type PreScanDto = z.infer<typeof PreScanSchema>;
