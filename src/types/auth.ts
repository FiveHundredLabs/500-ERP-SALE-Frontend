import type { UserRole } from './roles';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthRes {
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
}