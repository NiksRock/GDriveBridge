import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useTransferSocket } from '../hooks/useTransferSocket';
import type { TransferProgressPayload } from '@gdrivebridge/shared';

export function TransferDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [progress, setProgress] = useState<TransferProgressPayload | null>(null);

  // ✅ Always call hook (React rule)
  useTransferSocket(id ?? '', (data) => {
    setProgress(data);
  });

  // UI logic AFTER hooks
  if (!id) {
    return <div>Invalid transfer ID</div>;
  }

  if (!progress) {
    return <div>Waiting for progress...</div>;
  }

  return (
    <div>
      <h1>Transfer {id}</h1>

      <p>Status: {progress.status}</p>
      <p>
        {progress.completedFiles} / {progress.totalFiles}
      </p>
      <p>Current: {progress.currentFileName ?? '—'}</p>
    </div>
  );
}
