import api from '../api/axios';
import type { Supplier } from '../types/suppliers';
import { mockSuppliers } from '../data/mockSuppliers';

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    try {
      const response = await api.get<Supplier[]>('/suppliers');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map(s => ({
          ...s,
          id: (s as any)._id || s.id,
        }));
      }
      return mockSuppliers;
    } catch {
      return mockSuppliers;
    }
  },

  async getById(id: string): Promise<Supplier> {
    try {
      const response = await api.get<Supplier>(`/suppliers/${id}`);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const found = mockSuppliers.find(s => s.id === id || (s as any)._id === id);
      if (found) return found;
      throw new Error(`Supplier ${id} not found`);
    }
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    try {
      const response = await api.post<Supplier>('/suppliers', data);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const newSup: Supplier = {
        id: Date.now().toString(),
        supplierId: data.supplierId || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        companyName: data.companyName || 'New Supplier',
        contactPerson: data.contactPerson || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        supplierType: data.supplierType || 'Wholesaler',
        paymentTerms: data.paymentTerms || 'Net 30',
        status: (data.status as any) || 'Active',
        totalPOs: 0,
        totalPurchaseAmount: 0,
        outstandingPayments: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newSup;
    }
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    try {
      const response = await api.put<Supplier>(`/suppliers/${id}`, data);
      return {
        ...response.data,
        id: (response.data as any)._id || response.data.id,
      };
    } catch {
      const found = mockSuppliers.find(s => s.id === id);
      return { ...(found || {}), ...data } as Supplier;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await api.delete(`/suppliers/${id}`);
      return true;
    } catch {
      return true;
    }
  },
};
