import { useState } from 'react';
import { setAuthToken } from '../api/client';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);

  function login(jwt: string) {
    setToken(jwt);
    setAuthToken(jwt);
  }

  function logout() {
    setToken(null);
    setAuthToken(null);
  }

  return { token, login, logout };
}
