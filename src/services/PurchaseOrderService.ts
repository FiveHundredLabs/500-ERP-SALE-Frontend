import type { PurchaseOrder } from '../types/purchaseOrders';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';

export const purchaseOrderService = {
  async getAll(): Promise<PurchaseOrder[]> {
    return [...mockPurchaseOrders];
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const found = mockPurchaseOrders.find(po => po.id === id || po.poNumber === id || (po as any)._id === id);
    if (found) return found;
    return mockPurchaseOrders[0];
  },

  async create(poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
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
    mockPurchaseOrders.unshift(newPO);
    return newPO;
  },

  async updateStatus(id: string, status: string): Promise<PurchaseOrder> {
    const found = mockPurchaseOrders.find(po => po.id === id || po.poNumber === id);
    if (found) {
      found.status = status as any;
      return found;
    }
    return { id, status } as PurchaseOrder;
  },

  async delete(id: string): Promise<boolean> {
    const index = mockPurchaseOrders.findIndex(po => po.id === id || po.poNumber === id);
    if (index !== -1) {
      mockPurchaseOrders.splice(index, 1);
    }
    return true;
  },
};
