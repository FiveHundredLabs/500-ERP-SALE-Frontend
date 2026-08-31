import type { User, CreateUserDto, UpdateUserDto } from "../types/users";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class UserService {
  private currentUser: User | null = null;

  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch users`);
    return res.json();
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await fetch(`${API_BASE}/users/${id}`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create user`);
    }
    const data = await res.json();
    return data.user || data;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dto),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async deleteUser(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  }

  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const users = await this.getUsers();
      return users.some(
        user =>
          user.email.toLowerCase() === email.toLowerCase() &&
          (!excludeId || user._id !== excludeId)
      );
    } catch {
      return false;
    }
  }
}

export default new UserService();