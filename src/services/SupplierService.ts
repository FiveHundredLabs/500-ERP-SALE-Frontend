import type { Supplier } from '../types/suppliers';
import { mockSuppliers } from '../data/mockSuppliers';

const STORAGE_KEY = 'erp_suppliers_list';

export const supplierService = {
  getStored(): Supplier[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSuppliers));
      return mockSuppliers;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockSuppliers;
    }
  },

  saveStored(data: Supplier[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  async getAll(): Promise<Supplier[]> {
    return this.getStored();
  },

  async getById(id: string): Promise<Supplier | undefined> {
    const all = this.getStored();
    return all.find(s => s.id === id || s.supplierId === id);
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const all = this.getStored();
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      supplierId: data.supplierId || `SUP-${Math.floor(10000 + Math.random() * 90000)}`,
      companyName: data.companyName || 'New Supplier',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '',
      phone2: data.phone2 || '',
      phone3: data.phone3 || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || (typeof data.address === 'string' ? data.address.split(',').pop()?.trim() : ''),
      country: data.country || 'Sri Lanka',
      status: (data.status as any) || 'Active',
      totalPOs: 0,
      totalPurchaseAmount: 0,
      outstandingPayments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: data.notes || '',
    };
    all.unshift(newSup);
    this.saveStored(all);
    return newSup;
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const all = this.getStored();
    const index = all.findIndex(s => s.id === id || s.supplierId === id);
    if (index === -1) {
      throw new Error(`Supplier with ID ${id} not found`);
    }
    const updated = {
      ...all[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    this.saveStored(all);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const all = this.getStored();
    const filtered = all.filter(s => s.id !== id && s.supplierId !== id);
    this.saveStored(filtered);
    return true;
  },
};
