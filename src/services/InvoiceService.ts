import type { 
  InvoiceResponse,
  BackendInvoiceData,
  PaymentStatusType,
  InvoiceCustomer
} from "../types/invoice";
import type { InventoryItem } from "../types/inventory"; 
import { extractCityFromAddress } from "../types/customers";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface NextInvoiceIdResponse {
  nextInvoiceId: string;
}

export interface DeleteInvoiceResponse {
  message: string;
}

export interface SalesOverviewResponse {
  period: string;
  totalSales: number;
  totalProducts: number;
  weeklyData: Array<{
    week: string;
    sales: number;
    products: number;
  }>;
}

export const invoiceService = {
  // Get all invoices
  async getAll(): Promise<InvoiceResponse[]> {
    const res = await fetch(`${API_BASE}/invoices`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch invoices: ${res.statusText}`);
    return res.json();
  },

  // Get all customers
  async getAllCustomers(): Promise<InvoiceCustomer[]> {
    const res = await fetch(`${API_BASE}/customers`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
    const data = await res.json();
    return (data || []).map((c: any) => ({
      _id: c._id || c.id,
      id: c._id || c.id,
      customerId: c.customerCode || c.customerId || 'cus-100',
      customerCode: c.customerCode || c.customerId || 'cus-100',
      shopName: c.shopName || c.name || c.businessName || 'Customer',
      fullName: c.fullName || c.name || c.shopName || 'Customer',
      contactPerson: c.contactPerson || '',
      phone: c.phone || '',
      phone2: c.phone2 || '',
      phone3: c.phone3 || '',
      creditLimit: c.creditLimit || 1000000,
      salesRep: c.salesRep,
      salesRepName: c.salesRepName,
      address: c.address || '',
      city: c.city || extractCityFromAddress(c.address || ''),
    }));
  },

  // Get next invoice ID
  async getNextId(): Promise<string> {
    const res = await fetch(`${API_BASE}/invoices/next-id`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch next invoice ID: ${res.statusText}`);
    const data = await res.json();
    return data.nextInvoiceId || `INV-${Date.now()}`;
  },

  // Get invoice by ID
  async getById(id: string): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Invoice with ID "${id}" not found.`);
    return res.json();
  },

  // Get invoice by invoiceId
  async getByInvoiceId(invoiceId: string): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/invoice-id/${invoiceId}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Invoice "${invoiceId}" not found.`);
    return res.json();
  },

  // Create new invoice
  async create(invoiceData: BackendInvoiceData): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(invoiceData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create invoice`);
    }
    return res.json();
  },

  // Update invoice
  async update(invoiceId: string, updateData: Partial<BackendInvoiceData>): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update invoice`);
    }
    return res.json();
  },

  // Update payment status
  async updatePaymentStatus(id: string, paymentStatus: PaymentStatusType): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${id}/payment-status`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ paymentStatus }),
    });
    if (!res.ok) throw new Error(`Failed to update payment status`);
    return res.json();
  },

  // Delete invoice
  async delete(id: string): Promise<DeleteInvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to delete invoice`);
    return res.json();
  },

  // Search items
  async searchItems(query: string): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory-items`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const items: InventoryItem[] = await res.json();
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(i => 
      i.product_name?.toLowerCase().includes(lower) || 
      i.product_code?.toLowerCase().includes(lower)
    );
  },

  // Customer Management CRUD
  async createCustomer(customer: any): Promise<InvoiceCustomer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(customer),
    });
    if (!res.ok) throw new Error('Failed to create customer');
    return res.json();
  },

  async updateCustomer(id: string, customer: any): Promise<InvoiceCustomer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(customer),
    });
    if (!res.ok) throw new Error('Failed to update customer');
    return res.json();
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete customer');
    return res.json();
  },
};