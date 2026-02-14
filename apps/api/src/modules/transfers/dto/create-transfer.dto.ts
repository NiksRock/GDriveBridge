import { z } from 'zod';

/**
 * Transfer request payload validation schema
 */
export const CreateTransferSchema = z.object({
  /**
   * ✅ TEMP MVP: userId comes from request body
   * Later this will come from OAuth session
   */
  userId: z.string().min(1),

  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),

  destinationFolderId: z.string().min(1),

  mode: z.enum(['copy', 'move']),

  sourceFileIds: z.array(z.string().min(1)).min(1),
});

/**
 * TypeScript DTO type
 */
export type CreateTransferDto = z.infer<typeof CreateTransferSchema>;
