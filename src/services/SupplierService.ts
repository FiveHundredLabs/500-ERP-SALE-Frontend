import type { Supplier } from '../types/suppliers';
import { mapSupplier } from './apiMappers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch suppliers`);
    return ((await res.json()) as unknown[]).map(mapSupplier);
  },

  async getById(id: string): Promise<Supplier | undefined> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return undefined;
    return mapSupplier(await res.json());
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create supplier`);
    return mapSupplier(await res.json());
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update supplier`);
    return mapSupplier(await res.json());
  },

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  },
};
