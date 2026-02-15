import { api } from './client';

export async function getAccounts() {
  const { data } = await api.get('/accounts');
  return data;
}

export async function setDestination(accountId: string) {
  const { data } = await api.post('/auth/set-destination', { accountId });
  return data;
}
