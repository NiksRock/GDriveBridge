import type { TransferProgressPayload } from '@shared/transfer';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export function useTransferSocket(
  transferId: string,
  onProgress: (data: TransferProgressPayload) => void,
) {
  useEffect(() => {
    if (!transferId) return;

    const socket: Socket = io(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/transfers`,
      {
        withCredentials: true, // 🔥 matches cookie-based auth
      },
    );

    socket.emit('subscribe', { transferId });

    socket.on('progress', (data: TransferProgressPayload) => {
      onProgress(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [transferId, onProgress]);
}
