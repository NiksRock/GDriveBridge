export interface TransferJobPayload {
  sourceFileIds: string[];
  destinationFolderId: string;
  mode: 'copy' | 'move';
}
