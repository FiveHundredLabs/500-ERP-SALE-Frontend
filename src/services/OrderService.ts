import type { Order } from '../types/orders';
import { mapOrder } from './apiMappers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const orderService = {
  async getAll(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch orders`);
    return ((await res.json()) as unknown[]).map(mapOrder);
  },

  async getById(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch order ${id}`);
    return mapOrder(await res.json());
  },

  async create(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error(`Failed to create order`);
    return mapOrder(await res.json());
  },

  async update(id: string, orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error(`Failed to update order`);
    return mapOrder(await res.json());
  },

  async getConnectedDocs(id: string): Promise<{ po: any | null; invoices: any[] }> {
    const res = await fetch(`${API_BASE}/orders/${id}/connected-docs`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch connected documents`);
    return res.json();
  },

  async disconnect(id: string, orderData?: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(orderData || {}),
    });
    if (!res.ok) throw new Error(`Failed to disconnect order`);
    return mapOrder(await res.json());
  },

  async syncConnected(id: string, orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/sync-connected`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error(`Failed to sync connected documents`);
    return mapOrder(await res.json());
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error(`Failed to update order status`);
    return mapOrder(await res.json());
  },

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  },
};
