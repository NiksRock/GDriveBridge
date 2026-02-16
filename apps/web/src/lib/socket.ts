import { io } from 'socket.io-client';

export function createTransferSocket() {
  return io(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/transfers`, {
    withCredentials: true,
    autoConnect: false,
  });
}
