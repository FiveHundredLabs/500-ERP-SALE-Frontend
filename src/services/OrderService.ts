import type { Order } from '../types/orders';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const orderService = {
  async getAll(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch orders`);
    return res.json();
  },

  async getById(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch order ${id}`);
    return res.json();
  },

  async create(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error(`Failed to create order`);
    return res.json();
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error(`Failed to update order status`);
    return res.json();
  },

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  },
};
