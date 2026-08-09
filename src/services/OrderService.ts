import api from '../api/axios';
import type { Order } from '../types/orders';
import { mockOrders } from '../data/mockOrders';

export const orderService = {
  async getAll(): Promise<Order[]> {
    try {
      const response = await api.get<Order[]>('/orders');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map(o => ({
          ...o,
          id: (o as any)._id || o.id,
        }));
      }
      return mockOrders;
    } catch {
      return mockOrders;
    }
  },

  async getById(id: string): Promise<Order> {
    try {
      const response = await api.get<Order>(`/orders/${id}`);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const found = mockOrders.find(o => o.id === id || (o as any)._id === id);
      if (found) return found;
      throw new Error(`Order ${id} not found`);
    }
  },

  async create(orderData: Partial<Order>): Promise<Order> {
    try {
      const response = await api.post<Order>('/orders', orderData);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      // Fallback: return constructed local Order object
      const newOrder: Order = {
        id: Date.now().toString(),
        orderId: orderData.orderId || `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        salesman: orderData.salesman || { id: 'SM001', name: 'Admin User', employeeId: 'EMP-000', phone: '', area: 'Main Office' },
        customerId: orderData.customerId || '',
        customerName: orderData.customerName || 'Customer',
        contactPerson: orderData.contactPerson || '',
        contactPhone: orderData.contactPhone || '',
        customerAddress: orderData.customerAddress || '',
        customerCity: orderData.customerCity || '',
        products: orderData.products || [],
        numberOfProducts: orderData.numberOfProducts || (orderData.products ? orderData.products.length : 0),
        subTotal: orderData.subTotal || 0,
        totalDiscount: orderData.totalDiscount || 0,
        totalTax: orderData.totalTax || 0,
        grandTotal: orderData.grandTotal || 0,
        status: orderData.status || 'Pending',
        paymentStatus: orderData.paymentStatus || 'Unpaid',
        timeline: orderData.timeline || [],
        notes: orderData.notes,
      };
      return newOrder;
    }
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Order> {
    try {
      const response = await api.patch<Order>(`/orders/${id}/status`, { status, notes });
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const found = mockOrders.find(o => o.id === id);
      if (found) {
        found.status = status as any;
        if (notes) found.notes = notes;
      }
      return (found || { id, status }) as Order;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await api.delete(`/orders/${id}`);
      return true;
    } catch {
      return true;
    }
  },
};
