import type { UserRole } from './roles';

export interface User {
  id: string;
  fullName: string;
  displayName?: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  fullName: string;
  displayName?: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDto {
  fullName?: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
}