import { api } from './client';

export async function listTransfers() {
  const { data } = await api.get('/transfers');
  return data;
}

export async function createTransfer(payload: {
  sourceFileIds: string[];
  destinationFolderId: string;
  mode: 'copy' | 'move';
}) {
  const { data } = await api.post('/transfers', payload);
  return data;
}

export async function pauseTransfer(id: string) {
  return api.post(`/transfers/${id}/pause`);
}

export async function resumeTransfer(id: string) {
  return api.post(`/transfers/${id}/resume`);
}

export async function cancelTransfer(id: string) {
  return api.post(`/transfers/${id}/cancel`);
}
