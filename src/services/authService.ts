import type { LoginData, RegisterData, AuthRes, User } from "../types/auth";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authService = {
  async login(loginData: LoginData): Promise<AuthRes> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(loginData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid email or password');
    }

    const data = await res.json();
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', data.user.role || 'admin');
    }
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('token', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
  },

  async register(registerData: RegisterData): Promise<AuthRes> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(registerData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Registration failed');
    }

    return res.json();
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      throw new Error('Token refresh failed');
    }

    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('token', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', data.user.role || 'admin');
    }
    return data;
  },

  async getMe(): Promise<User | null> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return null;

    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user || null;
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
    }
  },
};

export const loginAPI = authService.login;
export const registerAPI = authService.register;
export const logoutAPI = authService.logout;
export const refreshTokenAPI = authService.refreshToken;
