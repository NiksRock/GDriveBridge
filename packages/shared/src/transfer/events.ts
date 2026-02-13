export interface TransferProgressEvent {
  jobId: string;
  totalFiles: number;
  completedFiles: number;
  currentFileName?: string;
}
