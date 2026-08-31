import type { 
  InvoiceResponse,
  BackendInvoiceData,
  PaymentStatusType,
  InvoiceCustomer
} from "../types/invoice";
import type { InventoryItem } from "../types/inventory"; 
import { moneyToApi, moneyToNumber } from '../utils/money';
import { mapCustomer, mapInventoryItem, mapInvoice } from './apiMappers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function toInvoicePayload(data: Partial<BackendInvoiceData>) {
  const encodeMoney = (value: number | undefined) => value === undefined ? undefined : moneyToApi(value);
  return {
    ...data,
    subTotal: encodeMoney(data.subTotal), discount: encodeMoney(data.discount),
    totalAmount: encodeMoney(data.totalAmount), paidAmount: encodeMoney(data.paidAmount),
    remainingAmount: encodeMoney(data.remainingAmount), vatAmount: encodeMoney(data.vatAmount),
    taxRate: encodeMoney(data.taxRate),
    items: data.items?.map(item => ({
      ...item, unitPrice: encodeMoney(item.unitPrice), discount: encodeMoney(item.discount), total: encodeMoney(item.total),
    })),
    payments: data.payments?.map(payment => ({ ...payment, amount: moneyToApi(payment.amount) })),
  };
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface NextInvoiceNumberResponse {
  nextInvoiceNumber: string;
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
    return ((await res.json()) as unknown[]).map(mapInvoice);
  },

  // Get all customers
  async getAllCustomers(): Promise<InvoiceCustomer[]> {
    const res = await fetch(`${API_BASE}/customers`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
    return ((await res.json()) as unknown[]).map(mapCustomer);
  },

  // Get next invoice ID
  async getNextId(): Promise<string> {
    const res = await fetch(`${API_BASE}/invoices/next-id`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch next invoice ID: ${res.statusText}`);
    const data = await res.json();
    return data.nextInvoiceNumber || `INV-${Date.now()}`;
  },

  // Get invoice by ID
  async getById(id: string): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Invoice with ID "${id}" not found.`);
    return mapInvoice(await res.json());
  },

  // Get invoice by invoiceNumber
  async getByInvoiceId(invoiceNumber: string): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/number/${encodeURIComponent(invoiceNumber)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Invoice "${invoiceNumber}" not found.`);
    return mapInvoice(await res.json());
  },

  // Create new invoice
  async create(invoiceData: BackendInvoiceData): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(toInvoicePayload(invoiceData)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create invoice`);
    }
    return mapInvoice(await res.json());
  },

  // Update invoice
  async update(id: string, updateData: Partial<BackendInvoiceData>): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(toInvoicePayload(updateData)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update invoice`);
    }
    return mapInvoice(await res.json());
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
    return mapInvoice(await res.json());
  },

  // Delete invoice
  async delete(id: string): Promise<DeleteInvoiceResponse> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to delete invoice`);
    const value = await res.json();
    return { ...value, creditLimit: moneyToNumber(value.creditLimit), fullName: value.fullName ?? value.shopName };
  },

  // Search items
  async searchItems(query: string): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory-items`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const items: InventoryItem[] = ((await res.json()) as unknown[]).map(mapInventoryItem);
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(i => 
      i.productName?.toLowerCase().includes(lower) ||
      i.productCode?.toLowerCase().includes(lower)
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
    const value = await res.json();
    return { ...value, creditLimit: moneyToNumber(value.creditLimit), fullName: value.fullName ?? value.shopName };
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
