import type { Order } from '../types/orders';
import { mockOrders } from '../data/mockOrders';

export const orderService = {
  async getAll(): Promise<Order[]> {
    return [...mockOrders];
  },

  async getById(id: string): Promise<Order> {
    const found = mockOrders.find(o => o.id === id || o.orderId === id || (o as any)._id === id);
    if (found) return found;
    return mockOrders[0];
  },

  async create(orderData: Partial<Order>): Promise<Order> {
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
    mockOrders.unshift(newOrder);
    return newOrder;
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Order> {
    const found = mockOrders.find(o => o.id === id || o.orderId === id);
    if (found) {
      found.status = status as any;
      if (notes) found.notes = notes;
      return found;
    }
    return { id, status } as Order;
  },

  async delete(id: string): Promise<boolean> {
    const index = mockOrders.findIndex(o => o.id === id || o.orderId === id);
    if (index !== -1) {
      mockOrders.splice(index, 1);
    }
    return true;
  },
};
