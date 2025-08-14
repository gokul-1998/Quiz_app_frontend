import { apiService, Token } from './api';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
}

class AuthManager {
  private static instance: AuthManager;
  private authState: AuthState = {
    isAuthenticated: false,
    token: null,
    refreshToken: null,
  };
  private listeners: ((state: AuthState) => void)[] = [];

  static getInstance() {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (token && refreshToken) {
        this.authState = {
          isAuthenticated: true,
          token,
          refreshToken,
        };
      }
    }
  }

  getAuthState() {
    return this.authState;
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await apiService.login(email, password);
    
    if (error) {
      return { success: false, error };
    }

    if (data) {
      this.authState = {
        isAuthenticated: true,
        token: data.access_token,
        refreshToken: data.refresh_token,
      };

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      this.notifyListeners();
      return { success: true };
    }

    return { success: false, error: 'Login failed' };
  }

  async register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await apiService.register({ email, password });
    
    if (error) {
      return { success: false, error };
    }

    // Auto-login after successful registration
    return this.login(email, password);
  }

  logout() {
    this.authState = {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
    };

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    this.notifyListeners();
  }

  async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.authState.refreshToken) {
      return false;
    }

    const { data, error } = await apiService.refreshToken(this.authState.refreshToken);
    
    if (error) {
      this.logout();
      return false;
    }

    return true;
  }
}

export const authManager = AuthManager.getInstance();