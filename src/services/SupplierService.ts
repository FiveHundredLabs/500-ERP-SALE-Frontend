import type { Supplier } from '../types/suppliers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const res = await fetch(`${API_BASE}/suppliers`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch suppliers`);
    return res.json();
  },

  async getById(id: string): Promise<Supplier | undefined> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, { credentials: 'include' });
    if (!res.ok) return undefined;
    return res.json();
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create supplier`);
    return res.json();
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update supplier`);
    return res.json();
  },

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  },
};
