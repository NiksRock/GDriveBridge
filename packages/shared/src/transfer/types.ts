export interface TransferJobPayload {
  sourceFileIds: string[];
  destinationFolderId: string;
  mode: 'copy' | 'move';
}
export interface TransferProgressPayload {
  transferId: string;
  currentFileName?: string;
  completedFiles: number;
  totalFiles: number;
  status: string;
}

export interface TransferSummary {
  id: string;
  mode: 'COPY' | 'MOVE';
  status: string;
  totalItems: number;
  completedItems: number;
  createdAt: string;
}
