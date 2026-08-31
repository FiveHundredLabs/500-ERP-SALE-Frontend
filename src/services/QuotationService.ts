import type { 
  QuotationResponse,
  BackendQuotationData,
  QuotationStatusType,
  QuotationCustomer 
} from "../types/quotation";
import type { InventoryItem } from "../types/inventory"; 
import { extractCityFromAddress } from "../types/customers";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface NextQuotationIdResponse {
  nextQuotationId: string;
}

export interface DeleteQuotationResponse {
  message: string;
}

export const quotationService = {
  // Get all quotations
  async getAll(): Promise<QuotationResponse[]> {
    const res = await fetch(`${API_BASE}/quotations`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch quotations: ${res.statusText}`);
    return res.json();
  },

  // Get all customers
  async getAllCustomers(): Promise<QuotationCustomer[]> {
    const res = await fetch(`${API_BASE}/customers`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
    const data = await res.json();
    return (data || []).map((c: any) => ({
      _id: c._id || c.id,
      shopName: c.shopName || c.name || c.businessName || 'Customer',
      fullName: c.fullName || c.name || c.shopName || 'Customer',
      contactPerson: c.contactPerson || '',
      email: c.email || '',
      phone: c.phone || '',
      phone2: c.phone2 || '',
      phone3: c.phone3 || '',
      vatNumber: c.vatNumber || '',
      customerCode: c.customerCode || c.id || 'CUST',
      creditPeriod: c.creditPeriod || 30,
      paymentTerms: c.paymentTerms || 'Net 30',
      creditLimit: c.creditLimit || 1000000,
      address: {
        street: c.address || '',
        city: c.city || extractCityFromAddress(c.address || ''),
        country: 'Sri Lanka',
        zip: '00100'
      }
    }));
  },

  // Get next quotation ID
  async getNextId(): Promise<string> {
    const res = await fetch(`${API_BASE}/quotations/next-id`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch next quotation ID: ${res.statusText}`);
    const data = await res.json();
    return data.nextQuotationId || `QUO-${Date.now()}`;
  },

  // Get quotation by ID
  async getById(id: string): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Quotation with ID "${id}" not found.`);
    return res.json();
  },

  // Get quotation by quotationId
  async getByQuotationId(quotationId: string): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${quotationId}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Quotation "${quotationId}" not found.`);
    return res.json();
  },

  // Create new quotation
  async create(quotationData: BackendQuotationData): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(quotationData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create quotation`);
    }
    return res.json();
  },

  // Update quotation
  async update(quotationId: string, updateData: Partial<BackendQuotationData>): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${quotationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update quotation`);
    }
    return res.json();
  },

  // Update status
  async updateStatus(quotationId: string, status: QuotationStatusType): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${quotationId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update status`);
    }
    return res.json();
  },

  // Delete quotation
  async delete(quotationId: string): Promise<DeleteQuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${quotationId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to delete quotation`);
    }
    return res.json();
  },

  // Get inventory items for dropdown
  async getInventoryItems(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory-items`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch inventory items`);
    return res.json();
  },

  // Create new customer
  async createCustomer(customerData: Omit<QuotationCustomer, '_id' | 'customerCode'>) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(customerData),
    });
    if (!res.ok) throw new Error(`Failed to create customer`);
    return res.json();
  },

  // Update customer
  async updateCustomer(customerId: string, customerData: Omit<QuotationCustomer, '_id' | 'customerCode'>) {
    const res = await fetch(`${API_BASE}/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(customerData),
    });
    if (!res.ok) throw new Error(`Failed to update customer`);
    return res.json();
  }
};