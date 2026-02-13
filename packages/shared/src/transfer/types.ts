export interface TransferJobPayload {
  sourceAccountId: string;
  destinationAccountId: string;

  sourceFileIds: string[];
  destinationFolderId: string;

  mode: 'copy' | 'move';
}
