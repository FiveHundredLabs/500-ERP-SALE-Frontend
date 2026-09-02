import type { PurchaseOrder } from '../types/purchaseOrders';
import { mapPurchaseOrder } from './apiMappers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const purchaseOrderService = {
  async getAll(): Promise<PurchaseOrder[]> {
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch purchase orders`);
    return ((await res.json()) as unknown[]).map(mapPurchaseOrder);
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch purchase order ${id}`);
    return mapPurchaseOrder(await res.json());
  },

  async create(poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(poData),
    });
    if (!res.ok) throw new Error(`Failed to create purchase order`);
    return mapPurchaseOrder(await res.json());
  },

  async update(id: string, poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(poData),
    });
    if (!res.ok) throw new Error(`Failed to update purchase order`);
    return mapPurchaseOrder(await res.json());
  },

  async updateStatus(id: string, status: string): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Failed to update purchase order status`);
    return mapPurchaseOrder(await res.json());
  },

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  },
};
