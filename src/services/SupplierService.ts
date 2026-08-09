import type { Supplier } from '../types/suppliers';
import { mockSuppliers } from '../data/mockSuppliers';

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    return [...mockSuppliers];
  },

  async getById(id: string): Promise<Supplier> {
    const found = mockSuppliers.find(s => s.id === id || s.supplierId === id || (s as any)._id === id);
    if (found) return found;
    return mockSuppliers[0];
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const newSup: Supplier = {
      id: Date.now().toString(),
      supplierId: data.supplierId || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: data.companyName || 'New Supplier',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || 'Sri Lanka',
      supplierType: data.supplierType || 'Wholesaler',
      paymentTerms: data.paymentTerms || 'Net 30',
      status: (data.status as any) || 'Active',
      totalPOs: 0,
      totalPurchaseAmount: 0,
      outstandingPayments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockSuppliers.unshift(newSup);
    return newSup;
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const found = mockSuppliers.find(s => s.id === id || s.supplierId === id);
    if (found) {
      Object.assign(found, data);
      return found;
    }
    return data as Supplier;
  },

  async delete(id: string): Promise<boolean> {
    const index = mockSuppliers.findIndex(s => s.id === id || s.supplierId === id);
    if (index !== -1) {
      mockSuppliers.splice(index, 1);
    }
    return true;
  },
};
