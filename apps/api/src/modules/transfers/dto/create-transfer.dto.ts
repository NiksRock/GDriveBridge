import { z } from 'zod';

/**
 * Request payload for creating a new transfer session
 */
export const CreateTransferSchema = z.object({
  userId: z.string(),

  sourceAccountId: z.string(),
  destinationAccountId: z.string(),

  destinationFolderId: z.string(),

  sourceFileIds: z.array(z.string().min(1)),

  mode: z.enum(['copy', 'move']).default('copy'),
});

export type CreateTransferDto = z.infer<typeof CreateTransferSchema>;
