import api from '../api/axios';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';

export const purchaseOrderService = {
  async getAll(): Promise<PurchaseOrder[]> {
    try {
      const response = await api.get<PurchaseOrder[]>('/purchase-orders');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map(po => ({
          ...po,
          id: (po as any)._id || po.id,
        }));
      }
      return mockPurchaseOrders;
    } catch {
      return mockPurchaseOrders;
    }
  },

  async getById(id: string): Promise<PurchaseOrder> {
    try {
      const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const found = mockPurchaseOrders.find(po => po.id === id || (po as any)._id === id);
      if (found) return found;
      throw new Error(`Purchase Order ${id} not found`);
    }
  },

  async create(poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    try {
      const response = await api.post<PurchaseOrder>('/purchase-orders', poData);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const newPO: PurchaseOrder = {
        id: Date.now().toString(),
        poNumber: poData.poNumber || `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        poDate: poData.poDate || new Date().toISOString().split('T')[0],
        expectedDate: poData.expectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplierId: poData.supplierId || 'SUP-001',
        supplierName: poData.supplierName || 'Supplier',
        supplierContact: poData.supplierContact || '',
        supplierPhone: poData.supplierPhone || '',
        supplierAddress: poData.supplierAddress || '',
        supplierCity: poData.supplierCity || '',
        customerName: poData.customerName,
        items: poData.items || [],
        numberOfItems: poData.items ? poData.items.length : 0,
        subTotal: poData.subTotal || 0,
        totalDiscount: poData.totalDiscount || 0,
        totalTax: poData.totalTax || 0,
        shippingCharges: poData.shippingCharges || 0,
        grandTotal: poData.grandTotal || 0,
        status: poData.status || 'Draft',
        paymentStatus: poData.paymentStatus || 'Unpaid',
        paymentTerms: poData.paymentTerms || 'Net 30',
        createdById: poData.createdById || 'EMP-001',
        createdByName: poData.createdByName || 'Admin User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: poData.notes,
      };
      return newPO;
    }
  },

  async updateStatus(id: string, status: string): Promise<PurchaseOrder> {
    try {
      const response = await api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const found = mockPurchaseOrders.find(po => po.id === id);
      if (found) found.status = status as any;
      return (found || { id, status }) as PurchaseOrder;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await api.delete(`/purchase-orders/${id}`);
      return true;
    } catch {
      return true;
    }
  },
};
