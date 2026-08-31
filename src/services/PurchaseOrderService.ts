import type { PurchaseOrder } from '../types/purchaseOrders';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const purchaseOrderService = {
  async getAll(): Promise<PurchaseOrder[]> {
    const res = await fetch(`${API_BASE}/purchase-orders`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch purchase orders`);
    return res.json();
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch purchase order ${id}`);
    return res.json();
  },

  async create(poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(poData),
    });
    if (!res.ok) throw new Error(`Failed to create purchase order`);
    return res.json();
  },

  async updateStatus(id: string, status: string): Promise<PurchaseOrder> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Failed to update purchase order status`);
    return res.json();
  },

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  },
};
