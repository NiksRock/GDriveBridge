import { z } from 'zod';

/**
 * OPTION A TRANSFER DTO
 *
 * - Source account is implicit (login identity)
 * - Destination account derived from isDestination flag
 */
export const CreateTransferSchema = z.object({
  destinationFolderId: z.string().min(1),

  mode: z.enum(['copy', 'move']),

  sourceFileIds: z.array(z.string().min(1)).min(1),
});

export type CreateTransferDto = z.infer<typeof CreateTransferSchema>;
