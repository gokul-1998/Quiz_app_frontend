'use client';

import { useState, useEffect } from 'react';
import { authManager, AuthState } from '@/lib/auth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Ensure fresh state from localStorage after hydration
    authManager.syncFromStorage();
    const unsubscribe = authManager.subscribe(setAuthState);
    setHydrated(true);
    return unsubscribe;
  }, []);

  // Login using FastAPI OAuth2PasswordRequestForm (form-urlencoded: username/password)
  const login = async (email: string, password: string) => {
    // Use apiService.login which already uses the correct payload
    const result = await authManager.login(email, password);
    return result;
  };

  // Register using FastAPI (JSON: email/password)
  const register = async (email: string, password: string) => {
    // Use apiService.register which already uses the correct payload
    const result = await authManager.register(email, password);
    return result;
  };


  const logout = async () => {
    await authManager.logout();
  };

  return {
    ...authState,
    hydrated,
    login,
    register,
    logout,
  };
}